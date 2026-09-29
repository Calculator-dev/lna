import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { ZodError } from "zod";
process.env.DATABASE_URL = "postgresql://unused:unused@localhost/unused";
const { catalogueRoutes } = await import("../dist/routes/catalogue.js");
const { db, pool } = await import("../dist/db/client.js");
const { categories, products, productVariants } =
  await import("../dist/db/schema.js");
const { productInput } = await import("../dist/lib/product-input.js");
const categoryId = "626a4408-646c-4d99-bb56-edbd40b1a10b";
const translation = {
  name: "Zidno ime",
  description: "Personalizirano ime od drveta.",
};
const payload = {
  categoryId,
  type: "custom",
  material: "resin",
  variants: [
    {
      sku: "lna-new-01-30",
      dimensions: "30 x 30 cm",
      price: 45,
      active: true,
    },
  ],
  leadTime: { bs: "3 dana", en: "3 days" },
  stockLabel: { bs: "Po narudžbi", en: "Made to order" },
  translations: {
    bs: translation,
    en: { name: "Wall name", description: "Personalized wooden name." },
  },
};

test("product validation rejects invalid pricing and ambiguous categories", () => {
  assert.equal(productInput.parse(payload).variants[0].sku, "LNA-NEW-01-30");
  for (const invalid of [
    { ...payload, variants: [{ ...payload.variants[0], price: -1 }] },
    { ...payload, variants: [{ ...payload.variants[0], price: 4.5 }] },
    { ...payload, variants: [{ ...payload.variants[0], sku: "bad sku" }] },
    { ...payload, material: "invalid" },
    { ...payload, categoryId: undefined },
    { ...payload, newCategory: { bs: "Dom", en: "Home" } },
    { ...payload, translations: { bs: translation } },
    { ...payload, variants: [] },
    { ...payload, featured: "yes" },
  ])
    assert.equal(productInput.safeParse(invalid).success, false);
});

test("product creation saves complete data, supports new categories, and handles conflicts", async () => {
  const app = Fastify();
  await app.register(sensible);
  app.setErrorHandler((error, _request, reply) =>
    reply
      .code(error instanceof ZodError ? 400 : (error.statusCode ?? 500))
      .send({ message: error.message }),
  );
  await app.register(catalogueRoutes);
  const original = db.transaction;
  let writes = [];
  let hasCategory = true;
  let conflict = false;
  let transactions = 0;
  db.transaction = async (callback) => {
    transactions++;
    return callback({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => (hasCategory ? [{ id: categoryId }] : []),
          }),
        }),
      }),
      insert: (table) => ({
        values: (values) => {
          const write = async () => {
            if ((table === products || table === productVariants) && conflict)
              throw { cause: { code: "23505" } };
            writes.push({ table, values });
            return [values];
          };
          return {
            returning: write,
            then: (resolve, reject) => write().then(resolve, reject),
          };
        },
      }),
      delete: () => ({ where: async () => {} }),
    });
  };
  try {
    const response = await app.inject({
      method: "POST",
      url: "/products",
      payload,
    });
    assert.equal(response.statusCode, 201);
    assert.equal(response.json().sku, "LNA-NEW-01-30");
    assert.equal(response.json().categoryId, categoryId);
    assert.equal(response.json().priceFrom, undefined);
    assert.match(response.json().translations.bs.slug, /^zidno-ime-/);
    assert.equal(response.json().seo.en.title, "Wall name | LNA kreativna sehara");

    writes = [];
    const { categoryId: _old, ...withoutCategory } = payload;
    const newResponse = await app.inject({
      method: "POST",
      url: "/products",
      payload: { ...withoutCategory, newCategory: { bs: "Dom", en: "Home" } },
    });
    assert.equal(newResponse.statusCode, 201);
    assert.equal(writes.length, 3);
    assert.equal(writes[0].table, categories);
    assert.equal(writes[1].values.categoryId, writes[0].values.id);
    assert.equal(writes[2].table, productVariants);
    assert.equal(writes[2].values[0].productId, writes[1].values.id);
    assert.equal(transactions, 2);

    writes = [];
    hasCategory = false;
    assert.equal(
      (await app.inject({ method: "POST", url: "/products", payload }))
        .statusCode,
      400,
    );
    assert.equal(writes.length, 0);
    hasCategory = true;
    conflict = true;
    const duplicate = await app.inject({
      method: "POST",
      url: "/products",
      payload,
    });
    assert.equal(duplicate.statusCode, 409);
    assert.match(duplicate.json().message, /SKU already exists/);
    const before = transactions;
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/products",
          payload: {
            ...payload,
            variants: [{ ...payload.variants[0], price: -1 }],
          },
        })
      ).statusCode,
      400,
    );
    assert.equal(transactions, before);
  } finally {
    db.transaction = original;
    await app.close();
    await pool.end();
  }
});

