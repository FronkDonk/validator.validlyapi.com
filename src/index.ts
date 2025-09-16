import { serve } from "@hono/node-server";

import { app } from "./app";
import env from "./env";

const port = env.PORT || 3000;

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
}, (info) => {
  console.log(`Server is running on http://${info.address}:${info.port}`);
});
