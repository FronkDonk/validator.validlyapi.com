import type { Context } from "hono";

import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { smtpValidate } from "@/actions/email.actions";
import env from "@/env";

const validateBodySchema = z.object({
  email: z.string(),
});

export async function validateSMTP(c: Context) {
  const { email } = validateBodySchema.parse(await c.req.json());
  const internalApiSecret = c.req.header("Authorization")?.replace("Bearer ", "").trim();
  if (internalApiSecret !== env.INTERNAL_API_SECRET) {
    return c.json({ error: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }
  const isValidSmtp = await smtpValidate(email);

  return c.json({
    isValidSmtp,
  });
}
