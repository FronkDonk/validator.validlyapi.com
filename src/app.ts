import { createApp } from "./lib/create-app";
import { bulkRouter } from "./routes/bulk/bulk.index";

export const app = createApp();

const routes = [
  bulkRouter,
];

routes.forEach((route) => {
  app.route("/", route);
});
