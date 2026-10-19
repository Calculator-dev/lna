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
const { adminInquiryRoutes } = await import('../../dist/routes/inquiries.js')
const { deliverDueEmails, MAX_ATTEMPTS } = await import('../../dist/services/email-outbox.js')
const { env } = await import('../../dist/env.js')
const { db, pool } = await import('../../dist/db/client.js')

await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) })
await pool.query('TRUNCATE email_outbox, order_items, orders, customers, media_assets, product_variants, products, categories, inquiries')

// The admin routes without Supabase sign-in, which isn't what these tests are about.
async function adminApp() {
  const admin = Fastify()
  await admin.register(sensible)
  admin.setErrorHandler((error, _request, reply) => reply.code(error instanceof ZodError ? 400 : error.statusCode ?? 500).send({ message: error.message }))
  admin.decorateRequest('adminUser', null)
  admin.addHook('preHandler', async request => { request.adminUser = { id: '0b9c6c34-3c51-4c1e-9a43-5d6a4b1f2e10', email: 'admin@example.com' } })
  await admin.register(catalogueRoutes)
  await admin.register(orderReviewRoutes)
  await admin.register(adminInquiryRoutes)
  return admin
}

const product = {
  newCategory: { bs: 'Natpisi', en: 'Signs' },
  type: 'custom',
  material: 'wood',
  customizable: true,
  variants: [
    { sku: 'SIGN-S', dimensions: '20 cm', priceMinor: 4500, active: true },
    { sku: 'SIGN-L', dimensions: '40 cm', priceMinor: 8050, active: true },
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
    assert.deepEqual(saved.variants.map(variant => [variant.sku, variant.priceMinor, variant.isDefault]), [['SIGN-S', 4500, true], ['SIGN-L', 8050, false]])

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
    const duplicate = await admin.inject({ method: 'POST', url: '/products', payload: { ...product, newCategory: undefined, categoryId: saved.categoryId, variants: [{ sku: 'SIGN-S', dimensions: '1 cm', priceMinor: 100 }] } })
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
    const large = variants.find(variant => variant.priceMinor === 8050)

    // The public product lookup by localized slug (a jsonb query).
    const bySlug = await app.inject(`/public/products/${listed.translations.en.slug}?locale=en`)
    assert.equal(bySlug.statusCode, 200)
    assert.equal(bySlug.json().id, listed.id)

    const order = { locale: 'en', customer, shipping, items: [{ productId: listed.id, variantId: large.id, quantity: 1, personalization: 'Kuća Hodžić' }] }
    const headers = { 'idempotency-key': 'integration-key-0001' }
    const first = await app.inject({ method: 'POST', url: '/public/orders', payload: order, headers })
    assert.equal(first.statusCode, 201)
    // 80,50 KM plus 10 KM delivery.
    assert.equal(first.json().totalMinor, 9050)
    const retried = await app.inject({ method: 'POST', url: '/public/orders', payload: order, headers })
    assert.equal(retried.statusCode, 200)
    assert.equal(retried.json().orderNumber, first.json().orderNumber)

    // Two requests with one key at the same moment still make one order.
    const racing = { 'idempotency-key': 'integration-key-0002' }
    const [a, b] = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/public/orders', payload: order, headers: racing })))
    assert.deepEqual([a.statusCode, b.statusCode].sort(), [200, 201])
    assert.equal(a.json().orderNumber, b.json().orderNumber)

    const { rows } = await pool.query('SELECT o.idempotency_key, i.sku, i.product_name, i.dimensions, i.unit_price_minor, i.variant_id FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.idempotency_key')
    assert.deepEqual(rows, [
      { idempotency_key: 'integration-key-0001', sku: 'SIGN-S', product_name: 'Renamed sign', dimensions: '40 cm', unit_price_minor: 8050, variant_id: large.id },
      { idempotency_key: 'integration-key-0002', sku: 'SIGN-S', product_name: 'Renamed sign', dimensions: '40 cm', unit_price_minor: 8050, variant_id: large.id },
    ])

    // The snapshot holds when the product changes afterwards.
    await pool.query("UPDATE products SET translations = jsonb_set(translations, '{en,name}', '\"Changed later\"')")
    const [summary] = await orderSummaries().limit(1)
    const detail = (await admin.inject(`/orders/${summary.id}`)).json()
    assert.equal(detail.items[0].name, 'Renamed sign')
    assert.equal(detail.amountMinor, 9050)
  } finally {
    await admin.close()
  }
})

