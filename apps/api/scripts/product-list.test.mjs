import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import sensible from "@fastify/sensible";
process.env.DATABASE_URL = "postgresql://unused:unused@localhost/unused";
// Fake storage settings: signing a URL is a local computation, no request is made.
Object.assign(process.env, {
  BACKBLAZE_ENDPOINT: "https://s3.example.test",
  BACKBLAZE_REGION: "eu-central-003",
  BACKBLAZE_KEY_ID: "test-key",
  BACKBLAZE_APP_KEY: "test-secret",
  BACKBLAZE_BUCKET_NAME: "test-bucket",
});
const { catalogueRoutes } = await import("../dist/routes/catalogue.js");
const { db } = await import("../dist/db/client.js");
const { products, mediaAssets } = await import("../dist/db/schema.js");

test("product list includes a signed primary-image thumbnail without storage keys", async () => {
  const app = Fastify();
  await app.register(sensible);
  await app.register(catalogueRoutes);
  const withImage = { id: "p1", sku: "LNA-1", translations: { bs: { name: "Monogram" } } };
  const withoutImage = { id: "p2", sku: "LNA-2", translations: { bs: { name: "Natpis" } } };
  const primary = { id: "m1", productId: "p1", isPrimary: true, storageKey: "products/m1.webp", alt: { bs: "Monogram od hrasta", en: "" } };
  const oldSelect = db.select;
  let imageQueries = 0;
  db.select = () => ({
    from: (table) => {
      if (table === products) return { orderBy: async () => [withImage, withoutImage] };
      assert.equal(table, mediaAssets);
      imageQueries++;
      return { where: async () => [primary] };
    },
  });
  try {
    const response = await app.inject("/products");
    assert.equal(response.statusCode, 200);
    const [first, second] = response.json();
    assert.match(first.primaryImage.url, /^https:\/\/s3\.example\.test\/test-bucket\/products\/m1\.webp\?.*X-Amz-Signature=/);
    assert.deepEqual(first.primaryImage.alt, primary.alt);
    assert.equal(second.primaryImage, null);
    assert.equal(imageQueries, 1);
    assert.ok(!response.body.includes("storageKey"));

    // An empty catalogue skips the image query entirely.
    db.select = () => ({ from: () => ({ orderBy: async () => [] }) });
    assert.deepEqual((await app.inject("/products")).json(), []);
  } finally {
    db.select = oldSelect;
    await app.close();
  }
});
