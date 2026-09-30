import type { Material } from "@/lib/products"

/** Each material gets its own tint so wood, resin and mixed pieces read differently at a glance. */
export const materialStyle: Record<Material, { surface: string; dot: string }> = {
  wood: { surface: "bg-honey-soft", dot: "bg-honey" },
  resin: { surface: "bg-resin-soft", dot: "bg-resin" },
  mixed: { surface: "bg-clay", dot: "bg-linear-to-br from-honey from-50% to-resin to-50%" },
}
