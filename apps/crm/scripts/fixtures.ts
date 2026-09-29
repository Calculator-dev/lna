// Test fixtures shaped like API responses.
export const seedCategories = [
  {
    id: "wedding",
    translations: {
      bs: { name: "Vjenčanja", slug: "vjencanja", description: "Topperi, monogrami i dekoracije." },
      en: { name: "Weddings", slug: "weddings", description: "Toppers, monograms, and decor." },
    },
  },
  {
    id: "business",
    translations: {
      bs: { name: "Biznis", slug: "biznis", description: "Natpisi i logo table." },
      en: { name: "Business", slug: "business", description: "Signs and brand plaques." },
    },
  },
  {
    id: "home",
    translations: {
      bs: { name: "Dom", slug: "dom", description: "Dekorativni komadi za interijer." },
      en: { name: "Home", slug: "home", description: "Decorative interior pieces." },
    },
  },
]

export const seedProducts = [
  {
    id: "monogram",
    categoryId: "wedding",
    sku: "LNA-MONO-01",
    type: "custom",
    material: "wood",
    featured: true,
    customizable: true,
    price: 45,
    dimensions: "30 x 30 cm",
    leadTime: { bs: "3 do 5 radnih dana", en: "3 to 5 business days" },
    stockLabel: { bs: "Po narudžbi", en: "Made to order" },
    translations: {
      bs: {
        slug: "monogram-za-vjencanje",
        name: "Monogram za vjenčanje",
        tagline: "Ručno izrađeni drveni monogram.",
        shortDescription: "Elegantni ručno izrađeni monogram za posebne prilike.",
        description: "Drveni monogram ručno izrađen prema vašim inicijalima i stilu događaja.",
      },
      en: {
        slug: "wedding-monogram",
        name: "Wedding monogram",
        tagline: "A handmade wooden monogram.",
        shortDescription: "An elegant handmade monogram for meaningful occasions.",
        description: "A wooden monogram handmade to your initials and event direction.",
      },
    },
  },
  {
    id: "business-sign",
    categoryId: "business",
    sku: "LNA-SIGN-02",
    type: "custom",
    material: "wood",
    featured: true,
    customizable: true,
    price: 120,
    dimensions: "Od 30 x 20 cm",
    leadTime: { bs: "5 do 8 radnih dana", en: "5 to 8 business days" },
    stockLabel: { bs: "Po narudžbi", en: "Made to order" },
    translations: {
      bs: {
        slug: "logo-natpis-za-biznis",
        name: "Logo natpis za biznis",
        tagline: "Natpis prema vašem logotipu.",
        shortDescription: "Premium poslovni natpis za enterijer.",
        description: "Prilagođeni poslovni natpis za salone, kancelarije i showroom prostore.",
      },
      en: {
        slug: "business-logo-sign",
        name: "Business logo sign",
        tagline: "A sign produced from your logo.",
        shortDescription: "A premium sign for branded interiors.",
        description: "A tailored sign solution for salons, offices, and showrooms.",
      },
    },
  },
]

export const seedDashboard = {
  totals: {
    ordersToday: 4,
    awaitingReview: 3,
    productionQueued: 5,
    inquiriesLast30Days: 7,
    productsActive: 12,
  },
  recentOrders: [
    { id: "b3f22b86-3991-46a6-b67b-0b2d696be12e", orderNumber: "LNA-104251", customer: "Amina K.", status: "submitted", amount: 98, createdAt: "2026-04-25T09:00:00.000Z" },
    { id: "a7d7da0b-e3e7-4d10-bd2e-46c90b41ef48", orderNumber: "LNA-104144", customer: "Mia Studio", status: "confirmed", amount: 120, createdAt: "2026-04-24T09:00:00.000Z" },
  ],
}
