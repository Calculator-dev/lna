import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Attribution } from "../lib/attribution.js";

export const localeEnum = pgEnum("locale", ["bs", "en"]);
export const materialEnum = pgEnum("material", [
  "wood",
  "resin",
  "mixed",
]);
export const productTypeEnum = pgEnum("product_type", ["standard", "custom"]);
export const orderStatusEnum = pgEnum("order_status", [
  "submitted",
  "confirmed",
  "declined",
  "in_production",
  "packed",
  "shipped",
  "completed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending_manual",
  "paid",
  "cancelled",
]);

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  translations: jsonb("translations")
    .$type<
      Record<string, { name: string; slug: string; description: string }>
    >()
    .notNull(),
  seo: jsonb("seo")
    .$type<Record<string, { title: string; description: string }>>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  type: productTypeEnum("type").notNull(),
  material: materialEnum("material").notNull(),
  featured: boolean("featured").notNull().default(false),
  customizable: boolean("customizable").notNull().default(false),
  // Money is stored in feninga (1/100 KM) throughout; see migration 0004.
  priceMinor: integer("price_minor").notNull(),
  dimensions: text("dimensions").notNull(),
  leadTime: jsonb("lead_time").$type<Record<string, string>>().notNull(),
  stockLabel: jsonb("stock_label").$type<Record<string, string>>().notNull(),
  translations: jsonb("translations")
    .$type<
      Record<
        string,
        {
          slug: string;
          name: string;
          tagline: string;
          shortDescription: string;
          description: string;
          // Added after launch, so older products may not have it.
          care?: string;
        }
      >
    >()
    .notNull(),
  seo: jsonb("seo")
    .$type<Record<string, { title: string; description: string }>>()
    .notNull(),
  // Set when a product that appears in orders is deleted: it leaves the shop and the CRM
  // list, and its orders keep pointing at it. Products never ordered are deleted outright.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  dimensions: text("dimensions").notNull(),
  priceMinor: integer("price_minor").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("product_variants_product_id_idx").on(table.productId),
]).enableRLS();

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id),
  storageKey: text("storage_key").notNull(),
  publicUrl: text("public_url").notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  alt: jsonb("alt").$type<Record<string, string>>().notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 190 }).notNull(),
  phone: varchar("phone", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  locale: localeEnum("locale").notNull(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  status: orderStatusEnum("status").notNull().default("submitted"),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("pending_manual"),
  shippingAddress: jsonb("shipping_address")
    .$type<{
      address: string;
      city: string;
      postalCode?: string;
      country: string;
    }>()
    .notNull(),
  notes: text("notes"),
  // Campaign or referrer the customer arrived from (see lib/attribution.ts).
  attribution: jsonb("attribution").$type<Attribution>(),
  shippingAmountMinor: integer("shipping_amount_minor").notNull(),
  declineReason: text("decline_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  // Supabase user who accepted or declined the order; the email is kept for display.
  reviewedBy: uuid("reviewed_by"),
  reviewedByEmail: varchar("reviewed_by_email", { length: 190 }),
  // Client-generated key that makes checkout retries return the original order.
  idempotencyKey: varchar("idempotency_key", { length: 80 }).unique(),
  reviewEmailSentAt: timestamp("review_email_sent_at", { withTimezone: true }),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  // Snapshot of what was ordered, so later catalogue edits don't rewrite order history.
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  sku: varchar("sku", { length: 80 }).notNull(),
  productName: text("product_name").notNull(),
  dimensions: text("dimensions"),
  quantity: integer("quantity").notNull(),
  unitPriceMinor: integer("unit_price_minor").notNull(),
  personalization: text("personalization"),
}).enableRLS();

export const inquiries = pgTable("inquiries", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 190 }).notNull(),
  phone: varchar("phone", { length: 60 }),
  locale: localeEnum("locale").notNull(),
  brief: text("brief").notNull(),
  dimensions: text("dimensions"),
  deadline: text("deadline"),
  attribution: jsonb("attribution").$type<Attribution>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

// Emails waiting to be sent, written in the same transaction as the order, decision or inquiry
// they belong to and delivered with retries by the API's email worker (services/email-outbox.ts).
export const emailOutbox = pgTable("email_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: varchar("kind", { length: 40 }).notNull(),
  // The order whose confirmationEmailSentAt / reviewEmailSentAt is set once it is sent.
  orderId: uuid("order_id").references(() => orders.id),
  payload: jsonb("payload").notNull(),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("email_outbox_due_idx").on(table.nextAttemptAt).where(sql`${table.sentAt} is null`),
]).enableRLS();
