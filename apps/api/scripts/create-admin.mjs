import { createClient } from '@supabase/supabase-js'
const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]?.trim().toLowerCase()
if (!email || !process.env.SUPABASE_URL || !adminKey) throw new Error('Email and backend Supabase credentials required')
const client = createClient(process.env.SUPABASE_URL, adminKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } })
try {
  let existing
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    existing = data.users.find(user => user.email?.toLowerCase() === email)
    if (existing || data.users.length < 100) break
  }
  const result = existing
    ? await client.auth.admin.updateUserById(existing.id, { app_metadata: { ...existing.app_metadata, role: 'admin' } })
    : await client.auth.admin.createUser({ email, email_confirm: false, app_metadata: { role: 'admin' } })
  if (result.error) throw result.error
  const verified = await client.auth.admin.getUserById(result.data.user.id)
  if (verified.error || verified.data.user.app_metadata.role !== 'admin') throw new Error('Verification failed')
  console.log(JSON.stringify({ email, created: !existing, admin: true, emailConfirmed: Boolean(verified.data.user.email_confirmed_at), emailSent: false }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error.code, status: error.status, message: 'Admin provisioning failed' }))
  process.exitCode = 1
}
