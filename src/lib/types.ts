import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

export interface appBindings {
  Variables: {
    logger: PinoLogger;
    userId: string;
    apiKey: string;
  };
}
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, appBindings>;
export type appOpenApi = OpenAPIHono<appBindings>;
