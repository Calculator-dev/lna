import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db, pool } from "./client.js"
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  console.log("Database migrations applied.")
} catch {
  console.error("Database migration failed. Inspect database configuration and migration compatibility.")
  process.exitCode = 1
} finally {
  await pool.end()
}
