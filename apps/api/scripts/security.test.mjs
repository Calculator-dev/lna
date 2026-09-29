import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { createApp } = await import('../dist/app.js')
const { db } = await import('../dist/db/client.js')

const inquiry = { fullName: 'Test Customer', email: 'test@example.com', brief: 'A sign for our shop entrance.' }

test('public form endpoints are rate limited per client', async () => {
  const app = createApp()
  const original = db.insert
  db.insert = () => ({ values: () => ({ returning: async () => [{ id: 'id', createdAt: new Date() }] }) })
  try {
    for (let attempt = 0; attempt < 10; attempt++) {
      assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: inquiry })).statusCode, 201)
    }
    assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: inquiry })).statusCode, 429)
    // Other clients and read-only endpoints are unaffected.
    assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: inquiry, remoteAddress: '203.0.113.9' })).statusCode, 201)
    assert.equal((await app.inject('/health')).statusCode, 200)
  } finally {
    db.insert = original
    await app.close()
  }
})

test('CORS only allows configured origins and never credentials', async () => {
  const app = createApp()
  try {
    const allowed = await app.inject({ url: '/health', headers: { origin: 'http://localhost:3001' } })
    assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:3001')
    assert.equal(allowed.headers['access-control-allow-credentials'], undefined)
    const other = await app.inject({ url: '/health', headers: { origin: 'https://attacker.example' } })
    assert.equal(other.headers['access-control-allow-origin'], undefined)
  } finally {
    await app.close()
  }
})
