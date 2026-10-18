ALTER TABLE "order_items" ADD COLUMN "variant_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku" varchar(80);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "dimensions" text;--> statement-breakpoint
-- Existing lines get the product's current SKU and name in the order's language; their
-- variant details stay in the personalization note, where they were recorded.
UPDATE "order_items" SET
	"sku" = "products"."sku",
	"product_name" = coalesce("products"."translations" -> "orders"."locale"::text ->> 'name', "products"."translations" -> 'bs' ->> 'name', "products"."sku")
FROM "products", "orders"
WHERE "products"."id" = "order_items"."product_id" AND "orders"."id" = "order_items"."order_id";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reviewed_by_email" varchar(190);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" varchar(80);--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key");