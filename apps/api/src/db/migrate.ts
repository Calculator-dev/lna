import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db, pool } from "./client.js"
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) })
  console.log("Database migrations applied.")
} catch (error) {
  // The cause holds the database's own error (e.g. which statement or constraint failed).
  const failure = error as Error & { cause?: { message?: string; code?: string } }
  console.error(`Database migration failed: ${failure.message}`)
  if (failure.cause?.message) console.error(`Cause${failure.cause.code ? ` (${failure.cause.code})` : ""}: ${failure.cause.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
