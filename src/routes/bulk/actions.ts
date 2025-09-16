import { db } from "@/db/drizzle";
import env from "@/env";

export function determineUpdateFrequency(emailCount: number) {
  if (emailCount <= 100)
    return 25;
  if (emailCount <= 250)
    return 50;
  if (emailCount <= 1000)
    return 100;
  if (emailCount <= 5000)
    return 250;
  return 500;
}

export async function checkWebhooks({
  userId,
  bulkId,
  eventType,
  emailCount,
}: {
  userId: string;
  bulkId: string;
  eventType: "bulk.job.completed" | "bulk.job.created" | "bulk.job.failed";
  emailCount: number;
}) {
  const userWebhooks = await db.query.webhooks.findMany({
    where: (webhooks, { and, eq, sql }) => and(
      eq(webhooks.userId, userId),
      eq(webhooks.enabled, true),
      sql`${webhooks.eventTypes} @> ARRAY[${eventType}]`,
    ),
  });
  if (userWebhooks.length === 0)
    return;
  try {
    await Promise.all(userWebhooks.map(async (webhook) => {
      await fetch(webhook.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhook.webhookSecret,
        },
        body: JSON.stringify({
          created_at: new Date().toISOString(),
          event: eventType,
          status: eventType.split(".")[2],
          bulkId,
          emailCount,
          resultUrl: `${env.APP_BASE_URL}/bulk/results/${bulkId}`,

        }),

      });
    }));
  }
  catch (error) {
    console.error("Error sending webhook:", error);
  }
  // how am i going to handle retries?
}
