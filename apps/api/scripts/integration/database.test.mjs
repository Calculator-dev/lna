// Runs against a real, throwaway Postgres database: migrations, the jsonb and grouped queries, row
// locks and unique constraints that the mocked unit tests can't exercise. Every table is emptied
// first, so TEST_DATABASE_URL must never point at a database whose data matters.
import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import { ZodError } from 'zod'

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to an empty, throwaway Postgres database. Its tables are emptied.')
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
const { fileURLToPath } = await import('node:url')
const { migrate } = await import('drizzle-orm/node-postgres/migrator')
const { createApp } = await import('../../dist/app.js')
const { catalogueRoutes } = await import('../../dist/routes/catalogue.js')
const { orderReviewRoutes, orderSummaries } = await import('../../dist/routes/order-review.js')
const { db, pool } = await import('../../dist/db/client.js')

await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
await pool.query('TRUNCATE order_items, orders, customers, media_assets, product_variants, products, categories, inquiries')

// The admin routes without Supabase sign-in, which isn't what these tests are about.
async function adminApp() {
  const admin = Fastify()
  await admin.register(sensible)
  admin.setErrorHandler((error, _request, reply) => reply.code(error instanceof ZodError ? 400 : error.statusCode ?? 500).send({ message: error.message }))
  admin.decorateRequest('adminUser', null)
  admin.addHook('preHandler', async request => { request.adminUser = { id: '0b9c6c34-3c51-4c1e-9a43-5d6a4b1f2e10', email: 'admin@example.com' } })
  await admin.register(catalogueRoutes)
  await admin.register(orderReviewRoutes)
  return admin
}

const product = {
  newCategory: { bs: 'Natpisi', en: 'Signs' },
  type: 'custom',
  material: 'wood',
  customizable: true,
  variants: [
    { sku: 'SIGN-S', dimensions: '20 cm', price: 45, active: true },
    { sku: 'SIGN-L', dimensions: '40 cm', price: 80, active: true },
  ],
  leadTime: { bs: '5 dana', en: '5 days' },
  stockLabel: { bs: 'Po narudžbi', en: 'Made to order' },
  translations: {
    bs: { name: 'Kućni natpis', description: 'Natpis od drveta.' },
    en: { name: 'House sign', description: 'A wooden sign.' },
  },
}
const customer = { fullName: 'Test Kupac', email: 'kupac@example.com' }
const shipping = { address: 'Ulica 1', city: 'Sarajevo', country: 'BA' }

// The public app's onClose hook also ends the shared database pool.
const app = createApp()
test.after(() => app.close())

test('products save with variants, keep their slugs, and survive swapping SKUs', async () => {
  const admin = await adminApp()
  try {
    const created = await admin.inject({ method: 'POST', url: '/products', payload: product })
    assert.equal(created.statusCode, 201)
    const { id, translations } = created.json()
    const saved = (await admin.inject(`/products/${id}`)).json()
    assert.deepEqual(saved.variants.map(variant => [variant.sku, variant.price, variant.isDefault]), [['SIGN-S', 45, true], ['SIGN-L', 80, false]])

    // Swapping SKUs between existing variants must not trip their unique constraint.
    const [small, large] = saved.variants
    const swapped = await admin.inject({ method: 'PUT', url: `/products/${id}`, payload: {
      ...product, categoryId: saved.categoryId, newCategory: undefined,
      translations: { ...product.translations, en: { ...product.translations.en, name: 'Renamed sign' } },
      variants: [{ ...small, sku: 'SIGN-L' }, { ...large, sku: 'SIGN-S' }].map(({ isDefault: _isDefault, ...variant }) => variant),
    } })
    assert.equal(swapped.statusCode, 200)
    assert.equal(swapped.json().translations.en.slug, translations.en.slug)
    const after = (await admin.inject(`/products/${id}`)).json()
    assert.deepEqual(after.variants.map(variant => [variant.id, variant.sku]), [[small.id, 'SIGN-L'], [large.id, 'SIGN-S']])

    // A SKU another product already uses is a conflict, not a server error.
    const duplicate = await admin.inject({ method: 'POST', url: '/products', payload: { ...product, newCategory: undefined, categoryId: saved.categoryId, variants: [{ sku: 'SIGN-S', dimensions: '1 cm', price: 1 }] } })
    assert.equal(duplicate.statusCode, 409)
  } finally {
    await admin.close()
  }
})

