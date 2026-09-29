import pg from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { env } from "../env.js"
import * as schema from "./schema.js"

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
})
export const db = drizzle(pool, { schema })
