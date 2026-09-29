import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { createAdminVerifier } = await import('../dist/plugins/admin-auth.js')
const admin = { id: 'admin-id', email: 'admin@example.com', email_confirmed_at: '2026-01-01', app_metadata: { role: 'admin' } }

test('admin guard authenticates tokens and only trusts server-managed admin roles', async () => {
  let result = { data: { user: admin }, error: null }
  let received
  let fail = false
  const app = Fastify()
  app.decorateRequest('adminUser', null)
  app.addHook('preHandler', createAdminVerifier({ auth: { getUser: async token => {
    received = token
    if (fail) throw new Error('Network failure')
    return result
  } } }))
  app.get('/admin/me', request => ({ user: request.adminUser }))
  const request = authorization => app.inject({ url: '/admin/me', headers: authorization ? { authorization } : {} })
  try {
    for (const header of [undefined, 'Basic abc', 'Bearer', 'Bearer a b']) assert.equal((await request(header)).statusCode, 401)
    assert.equal(received, undefined)
    const accepted = await request('Bearer valid-token')
    assert.equal(accepted.statusCode, 200)
    assert.equal(received, 'valid-token')
    assert.deepEqual(accepted.json(), { user: { id: admin.id, email: admin.email } })
    for (const user of [
      { ...admin, app_metadata: {}, user_metadata: { role: 'admin' } },
      { ...admin, app_metadata: { role: 'customer' } },
      { ...admin, email_confirmed_at: null },
      { ...admin, is_anonymous: true },
    ]) {
      result = { data: { user }, error: null }
      assert.equal((await request('Bearer valid-token')).statusCode, 403)
    }
    for (const status of [400, 401, 403]) {
      result = { data: { user: null }, error: { status } }
      assert.equal((await request('Bearer expired-token')).statusCode, 401)
    }
    for (const status of [429, 500, undefined]) {
      result = { data: { user: null }, error: { status } }
      assert.equal((await request('Bearer valid-token')).statusCode, 503)
    }
    fail = true
    assert.equal((await request('Bearer valid-token')).statusCode, 503)
  } finally { await app.close() }
})

test('missing auth configuration fails closed', async () => {
  const app = Fastify()
  app.addHook('preHandler', createAdminVerifier(null))
  app.get('/admin', () => ({ secret: true }))
  try {
    assert.equal((await app.inject('/admin')).statusCode, 401)
    assert.equal((await app.inject({ url: '/admin', headers: { authorization: 'Bearer token' } })).statusCode, 503)
  } finally { await app.close() }
})

test('cached verification deduplicates concurrent requests and briefly reuses valid admin sessions', async () => {
  let calls = 0
  let release
  const waiting = new Promise(resolve => { release = resolve })
  const app = Fastify()
  app.addHook('preHandler', createAdminVerifier({ auth: { getUser: async () => {
    calls++
    await waiting
    return { data: { user: admin }, error: null }
  } } }, 60_000))
  app.get('/admin', request => ({ user: request.adminUser }))
  const options = { url: '/admin', headers: { authorization: 'Bearer shared-token' } }
  const first = app.inject(options)
  const second = app.inject(options)
  release()
  try {
    assert.equal((await first).statusCode, 200)
    assert.equal((await second).statusCode, 200)
    assert.equal((await app.inject(options)).statusCode, 200)
    assert.equal(calls, 1)
  } finally { await app.close() }
})
