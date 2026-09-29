import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { createApp } = await import('../dist/app.js')
const { db } = await import('../dist/db/client.js')
const { inquiries } = await import('../dist/db/schema.js')

const payload = { locale: 'en', fullName: 'Lejla H.', email: 'lejla@example.com', brief: 'Wedding monogram, 40 cm, gold resin.', phone: '', deadline: 'June' }

test('inquiries are validated, saved, and only listed for admins', async () => {
  const app = createApp()
  const original = db.insert
  let saved
  db.insert = table => ({ values: values => ({ returning: async () => {
    assert.equal(table, inquiries)
    saved = values
    return [{ id: '1b0c7c38-8a0e-4c7e-9f0d-3f6f0a2b4c5d', createdAt: new Date() }]
  } }) })
  try {
    const response = await app.inject({ method: 'POST', url: '/public/inquiries', payload })
    assert.equal(response.statusCode, 201)
    assert.equal(saved.fullName, 'Lejla H.')
    assert.equal(saved.phone, undefined)
    assert.equal(saved.deadline, 'June')

    saved = undefined
    assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: { ...payload, brief: 'short' } })).statusCode, 400)
    assert.equal((await app.inject({ method: 'POST', url: '/public/inquiries', payload: { ...payload, email: 'nope' } })).statusCode, 400)
    assert.equal(saved, undefined)

    assert.equal((await app.inject('/admin/inquiries')).statusCode, 401)
  } finally {
    db.insert = original
    await app.close()
  }
})
