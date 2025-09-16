import type { MiddlewareHandler } from "hono";

import { db } from "@/db/drizzle";
import { apiLogs } from "@/db/schema";

const authRoutes = ["/validate", "/bulk", "/"];
export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  if (!authRoutes.includes(c.req.path)) {
    return next();
  }
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  const sha256 = c.get("apiKey");
  if (!sha256) {
    return;
  }

  await db.insert(apiLogs).values({
    method: c.req.method,
    endpoint: c.req.path,
    status: c.res.status,
    userId: c.get("userId"),
    responseTime: duration,
    apiKey: sha256,
  });
};
