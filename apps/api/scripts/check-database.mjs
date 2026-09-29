import assert from 'node:assert/strict'
import { createApp } from '../dist/app.js'
import { pool } from '../dist/db/client.js'

const app = createApp()
try {
  const security = await pool.query("SELECT relname, relrowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace WHERE nspname = 'public' AND relkind = 'r'")
  const expected = ['categories', 'customers', 'inquiries', 'media_assets', 'order_items', 'orders', 'products']
  for (const name of expected) assert.ok(security.rows.some(row => row.relname === name && row.relrowsecurity), `Missing table or RLS: ${name}`)
  for (const path of ['/public/products', '/public/categories']) {
    const response = await app.inject({ method: 'GET', url: path })
    assert.equal(response.statusCode, 200)
    assert.ok(Array.isArray(response.json()))
  }
  assert.equal((await app.inject({ method: 'GET', url: '/public/products/missing-verification-product' })).statusCode, 404)
  assert.equal((await app.inject({ method: 'GET', url: '/public/products?locale=invalid' })).statusCode, 400)
  assert.equal((await app.inject({ method: 'POST', url: '/public/orders', payload: {} })).statusCode, 400)
  assert.equal((await app.inject({ method: 'GET', url: '/admin/orders' })).statusCode, 401)
  console.log('PASS: table security, catalogue reads, validation, and admin access checks. No records written.')
} finally {
  await app.close()
}
