import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  stripeCustomerId: text("stripe_customer_id"),
});

export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull(),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  status: integer("status").notNull(),
  responseTime: integer("response_time").notNull(),
  apiKey: text("api_key").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpointUrl: text("endpoint_url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  eventTypes: text("event_types").array().notNull(),
  webhookSecret: text("webhook_secret").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const webhookEventLogs = pgTable("webhook_event_logs", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  webhookId: text("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  eventType: text("event_type").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});
