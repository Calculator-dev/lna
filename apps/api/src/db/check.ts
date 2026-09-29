import { pool } from "./client.js"
try {
  await pool.query("SELECT 1")
  const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
  console.log(JSON.stringify({ connected: true, tables: result.rows.map((row) => row.table_name) }))
} catch {
  console.error("Database connection check failed. Check DATABASE_URL and network access.")
  process.exitCode = 1
} finally {
  await pool.end()
}
