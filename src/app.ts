import { createApp } from "./lib/create-app";
import { bulkRouter } from "./routes/bulk/bulk.index";
import { emailRouter } from "./routes/email/email.index";

export const app = createApp();

const routes = [
  bulkRouter,
  emailRouter,
];

routes.forEach((route) => {
  app.route("/", route);
});
