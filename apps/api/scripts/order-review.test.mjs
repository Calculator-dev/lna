import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import { ZodError } from 'zod'

process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { orderReviewRoutes } = await import('../dist/routes/order-review.js')
const { db, pool } = await import('../dist/db/client.js')

const orderId = '15d43dcb-fb77-466e-a69d-54ea1f08aac7'
const existing = {
  id: orderId,
  orderNumber: 'LNA-123',
  locale: 'bs',
  status: 'submitted',
  email: 'customer@example.com',
  fullName: 'Test Kupac',
}

test('order decisions require a decline reason and persist accepted or declined states', async () => {
  const app = Fastify()
  await app.register(sensible)
  app.setErrorHandler((error, _request, reply) => reply.code(error instanceof ZodError ? 400 : error.statusCode ?? 500).send({ message: error.message }))
  await app.register(orderReviewRoutes)
  const originalSelect = db.select
  const originalUpdate = db.update
  let current = { ...existing }
  let saved
  db.select = () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [current] }) }) }) })
  db.update = () => ({ set: values => ({ where: () => ({
    returning: async () => { saved = values; return [{ ...current, ...values }] },
    then: resolve => resolve([]),
  }) }) })

  try {
    const invalid = await app.inject({ method: 'PUT', url: `/orders/${orderId}/decision`, payload: { decision: 'decline', reason: 'no' } })
    assert.equal(invalid.statusCode, 400)

    const declined = await app.inject({ method: 'PUT', url: `/orders/${orderId}/decision`, payload: { decision: 'decline', reason: 'Proizvod nije dostupan.' } })
    assert.equal(declined.statusCode, 200)
    assert.equal(saved.status, 'declined')
    assert.equal(saved.paymentStatus, 'cancelled')
    assert.equal(saved.declineReason, 'Proizvod nije dostupan.')
    assert.deepEqual(declined.json().notification, { sent: false, reason: 'not_configured' })

    const accepted = await app.inject({ method: 'PUT', url: `/orders/${orderId}/decision`, payload: { decision: 'accept' } })
    assert.equal(accepted.statusCode, 200)
    assert.equal(saved.status, 'confirmed')
    assert.equal(saved.declineReason, null)

    current = { ...current, status: 'confirmed' }
    assert.equal((await app.inject({ method: 'PUT', url: `/orders/${orderId}/decision`, payload: { decision: 'accept' } })).statusCode, 409)
  } finally {
    db.select = originalSelect
    db.update = originalUpdate
    await app.close()
    await pool.end()
  }
})

test('a decision is still reported as saved when its email timestamp cannot be stored', async () => {
  const { env } = await import('../dist/env.js')
  Object.assign(env, { RESEND_API_KEY: 'test-key', ORDER_EMAIL_FROM: 'shop@example.com' })
  const app = Fastify()
  await app.register(sensible)
  app.decorateRequest('adminUser', null)
  app.addHook('preHandler', async request => { request.adminUser = { id: 'b8a4d1f2-5c3e-4a8f-9d2b-7e6f1a0c3b5d', email: 'admin@example.com' } })
  await app.register(orderReviewRoutes)
  const originalSelect = db.select
  const originalUpdate = db.update
  const originalFetch = globalThis.fetch
  let saved
  db.select = () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [{ ...existing }] }) }) }) })
  db.update = () => ({ set: values => ({ where: () => ({
    returning: async () => { saved = values; return [{ ...existing, ...values }] },
    then: (_resolve, reject) => reject(new Error('Simulated database failure')),
  }) }) })
  globalThis.fetch = async () => new Response('{}', { status: 200 })
  try {
    const response = await app.inject({ method: 'PUT', url: `/orders/${orderId}/decision`, payload: { decision: 'accept' } })
    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json().notification, { sent: true })
    assert.equal(saved.reviewedBy, 'b8a4d1f2-5c3e-4a8f-9d2b-7e6f1a0c3b5d')
    assert.equal(saved.reviewedByEmail, 'admin@example.com')
  } finally {
    db.select = originalSelect
    db.update = originalUpdate
    globalThis.fetch = originalFetch
    Object.assign(env, { RESEND_API_KEY: undefined, ORDER_EMAIL_FROM: undefined })
    await app.close()
  }
})