test("editing loads a product, saves changes, preserves slugs, and handles missing IDs", async () => {
  const app = Fastify();
  await app.register(sensible);
  app.setErrorHandler((error, _request, reply) =>
    reply
      .code(error instanceof ZodError ? 400 : (error.statusCode ?? 500))
      .send({ message: error.message }),
  );
  await app.register(catalogueRoutes);
  const id = "7cddc771-3bf0-469d-8030-5c5f9204e4ab";
  const existing = {
    ...payload,
    id,
    translations: {
      bs: { ...translation, slug: "existing-bs-url" },
      en: { ...translation, slug: "existing-en-url" },
    },
  };
  const oldTransaction = db.transaction;
  const oldSelect = db.select;
  let missing = false;
  let duplicate = false;
  let updated;
  const keptVariant = "0b3f4f5e-9f55-4e0e-9d57-8f1d6a3a2c11";
  const removedVariant = "3c9a2d8e-1b7f-4a6c-8e2d-5f4b3a2c1d10";
  let currentVariants = [];
  let variantWrites = [];
  db.select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => (missing ? [] : [existing]),
        orderBy: async () => [],
      }),
    }),
  });
  db.transaction = async (callback) =>
    callback({
      select: () => ({
        from: (table) => ({
          where: () => ({
            limit: () =>
              table === products
                ? { for: async () => (missing ? [] : [existing]) }
                : Promise.resolve([{ id: categoryId }]),
            for: async () => {
              assert.equal(table, productVariants);
              return currentVariants.map((variantId) => ({ id: variantId }));
            },
          }),
        }),
      }),
      update: (table) => ({
        set: (values) => ({
          where: () =>
            table === products
              ? {
                  returning: async () => {
                    if (duplicate) throw { cause: { code: "23505" } };
                    updated = values;
                    return [values];
                  },
                }
              : Promise.resolve(variantWrites.push({ op: "update", values })),
        }),
      }),
      delete: (table) => ({
        where: async () => {
          assert.equal(table, productVariants);
          variantWrites.push({ op: "delete" });
        },
      }),
      insert: (table) => ({
        values: (values) => {
          if (table === productVariants) variantWrites.push({ op: "insert", values });
          return { returning: async () => [values] };
        },
      }),
    });
  try {
    assert.equal((await app.inject(`/products/${id}`)).json().id, id);
    const response = await app.inject({
      method: "PUT",
      url: `/products/${id}`,
      payload: {
        ...payload,
        variants: [{ ...payload.variants[0], price: 80 }],
        featured: true,
      },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(updated.id, id);
    assert.equal(updated.price, 80);
    assert.equal(updated.featured, true);
    assert.equal(updated.translations.bs.slug, "existing-bs-url");
    assert.equal(updated.translations.en.slug, "existing-en-url");
    assert.ok(updated.updatedAt instanceof Date);

    currentVariants = [keptVariant, removedVariant];
    variantWrites = [];
    const stable = await app.inject({
      method: "PUT",
      url: `/products/${id}`,
      payload: {
        ...payload,
        variants: [
          { ...payload.variants[0], id: keptVariant, price: 90 },
          { ...payload.variants[0], sku: "lna-new-01-40", dimensions: "40 x 40 cm" },
        ],
      },
    });
    assert.equal(stable.statusCode, 200);
    assert.deepEqual(variantWrites.map((write) => write.op), ["delete", "update", "update", "insert"]);
    assert.equal(variantWrites[1].values.sku, keptVariant);
    assert.equal(variantWrites[2].values.id, keptVariant);
    assert.equal(variantWrites[2].values.price, 90);
    assert.equal(variantWrites[3].values[0].sku, "LNA-NEW-01-40");
    assert.notEqual(variantWrites[3].values[0].id, keptVariant);
    const foreign = await app.inject({
      method: "PUT",
      url: `/products/${id}`,
      payload: {
        ...payload,
        variants: [{ ...payload.variants[0], id: "9d1e2f3a-4b5c-4d6e-8f70-812345678901" }],
      },
    });
    assert.equal(foreign.statusCode, 400);
    currentVariants = [];

    duplicate = true;
    assert.equal(
      (await app.inject({ method: "PUT", url: `/products/${id}`, payload }))
        .statusCode,
      409,
    );
    missing = true;
    assert.equal((await app.inject(`/products/${id}`)).statusCode, 404);
    assert.equal(
      (await app.inject({ method: "PUT", url: `/products/${id}`, payload }))
        .statusCode,
      404,
    );
    assert.equal((await app.inject("/products/invalid")).statusCode, 400);
    assert.equal(
      (
        await app.inject({
          method: "PUT",
          url: `/products/${id}`,
          payload: {
            ...payload,
            variants: [{ ...payload.variants[0], price: -1 }],
          },
        })
      ).statusCode,
      400,
    );
  } finally {
    db.transaction = oldTransaction;
    db.select = oldSelect;
    await app.close();
  }
});

