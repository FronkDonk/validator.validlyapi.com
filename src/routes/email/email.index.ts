import { createRouter } from "@/lib/create-app";

import * as handlers from "./email.handlers";

export const bulkRouter = createRouter()
  .post("/validate/smtp", handlers.validateSMTP);
