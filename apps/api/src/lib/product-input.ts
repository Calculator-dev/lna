import { z } from "zod";

const short = z.string().trim().min(1).max(200);
const translation = z.object({
  name: short,
  tagline: z.string().trim().max(300).default(""),
  shortDescription: z.string().trim().max(1000).default(""),
  description: z.string().trim().min(1).max(10000),
});
const localized = z.object({ bs: short, en: short });
const variantInput = z.object({
  id: z.string().uuid().optional(),
  sku: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes, or underscores")
    .transform((value) => value.toUpperCase()),
  dimensions: short,
  price: z.number().int().min(0).max(1000000),
  active: z.boolean().default(true),
});
export const productInput = z
  .object({
    categoryId: z.string().uuid().optional(),
    newCategory: localized.optional(),
    type: z.enum(["standard", "custom"]),
    material: z.enum(["wood", "resin", "mixed"]),
    variants: z.array(variantInput).min(1).max(20),
    leadTime: localized,
    stockLabel: localized,
    featured: z.boolean().default(false),
    customizable: z.boolean().default(false),
    translations: z.object({ bs: translation, en: translation }),
    images: z
      .array(
        z.object({
          id: z.string().uuid(),
          alt: z.object({
            bs: z.string().trim().max(300),
            en: z.string().trim().max(300),
          }),
          isPrimary: z.boolean(),
        }),
      )
      .max(8)
      .refine(
        (images) =>
          new Set(images.map((image) => image.id)).size === images.length,
        "Duplicate images",
      )
      .refine(
        (images) =>
          images.length === 0 ||
          images.filter((image) => image.isPrimary).length === 1,
        "Choose one primary image",
      )
      .optional(),
  })
  .strict()
  .refine((value) => Boolean(value.categoryId) !== Boolean(value.newCategory), {
    message: "Select a category or create one",
    path: ["categoryId"],
  })
  .refine(
    (value) =>
      new Set(value.variants.map((variant) => variant.sku)).size ===
      value.variants.length,
    {
      message: "Variant SKUs must be unique",
      path: ["variants"],
    },
  )
  .refine(
    (value) => {
      const ids = value.variants.flatMap((variant) =>
        variant.id ? [variant.id] : [],
      );
      return new Set(ids).size === ids.length;
    },
    {
      message: "Variant IDs must be unique",
      path: ["variants"],
    },
  );

export function slugFor(name: string, id: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "product"}-${id}`;
}