test('checkout prices from the database, stores a snapshot, and is idempotent', async () => {
  const admin = await adminApp()
  try {
    const [listed] = (await admin.inject('/products')).json()
    const { variants } = (await admin.inject(`/products/${listed.id}`)).json()
    const large = variants.find(variant => variant.price === 80)

    // The public product lookup by localized slug (a jsonb query).
    const bySlug = await app.inject(`/public/products/${listed.translations.en.slug}?locale=en`)
    assert.equal(bySlug.statusCode, 200)
    assert.equal(bySlug.json().id, listed.id)

    const order = { locale: 'en', customer, shipping, items: [{ productId: listed.id, variantId: large.id, quantity: 1, personalization: 'Kuća Hodžić' }] }
    const headers = { 'idempotency-key': 'integration-key-0001' }
    const first = await app.inject({ method: 'POST', url: '/public/orders', payload: order, headers })
    assert.equal(first.statusCode, 201)
    assert.equal(first.json().total, 90)
    const retried = await app.inject({ method: 'POST', url: '/public/orders', payload: order, headers })
    assert.equal(retried.statusCode, 200)
    assert.equal(retried.json().orderNumber, first.json().orderNumber)

    // Two requests with one key at the same moment still make one order.
    const racing = { 'idempotency-key': 'integration-key-0002' }
    const [a, b] = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/public/orders', payload: order, headers: racing })))
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [200, 201])
    assert.equal(a.json().orderNumber, b.json().orderNumber)

    const { rows } = await pool.query('SELECT o.idempotency_key, i.sku, i.product_name, i.dimensions, i.unit_price, i.variant_id FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.idempotency_key')
    assert.deepEqual(rows, [
      { idempotency_key: 'integration-key-0001', sku: 'SIGN-S', product_name: 'Renamed sign', dimensions: '40 cm', unit_price: 80, variant_id: large.id },
      { idempotency_key: 'integration-key-0002', sku: 'SIGN-S', product_name: 'Renamed sign', dimensions: '40 cm', unit_price: 80, variant_id: large.id },
    ])

    // The snapshot holds when the product changes afterwards.
    await pool.query("UPDATE products SET translations = jsonb_set(translations, '{en,name}', '\"Changed later\"')")
    const [summary] = await orderSummaries().limit(1)
    const detail = (await admin.inject(`/orders/${summary.id}`)).json()
    assert.equal(detail.items[0].name, 'Renamed sign')
    assert.equal(detail.amount, 90)
  } finally {
    await admin.close()
  }
})

test('orders are reviewed once, by a recorded admin', async () => {
  const admin = await adminApp()
  try {
    const summaries = await orderSummaries()
    assert.equal(summaries.length, 2)
    assert.ok(summaries.every(summary => summary.amount === 90 && summary.customer === customer.fullName))

    const url = `/orders/${summaries[0].id}/decision`
    const accepted = await admin.inject({ method: 'PUT', url, payload: { decision: 'accept' } })
    assert.equal(accepted.statusCode, 200)
    assert.equal(accepted.json().order.status, 'confirmed')
    assert.equal(accepted.json().order.reviewedByEmail, 'admin@example.com')
    assert.equal((await admin.inject({ method: 'PUT', url, payload: { decision: 'decline', reason: 'Too late now.' } })).statusCode, 409)
  } finally {
    await admin.close()
  }
})
