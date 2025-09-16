import { createRouter } from "@/lib/create-app";

import * as handlers from "./bulk.handlers";

export const bulkRouter = createRouter()
  .post("/bulk/validate", handlers.bulkValidate);
