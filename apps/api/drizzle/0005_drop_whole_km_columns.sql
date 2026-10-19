-- Second half of 0004: every running release now reads and writes only the *_minor columns,
-- so the triggers that mirrored them into whole KM and the KM columns themselves go.
-- Deploy only after the release with 0004 is live; the release before it still used these.
DROP TRIGGER "products_sync_price_minor" ON "products";--> statement-breakpoint
DROP FUNCTION "products_sync_price_minor"();--> statement-breakpoint
DROP TRIGGER "product_variants_sync_price_minor" ON "product_variants";--> statement-breakpoint
DROP FUNCTION "product_variants_sync_price_minor"();--> statement-breakpoint
DROP TRIGGER "order_items_sync_unit_price_minor" ON "order_items";--> statement-breakpoint
DROP FUNCTION "order_items_sync_unit_price_minor"();--> statement-breakpoint
DROP TRIGGER "orders_sync_shipping_amount_minor" ON "orders";--> statement-breakpoint
DROP FUNCTION "orders_sync_shipping_amount_minor"();--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "unit_price";--> statement-breakpoint
ALTER TABLE "orders" DROP COLUMN "shipping_amount";--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "price";