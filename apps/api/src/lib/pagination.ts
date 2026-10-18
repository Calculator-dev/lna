import type { FastifyReply } from "fastify"
import { sql, type AnyColumn, type SQL } from "drizzle-orm"
import { z } from "zod"

// Admin lists are newest first and paged by a cursor on (created_at, id), so rows created while
// someone pages through never shift or repeat a page. Without `limit` a list returns every row,
// as it did before paging; the CRM always sends one.
export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  before: z.string().max(200).optional(),
})

export const NEXT_CURSOR_HEADER = "X-Next-Cursor"

const cursorSchema = z.tuple([z.string().datetime({ offset: true }), z.string().uuid()])

/**
 * Postgres keeps microseconds, which a JS Date would round away, so the cursor carries the
 * timestamp as Postgres printed it (select it with `cursorTime`).
 */
export const cursorTime = (column: AnyColumn) =>
  sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`

export function decodeCursor(cursor: string) {
  const parsed = cursorSchema.safeParse(Buffer.from(cursor, "base64url").toString("utf8").split("|"))
  if (!parsed.success) throw Object.assign(new Error("Invalid page cursor"), { statusCode: 400 })
  return { createdAt: parsed.data[0], id: parsed.data[1] }
}

/** Rows strictly after the cursor in newest-first order. */
export function beforeCursor(createdAt: AnyColumn, id: AnyColumn, cursor: string): SQL {
  const position = decodeCursor(cursor)
  return sql`(${createdAt}, ${id}) < (${position.createdAt}::timestamptz, ${position.id}::uuid)`
}

/**
 * Trims the one extra row a paged query fetches and, when there is a next page, sends its cursor
 * in a header so the body stays the plain array older CRM builds expect.
 */
export function page<T extends { id: string; cursorTime: string }>(reply: FastifyReply, rows: T[], limit: number | undefined) {
  if (!limit || rows.length <= limit) return rows.map(stripCursor)
  const items = rows.slice(0, limit)
  const last = items[items.length - 1]
  reply.header(NEXT_CURSOR_HEADER, Buffer.from(`${last.cursorTime}|${last.id}`).toString("base64url"))
  return items.map(stripCursor)
}

function stripCursor<T extends { cursorTime: string }>({ cursorTime: _cursorTime, ...row }: T) {
  return row
}
