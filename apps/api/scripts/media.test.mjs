import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
process.env.DATABASE_URL = "postgresql://unused:unused@localhost/unused";
const { prepareImage, MAX_IMAGE_BYTES } =
  await import("../dist/services/image-processing.js");
const { productInput } = await import("../dist/lib/product-input.js");

test("uploads decode and resize real images; reject SVG, corrupt files and oversized payloads", async () => {
  const bytes = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: "#ddd" },
  })
    .png()
    .toBuffer();
  const result = await prepareImage(bytes);
  assert.equal(result.width, 2400);
  assert.equal(result.height, 1200);
  assert.equal((await sharp(result.data).metadata()).format, "webp");
  await assert.rejects(() => prepareImage(Buffer.from("not an image")), {
    statusCode: 400,
  });
  await assert.rejects(
    () => prepareImage(Buffer.from('<svg width="10" height="10"></svg>')),
    { statusCode: 400 },
  );
  await assert.rejects(() => prepareImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)), {
    statusCode: 413,
  });
});

test("image input rejects multiple primary photos and duplicate attachments", () => {
  const locale = { bs: "Test", en: "Test" };
  const base = {
    newCategory: locale,
    type: "standard",
    material: "wood",
    variants: [{ sku: "TEST-10", dimensions: "10 cm", price: 1, active: true }],
    leadTime: locale,
    stockLabel: locale,
    translations: {
      bs: { name: "Test", description: "Test" },
      en: { name: "Test", description: "Test" },
    },
  };
  const image = {
    id: "e69dce1d-0d85-46ac-b875-e7db8719677e",
    alt: locale,
    isPrimary: true,
  };
  assert.equal(
    productInput.safeParse({ ...base, images: [image] }).success,
    true,
  );
  assert.equal(productInput.safeParse({ ...base, images: [] }).success, true);
  assert.equal(
    productInput.safeParse({ ...base, images: [image, image] }).success,
    false,
  );
  assert.equal(
    productInput.safeParse({
      ...base,
      images: [{ ...image, isPrimary: false }],
    }).success,
    false,
  );
  assert.equal(
    productInput.safeParse({
      ...base,
      images: [image, { ...image, id: "0054bb8e-9b75-4783-9cae-b1ae40a4bc80" }],
    }).success,
    false,
  );
});

test("image uploads and product mutations require authentication", async () => {
  const { createApp } = await import("../dist/app.js");
  const app = createApp();
  try {
    const image = await sharp({
      create: { width: 1, height: 1, channels: 3, background: "#fff" },
    })
      .png()
      .toBuffer();
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/admin/media",
          headers: { "content-type": "image/png" },
          payload: image,
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/admin/products",
          payload: {},
        })
      ).statusCode,
      401,
    );
  } finally {
    await app.close();
  }
});
