// Writes a compressed pg_dump of the database to apps/api/backups/ (git-ignored).
// Usage from apps/api: `pnpm db:backup` (needs pg_dump installed, same or newer major version as the server).
// Restore into an empty database with: pg_restore --no-owner --dbname "<url>" backups/<file>.dump
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const url = new URL(process.env.DATABASE_URL)
// Supabase's transaction pooler (port 6543) cannot run pg_dump; its session pooler (5432) can.
if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') url.port = '5432'

const directory = fileURLToPath(new URL('../backups/', import.meta.url))
mkdirSync(directory, { recursive: true })
const file = `${directory}lna-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`
// Only the app's own tables; Supabase-managed schemas (auth, storage, …) are backed up by Supabase itself.
const result = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--schema=public', '--schema=drizzle', `--file=${file}`, url.toString()], { stdio: ['ignore', 'inherit', 'inherit'] })
if (result.error) throw new Error(`pg_dump could not start: ${result.error.message}`)
if (result.status !== 0) {
  console.error('Backup failed. Check that pg_dump is installed and matches the server version.')
  process.exit(result.status ?? 1)
}
console.log(`Backup written to ${file}`)
