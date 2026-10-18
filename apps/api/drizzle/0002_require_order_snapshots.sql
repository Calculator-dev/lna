-- Lines written by the release before 0001 while it was being replaced have no snapshot yet;
-- fill them in the same way 0001 did before requiring the columns.
UPDATE "order_items" SET
	"sku" = coalesce("order_items"."sku", "products"."sku"),
	"product_name" = coalesce("order_items"."product_name", "products"."translations" -> "orders"."locale"::text ->> 'name', "products"."translations" -> 'bs' ->> 'name', "products"."sku")
FROM "products", "orders"
WHERE "products"."id" = "order_items"."product_id" AND "orders"."id" = "order_items"."order_id"
	AND ("order_items"."sku" IS NULL OR "order_items"."product_name" IS NULL);--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "sku" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "product_name" SET NOT NULL;
