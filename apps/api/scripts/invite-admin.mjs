import { createClient } from '@supabase/supabase-js'
const emails = process.argv.slice(2)
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!emails.length || !key || !process.env.SUPABASE_URL) throw new Error('Emails and backend Supabase settings required')
const client = createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } })
for (const email of emails) {
  try {
    let existing
    for (let page = 1; ; page++) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage: 100 })
      if (error) throw error
      existing = data.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
      if (existing || data.users.length < 100) break
    }
    if (existing?.email_confirmed_at) {
      console.log(JSON.stringify({ email, sent: false, reason: 'Account already confirmed; no invitation sent' }))
      continue
    }
    const provision = existing
      ? await client.auth.admin.updateUserById(existing.id, { app_metadata: { ...existing.app_metadata, role: 'admin' } })
      : await client.auth.admin.createUser({ email, email_confirm: false, app_metadata: { role: 'admin' } })
    if (provision.error) throw provision.error
    const { error } = await client.auth.admin.inviteUserByEmail(email, { redirectTo: 'http://localhost:3000/?setup=password' })
    if (error) throw error
    console.log(JSON.stringify({ email, sent: true, admin: true }))
  } catch (error) {
    console.error(JSON.stringify({ email, sent: false, status: error.status, code: error.code, message: error.message?.replace(/https?:\/\/\S+/g, '[URL]') }))
    process.exitCode = 1
  }
}