test("product images attach atomically, can be removed, and cannot be taken from another product", async () => {
  const app = Fastify();
  await app.register(sensible);
  app.setErrorHandler((error, _request, reply) =>
    reply.code(error.statusCode ?? 500).send({ message: error.message }),
  );
  await app.register(catalogueRoutes);
  const original = db.transaction;
  const imageId = "668df755-3cae-45e8-902f-0bc647f990c0";
  let assets = [{ id: imageId, productId: null }];
  let writes = [];
  db.transaction = async (callback) =>
    callback({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: categoryId }],
            for: async () => assets,
          }),
        }),
      }),
      insert: () => ({
        values: (values) => ({ returning: async () => [values] }),
      }),
      update: () => ({
        set: (values) => ({
          where: async () => {
            writes.push(values);
          },
        }),
      }),
      delete: () => ({ where: async () => {} }),
    });
  const images = [
    { id: imageId, alt: { bs: "Slika", en: "Photo" }, isPrimary: true },
  ];
  try {
    const saved = await app.inject({
      method: "POST",
      url: "/products",
      payload: { ...payload, images },
    });
    assert.equal(saved.statusCode, 201);
    assert.equal(writes[1].productId, saved.json().id);
    assert.deepEqual(writes[1].alt, images[0].alt);
    assert.equal(writes[1].isPrimary, true);
    writes = [];
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/products",
          payload: { ...payload, images: [] },
        })
      ).statusCode,
      201,
    );
    assert.deepEqual(writes, [{ productId: null, isPrimary: false }]);
    assets = [];
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/products",
          payload: { ...payload, images },
        })
      ).statusCode,
      400,
    );
    assets = [{ id: imageId, productId: "another-product" }];
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/products",
          payload: { ...payload, images },
        })
      ).statusCode,
      409,
    );
  } finally {
    db.transaction = original;
    await app.close();
  }
});
