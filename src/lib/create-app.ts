import { OpenAPIHono } from "@hono/zod-openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { loggerMiddleware } from "@/middlewares/logger";
import { pinoLoggerMiddleware } from "@/middlewares/pino-logger";

import type { appBindings } from "./types";

export function createRouter() {
  return new OpenAPIHono<appBindings>({
    strict: false,
    defaultHook,
  });
}

export function createApp() {
  const app = createRouter();
  app.use(loggerMiddleware);
  app.use(serveEmojiFavicon("✉️"));
  app.use(pinoLoggerMiddleware());

  app.onError(onError);
  app.notFound(notFound);
  return app;
}
