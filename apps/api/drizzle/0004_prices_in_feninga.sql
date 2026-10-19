-- Money moves from whole KM to feninga (1/100 KM) in new *_minor columns.
--
-- The previous release keeps serving while this runs and still reads and writes the whole-KM
-- columns, so those stay for now and a trigger on each table keeps both in step, whichever
-- release writes:
--   * a write that sets only the KM column (previous release) fills *_minor = KM * 100;
--   * a write that sets *_minor (this release) fills the KM column, rounded to whole KM.
-- A later migration drops the triggers and the KM columns once this release is live.
ALTER TABLE "products" ADD COLUMN "price_minor" integer;--> statement-breakpoint
UPDATE "products" SET "price_minor" = "price" * 100;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_minor" SET NOT NULL;--> statement-breakpoint
CREATE FUNCTION "products_sync_price_minor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."price_minor" IS NULL THEN NEW."price_minor" := NEW."price" * 100;
		ELSE NEW."price" := round(NEW."price_minor" / 100.0); END IF;
	ELSIF NEW."price_minor" IS DISTINCT FROM OLD."price_minor" THEN NEW."price" := round(NEW."price_minor" / 100.0);
	ELSIF NEW."price" IS DISTINCT FROM OLD."price" THEN NEW."price_minor" := NEW."price" * 100;
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "products_sync_price_minor" BEFORE INSERT OR UPDATE ON "products" FOR EACH ROW EXECUTE FUNCTION "products_sync_price_minor"();--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "price_minor" integer;--> statement-breakpoint
UPDATE "product_variants" SET "price_minor" = "price" * 100;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "price_minor" SET NOT NULL;--> statement-breakpoint
CREATE FUNCTION "product_variants_sync_price_minor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."price_minor" IS NULL THEN NEW."price_minor" := NEW."price" * 100;
		ELSE NEW."price" := round(NEW."price_minor" / 100.0); END IF;
	ELSIF NEW."price_minor" IS DISTINCT FROM OLD."price_minor" THEN NEW."price" := round(NEW."price_minor" / 100.0);
	ELSIF NEW."price" IS DISTINCT FROM OLD."price" THEN NEW."price_minor" := NEW."price" * 100;
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "product_variants_sync_price_minor" BEFORE INSERT OR UPDATE ON "product_variants" FOR EACH ROW EXECUTE FUNCTION "product_variants_sync_price_minor"();--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "unit_price_minor" integer;--> statement-breakpoint
UPDATE "order_items" SET "unit_price_minor" = "unit_price" * 100;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "unit_price_minor" SET NOT NULL;--> statement-breakpoint
CREATE FUNCTION "order_items_sync_unit_price_minor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."unit_price_minor" IS NULL THEN NEW."unit_price_minor" := NEW."unit_price" * 100;
		ELSE NEW."unit_price" := round(NEW."unit_price_minor" / 100.0); END IF;
	ELSIF NEW."unit_price_minor" IS DISTINCT FROM OLD."unit_price_minor" THEN NEW."unit_price" := round(NEW."unit_price_minor" / 100.0);
	ELSIF NEW."unit_price" IS DISTINCT FROM OLD."unit_price" THEN NEW."unit_price_minor" := NEW."unit_price" * 100;
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "order_items_sync_unit_price_minor" BEFORE INSERT OR UPDATE ON "order_items" FOR EACH ROW EXECUTE FUNCTION "order_items_sync_unit_price_minor"();--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_amount_minor" integer;--> statement-breakpoint
UPDATE "orders" SET "shipping_amount_minor" = "shipping_amount" * 100;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "shipping_amount_minor" SET NOT NULL;--> statement-breakpoint
CREATE FUNCTION "orders_sync_shipping_amount_minor"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF NEW."shipping_amount_minor" IS NULL THEN NEW."shipping_amount_minor" := NEW."shipping_amount" * 100;
		ELSE NEW."shipping_amount" := round(NEW."shipping_amount_minor" / 100.0); END IF;
	ELSIF NEW."shipping_amount_minor" IS DISTINCT FROM OLD."shipping_amount_minor" THEN NEW."shipping_amount" := round(NEW."shipping_amount_minor" / 100.0);
	ELSIF NEW."shipping_amount" IS DISTINCT FROM OLD."shipping_amount" THEN NEW."shipping_amount_minor" := NEW."shipping_amount" * 100;
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "orders_sync_shipping_amount_minor" BEFORE INSERT OR UPDATE ON "orders" FOR EACH ROW EXECUTE FUNCTION "orders_sync_shipping_amount_minor"();