test('orders are reviewed once, by a recorded admin', async () => {
  const admin = await adminApp()
  try {
    const summaries = await orderSummaries()
    assert.equal(summaries.length, 2)
    assert.ok(summaries.every(summary => summary.amountMinor === 9050 && summary.customer === customer.fullName))

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

test('admin lists page through every row once, newest first, even with equal timestamps', async () => {
  const admin = await adminApp()
  try {
    // Seven inquiries: three share one timestamp, and two differ only in microseconds, which
    // a JavaScript Date can't tell apart.
    const times = ['2026-01-01 10:00:00.000001+00', '2026-01-01 10:00:00.000002+00', '2026-01-02 10:00:00+00', '2026-01-02 10:00:00+00', '2026-01-02 10:00:00+00', '2026-01-03 10:00:00+00', '2026-01-04 10:00:00+00']
    for (const [index, time] of times.entries()) {
      await pool.query("INSERT INTO inquiries (full_name, email, locale, brief, created_at) VALUES ($1, 'a@example.com', 'bs', 'Upit za izradu', $2)", [`Kupac ${index}`, time])
    }
    const all = (await admin.inject('/inquiries')).json()
    assert.equal(all.length, times.length)

    for (const url of ['/inquiries', '/orders', '/products']) {
      const everything = (await admin.inject(url)).json().map(row => row.id)
      const paged = []
      let cursor
      for (let pages = 0; pages < 10; pages++) {
        const response = await admin.inject(`${url}?limit=2${cursor ? `&before=${cursor}` : ''}`)
        assert.equal(response.statusCode, 200)
        assert.ok(response.json().length <= 2)
        assert.ok(!response.body.includes('cursorTime'))
        paged.push(...response.json().map(row => row.id))
        cursor = response.headers['x-next-cursor']
        if (!cursor) break
      }
      assert.deepEqual(paged, everything, url)
    }

    assert.equal((await admin.inject('/inquiries?limit=2&before=not-a-cursor')).statusCode, 400)
    assert.equal((await admin.inject('/inquiries?limit=500')).statusCode, 400)
  } finally {
    await admin.close()
  }
})

test('emails are queued with their change, retried with backoff, and sent once', async () => {
  const quiet = { warn() {}, error() {} }
  const originalFetch = globalThis.fetch
  Object.assign(env, { RESEND_API_KEY: 'test-key', ORDER_EMAIL_FROM: 'shop@example.com', INQUIRY_NOTIFY_EMAIL: 'shop@example.com' })
  const sent = []
  let resendUp = false
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails')
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: resendUp ? 200 : 503 })
  }
  try {
    const { rows: [product] } = await pool.query('SELECT id FROM products LIMIT 1')
    const placed = await app.inject({ method: 'POST', url: '/public/orders', payload: { locale: 'bs', customer, shipping, items: [{ productId: product.id, quantity: 1 }] } })
    assert.equal(placed.statusCode, 201)
    assert.deepEqual(placed.json().notification, { queued: true })
    assert.equal(sent.length, 0, 'the request itself sends nothing')
    const { rows: [order] } = await pool.query('SELECT id FROM orders WHERE order_number = $1', [placed.json().orderNumber])

    // A failed order queues nothing: the email rolls back with it.
    const { rows: [before] } = await pool.query('SELECT count(*)::int AS n FROM email_outbox')
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: { locale: 'bs', customer, shipping, items: [{ productId: '00000000-0000-4000-8000-000000000000', quantity: 1 }] } })).statusCode, 400)
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM email_outbox')).rows[0].n, before.n)

    // Provider down: the attempt is recorded and the next one waits a minute.
    assert.equal(await deliverDueEmails(quiet), 1)
    const failed = (await pool.query("SELECT attempts, last_error, next_attempt_at > now() + interval '50 seconds' AS later FROM email_outbox WHERE order_id = $1", [order.id])).rows[0]
    assert.deepEqual(failed, { attempts: 1, last_error: 'delivery_failed', later: true })
    assert.equal(await deliverDueEmails(quiet), 0, 'not due yet')

    // Provider back: sent once, and the order shows when.
    resendUp = true
    await pool.query('UPDATE email_outbox SET next_attempt_at = now()')
    assert.equal(await deliverDueEmails(quiet), 1)
    assert.equal(sent.length, 2)
    assert.match(sent[1].subject, /Primili smo vašu narudžbu/)
    const delivered = (await pool.query('SELECT o.confirmation_email_sent_at IS NOT NULL AS stamped, e.sent_at IS NOT NULL AS done FROM orders o JOIN email_outbox e ON e.order_id = o.id WHERE o.id = $1', [order.id])).rows[0]
    assert.deepEqual(delivered, { stamped: true, done: true })

    // Two workers at once (e.g. old and new instance during a deploy) never send one email twice.
    for (let index = 0; index < 3; index++) {
      assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: { fullName: `Kupac ${index}`, email: 'a@example.com', brief: 'Upit za izradu po mjeri.' } })).statusCode, 201)
    }
    sent.length = 0
    const passes = await Promise.all([deliverDueEmails(quiet), deliverDueEmails(quiet)])
    assert.equal(passes[0] + passes[1], 3)
    assert.equal(sent.length, 3)

    // A confirmation queued by the release before feninga (whole KM) still shows the right amounts.
    sent.length = 0
    await pool.query("INSERT INTO email_outbox (kind, payload) VALUES ('order_confirmation', $1)", [JSON.stringify({ to: 'a@example.com', fullName: 'Kupac', orderNumber: 'LNA-OLD', locale: 'bs', items: [{ name: 'Natpis', quantity: 2, unitPrice: 45 }], shippingAmount: 10, shipping })])
    assert.equal(await deliverDueEmails(quiet), 1)
    assert.match(sent[0].html, /90 KM/)
    assert.match(sent[0].html, /<strong>100 KM<\/strong>/)

    // After the last attempt an email is left alone.
    await pool.query("INSERT INTO email_outbox (kind, payload, attempts) VALUES ('inquiry_notification', '{}', $1)", [MAX_ATTEMPTS])
    assert.equal(await deliverDueEmails(quiet), 0)
  } finally {
    globalThis.fetch = originalFetch
    Object.assign(env, { RESEND_API_KEY: undefined, ORDER_EMAIL_FROM: undefined, INQUIRY_NOTIFY_EMAIL: undefined })
  }
})

