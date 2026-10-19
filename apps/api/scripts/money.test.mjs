import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { formatKM } = await import('../dist/lib/money.js')
const { shippingFor } = await import('../dist/lib/shipping.js')

test('amounts in feninga format as KM, with decimals only when needed', () => {
  assert.equal(formatKM(4500, 'bs'), '45 KM')
  assert.equal(formatKM(4550, 'bs'), '45,50 KM')
  assert.equal(formatKM(123456, 'bs'), '1.234,56 KM')
  assert.equal(formatKM(4505, 'en'), 'BAM 45.05')
  assert.equal(formatKM(150000, 'en'), 'BAM 1,500')
})

test('delivery is free from 150 KM, to the fening', () => {
  assert.equal(shippingFor(0), 0)
  assert.equal(shippingFor(14999), 1100)
  assert.equal(shippingFor(15000), 0)
})
