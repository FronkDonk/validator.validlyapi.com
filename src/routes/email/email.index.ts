import { createRouter } from "@/lib/create-app";

import * as handlers from "./email.handlers";

export const emailRouter = createRouter()
  .post("/validate/smtp", handlers.validateSMTP);