test('the whole-KM columns the previous release still uses stay in step with feninga', async () => {
  const { rows: [variant] } = await pool.query("SELECT id, product_id FROM product_variants WHERE price_minor = 8050")
  // This release writes feninga: the KM column follows, rounded.
  assert.equal((await pool.query('SELECT price FROM product_variants WHERE id = $1', [variant.id])).rows[0].price, 81)
  // The previous release writes whole KM: feninga follow.
  await pool.query('UPDATE product_variants SET price = 60 WHERE id = $1', [variant.id])
  assert.equal((await pool.query('SELECT price_minor FROM product_variants WHERE id = $1', [variant.id])).rows[0].price_minor, 6000)
  // Rewriting the same KM value (it saves every field) leaves a finer feninga price alone.
  await pool.query('UPDATE product_variants SET price_minor = 6050 WHERE id = $1', [variant.id])
  await pool.query('UPDATE product_variants SET price = 61, sku = sku WHERE id = $1', [variant.id])
  assert.equal((await pool.query('SELECT price_minor FROM product_variants WHERE id = $1', [variant.id])).rows[0].price_minor, 6050)
  // An order line the previous release inserts (no feninga) gets them.
  const { rows: [order] } = await pool.query('SELECT id FROM orders LIMIT 1')
  const { rows: [line] } = await pool.query("INSERT INTO order_items (order_id, product_id, quantity, unit_price, sku, product_name) VALUES ($1, $2, 1, 45, 'OLD', 'Old release') RETURNING unit_price_minor", [order.id, variant.product_id])
  assert.equal(line.unit_price_minor, 4500)
  const { rows: [placed] } = await pool.query("INSERT INTO orders (order_number, locale, customer_id, shipping_address, shipping_amount) SELECT 'LNA-OLD-1', 'bs', customer_id, shipping_address, 10 FROM orders LIMIT 1 RETURNING shipping_amount_minor")
  assert.equal(placed.shipping_amount_minor, 1000)
})
