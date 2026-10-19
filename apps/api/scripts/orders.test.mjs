import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { createApp } = await import('../dist/app.js')
const { db } = await import('../dist/db/client.js')
const { customers, orders, orderItems } = await import('../dist/db/schema.js')

const productId = '2b475b74-b75f-452a-9d55-33b4466ce00f'
const payload = {
  locale: 'en', customer: { fullName: 'Test Customer', email: 'test@example.com' },
  shipping: { address: 'Test street 1', city: 'Sarajevo', country: 'BA' },
  items: [{ productId, quantity: 2, unitPriceMinor: 1 }],
}

test('orders use database prices, reject missing products, and report storage failures', async () => {
  const app = createApp()
  const original = db.transaction
  let selected = [{ id: productId, sku: 'TEST-1', priceMinor: 4550, dimensions: '20 cm', customizable: false, translations: { bs: { name: 'Test proizvod' }, en: { name: 'Test product' } } }]
  let inserts = []
  let failItems = false
  db.transaction = async callback => callback({
    select: () => ({ from: () => ({ where: () => ({ for: async () => selected }) }) }),
    insert: table => ({ values: values => {
      inserts.push({ table, values })
      if (table === customers) return { returning: async () => [{ id: 'customer-id' }] }
      if (table === orders) return { returning: async () => [{ id: 'order-id', ...values, status: 'submitted' }] }
      if (failItems) throw new Error('Simulated storage failure')
      return Promise.resolve()
    } }),
  })
  try {
    const response = await app.inject({ method: 'POST', url: '/public/orders', payload })
    assert.equal(response.statusCode, 201)
    const line = inserts.find(entry => entry.table === orderItems).values[0]
    assert.equal(line.unitPriceMinor, 4550)
    // Lines keep their own copy of what was ordered, in the order's language.
    assert.equal(line.sku, 'TEST-1')
    assert.equal(line.productName, 'Test product')
    assert.equal(line.dimensions, '20 cm')
    // 2 × 45,50 = 91 KM is below the free-delivery threshold.
    assert.equal(inserts.find(entry => entry.table === orders).values.shippingAmountMinor, 1000)
    assert.equal(response.json().subtotalMinor, 9100)
    assert.equal(response.json().totalMinor, 10100)

    inserts = []
    const large = await app.inject({ method: 'POST', url: '/public/orders', payload: { ...payload, items: [{ productId, quantity: 4 }] } })
    assert.equal(large.statusCode, 201)
    assert.equal(inserts.find(entry => entry.table === orders).values.shippingAmountMinor, 0)
    assert.equal(large.json().totalMinor, 18200)

    // Campaign data is stored with the order; malformed campaign data is dropped, never fatal.
    inserts = []
    const campaign = { source: 'facebook', medium: 'paid_social', campaign: 'jesen-2026', fbclid: 'abc', capturedAt: '2026-10-19T10:00:00.000Z', extra: 'ignored' }
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: { ...payload, attribution: campaign } })).statusCode, 201)
    assert.deepEqual(inserts.find(entry => entry.table === orders).values.attribution, { source: 'facebook', medium: 'paid_social', campaign: 'jesen-2026', fbclid: 'abc', capturedAt: '2026-10-19T10:00:00.000Z' })
    inserts = []
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: { ...payload, attribution: { source: 'x'.repeat(5000) } } })).statusCode, 201)
    assert.equal(inserts.find(entry => entry.table === orders).values.attribution, undefined)

    inserts = []
    const oversized = { ...payload, customer: { ...payload.customer, phone: '1'.repeat(61) } }
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: oversized })).statusCode, 400)
    assert.equal(inserts.length, 0)
    assert.match(response.json().orderNumber, /^LNA-\d{6}-[A-F0-9]{8}$/)
    assert.equal(response.json().orderNumber.length, 19)
    // Without email settings nothing is queued, so no stale backlog goes out once they're added.
    assert.deepEqual(response.json().notification, { queued: false, reason: 'not_configured' })
    assert.equal(response.json().payload, undefined)

    selected = []
    inserts = []
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload })).statusCode, 400)
    assert.equal(inserts.length, 0)

    selected = [{ id: productId, sku: 'TEST-1', priceMinor: 4550, dimensions: '20 cm', customizable: false, translations: { bs: { name: 'Test proizvod' }, en: { name: 'Test product' } } }]
    const personalized = { ...payload, items: [{ productId, quantity: 1, personalization: 'Name' }] }
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: personalized })).statusCode, 400)
    assert.equal(inserts.length, 0)

    failItems = true
    const failed = await app.inject({ method: 'POST', url: '/public/orders', payload })
    assert.equal(failed.statusCode, 500)
    assert.equal(failed.json().message, 'Internal server error')
  } finally {
    db.transaction = original
    await app.close()
  }
})

test('a retried order with the same idempotency key returns the original order without placing another', async () => {
  const app = createApp()
  const originalTransaction = db.transaction
  const originalSelect = db.select
  const product = { id: productId, sku: 'TEST-1', priceMinor: 4550, dimensions: '20 cm', customizable: false, translations: { bs: { name: 'Test proizvod' } } }
  const placed = { id: 'order-id', orderNumber: 'LNA-260101-ABCDEF12', status: 'submitted', shippingAmountMinor: 1000 }
  let stored = []
  let transactions = 0
  let raceLost = false
  db.select = () => ({ from: table => ({ where: () => table === orders
    ? { limit: async () => stored }
    : Promise.resolve([{ unitPriceMinor: 4550, quantity: 2 }]) }) })
  db.transaction = async callback => {
    transactions++
    if (raceLost) {
      stored = [placed]
      throw Object.assign(new Error('duplicate key'), { cause: { code: '23505', constraint: 'orders_idempotency_key_unique' } })
    }
    return callback({
      select: () => ({ from: () => ({ where: () => ({ for: async () => [product] }) }) }),
      insert: table => ({ values: values => {
        if (table === customers) return { returning: async () => [{ id: 'customer-id' }] }
        if (table === orders) {
          assert.equal(values.idempotencyKey, 'checkout-key-0001')
          return { returning: async () => [{ ...placed, ...values, orderNumber: placed.orderNumber }] }
        }
        return Promise.resolve()
      } }),
    })
  }
  const headers = { 'idempotency-key': 'checkout-key-0001' }
  try {
    const first = await app.inject({ method: 'POST', url: '/public/orders', payload, headers })
    assert.equal(first.statusCode, 201)
    assert.equal(transactions, 1)

    stored = [placed]
    const retried = await app.inject({ method: 'POST', url: '/public/orders', payload, headers })
    assert.equal(retried.statusCode, 200)
    assert.equal(transactions, 1)
    assert.equal(retried.json().orderNumber, placed.orderNumber)
    assert.equal(retried.json().totalMinor, 10100)
    assert.equal(retried.json().replayed, true)

    // Two requests with one key at the same time: the loser answers with the winner's order.
    stored = []
    raceLost = true
    const concurrent = await app.inject({ method: 'POST', url: '/public/orders', payload, headers })
    assert.equal(concurrent.statusCode, 200)
    assert.equal(concurrent.json().orderNumber, placed.orderNumber)

    const malformed = await app.inject({ method: 'POST', url: '/public/orders', payload, headers: { 'idempotency-key': 'short' } })
    assert.equal(malformed.statusCode, 400)
  } finally {
    db.transaction = originalTransaction
    db.select = originalSelect
    await app.close()
  }
})
