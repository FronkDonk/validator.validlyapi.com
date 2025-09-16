import type { Context } from "hono";

import { z } from "@hono/zod-openapi";
import PQueue from "p-queue";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { isCatchAll, isDisposable, smtpValidate } from "@/actions/email.actions";
import { redis } from "@/db/redis";
import env from "@/env";

import { checkWebhooks, determineUpdateFrequency } from "./actions";

const bulkValidateBodySchema = z.object({
  emails: z.array(z.string()),
  bulkId: z.uuid(),
  userId: z.string(),
});

interface Tresults {
  email: string;
  valid: boolean;
  deliverable: boolean;
  disposable: boolean;
  isCatchAll: boolean;
}

export async function bulkValidate(c: Context) {
  const { emails, bulkId, userId } = bulkValidateBodySchema.parse(await c.req.json());
  const internalApiSecret = c.req.header("Authorization")?.replace("Bearer ", "").trim();
  if (internalApiSecret !== env.INTERNAL_API_SECRET) {
    return c.json({ error: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }
  const TIME_PER_EMAIL_SECONDS = 2;
  const queue = new PQueue({ concurrency: 1, intervalCap: 1, interval: TIME_PER_EMAIL_SECONDS * 1000 });
  const results: Tresults[] = [];
  const updateFrequency = determineUpdateFrequency(emails.length);
  let count = 0;
  const emailCount = emails.length;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    queue.add(async () => {
      try {
        count++;
        if (count === updateFrequency || i === emailCount - 1) {
          count = 1;
          const key = `bulk:processed:${bulkId}`;
          const processed = i + 1;
          const etaMinutes = Math.ceil((emailCount * TIME_PER_EMAIL_SECONDS - processed * TIME_PER_EMAIL_SECONDS) / 60);
          const eta = `${etaMinutes} minute(s)`;

          redis.hset(key, {
            total: emailCount.toString(),
            processed: processed.toString(),
            progress: `${Math.round(((i + 1) / emailCount) * 100).toString()}%`,
            ETA: eta,
          }).then(() => {
            redis.expire(key, 60 * 60 * 24);
          });
        }
        const isValidEmail = z.email().safeParse(email).success;
        const isCatchAllEmail = await isCatchAll(email);
        const isValidSmtp = await smtpValidate(email);
        const isDisposableEmail = await isDisposable(email);
        results.push({
          email,
          valid: isValidEmail,
          deliverable: isDisposableEmail ? false : isValidSmtp,
          disposable: isDisposableEmail,
          isCatchAll: isCatchAllEmail,
        });
      }
      catch {
        results.push({
          email,
          valid: false,
          deliverable: false,
          disposable: false,
          isCatchAll: false,
        });
      }
    });
  }

  await queue.onIdle();

  checkWebhooks({ userId, bulkId, eventType: "bulk.job.completed", emailCount });
  const key = `bulk:results:${bulkId}`;
  await redis.set(key, JSON.stringify(results)).then(() => {
    redis.expire(key, 60 * 60 * 24);
  });
  return c.json({ results }, HttpStatusCodes.OK);
}
