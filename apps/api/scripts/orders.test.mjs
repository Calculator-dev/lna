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
  items: [{ productId, quantity: 2, unitPrice: 1 }],
}

test('orders use database prices, reject missing products, and report storage failures', async () => {
  const app = createApp()
  const original = db.transaction
  let selected = [{ id: productId, sku: 'TEST-1', price: 45, dimensions: '20 cm', customizable: false, translations: { bs: { name: 'Test proizvod' }, en: { name: 'Test product' } } }]
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
    assert.equal(inserts.find(entry => entry.table === orderItems).values[0].unitPrice, 45)
    // 2 × 45 = 90 KM is below the free-delivery threshold.
    assert.equal(inserts.find(entry => entry.table === orders).values.shippingAmount, 10)
    assert.equal(response.json().subtotal, 90)
    assert.equal(response.json().total, 100)

    inserts = []
    const large = await app.inject({ method: 'POST', url: '/public/orders', payload: { ...payload, items: [{ productId, quantity: 4 }] } })
    assert.equal(large.statusCode, 201)
    assert.equal(inserts.find(entry => entry.table === orders).values.shippingAmount, 0)
    assert.equal(large.json().total, 180)

    inserts = []
    const oversized = { ...payload, customer: { ...payload.customer, phone: '1'.repeat(61) } }
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: oversized })).statusCode, 400)
    assert.equal(inserts.length, 0)
    assert.match(response.json().orderNumber, /^LNA-\d{6}-[A-F0-9]{8}$/)
    assert.equal(response.json().orderNumber.length, 19)
    assert.deepEqual(response.json().notification, { sent: false, reason: 'not_configured' })
    assert.equal(response.json().payload, undefined)

    selected = []
    inserts = []
    assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload })).statusCode, 400)
    assert.equal(inserts.length, 0)

    selected = [{ id: productId, sku: 'TEST-1', price: 45, dimensions: '20 cm', customizable: false, translations: { bs: { name: 'Test proizvod' }, en: { name: 'Test product' } } }]
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
