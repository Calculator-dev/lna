import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { env } = await import('../dist/env.js')
const { sendOrderDecisionEmail } = await import('../dist/services/order-email.js')

test('customer emails show the shop logo once the shop address is known', async () => {
  const originalFetch = globalThis.fetch
  const sent = []
  globalThis.fetch = async (_url, init) => { sent.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }) }
  Object.assign(env, { RESEND_API_KEY: 'key', ORDER_EMAIL_FROM: 'shop@example.com' })
  const email = { to: 'a@example.com', fullName: 'Kupac', orderNumber: 'LNA-1', locale: 'bs', decision: 'accept' }
  try {
    await sendOrderDecisionEmail(email)
    assert.doesNotMatch(sent[0].html, /<img/)
    env.NEXT_PUBLIC_SITE_URL = 'https://lnasehara.com/'
    await sendOrderDecisionEmail(email)
    assert.match(sent[1].html, /<img src="https:\/\/lnasehara\.com\/logo\.png" alt="LNA kreativna sehara"/)
  } finally {
    globalThis.fetch = originalFetch
    Object.assign(env, { RESEND_API_KEY: undefined, ORDER_EMAIL_FROM: undefined, NEXT_PUBLIC_SITE_URL: undefined })
  }
})
