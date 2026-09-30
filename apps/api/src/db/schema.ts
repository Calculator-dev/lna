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
  price: integer("price").notNull(),
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
  price: integer("price").notNull(),
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
  shippingAmount: integer("shipping_amount").notNull().default(0),
  declineReason: text("decline_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
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
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();
