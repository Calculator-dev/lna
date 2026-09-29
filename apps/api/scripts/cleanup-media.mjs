// Removes product images that were uploaded but never saved with a product, or were
// detached from one. Dry run by default; pass --apply to delete. Run from apps/api after
// `npm run build`: node --env-file=.env scripts/cleanup-media.mjs [--apply] [--hours=24]
import { and, eq, isNull, lt } from 'drizzle-orm'
const { db, pool } = await import('../dist/db/client.js')
const { mediaAssets } = await import('../dist/db/schema.js')
const { deleteUploadedImage } = await import('../dist/services/backblaze.js')

const apply = process.argv.includes('--apply')
const hours = Number(process.argv.find(arg => arg.startsWith('--hours='))?.slice(8) ?? 24)
if (!Number.isFinite(hours) || hours < 1) throw new Error('--hours must be at least 1')
const cutoff = new Date(Date.now() - hours * 3600_000)

try {
  const candidates = await db.select({ id: mediaAssets.id, storageKey: mediaAssets.storageKey })
    .from(mediaAssets).where(and(isNull(mediaAssets.productId), lt(mediaAssets.createdAt, cutoff)))
  console.log(`${candidates.length} unlinked image(s) older than ${hours}h${apply ? '' : ' (dry run; pass --apply to delete)'}`)
  let removed = 0
  for (const asset of candidates) {
    if (!apply) { console.log(`  would remove ${asset.storageKey}`); continue }
    // Only delete the row if it is still unlinked, so an image saved meanwhile survives.
    const [row] = await db.delete(mediaAssets)
      .where(and(eq(mediaAssets.id, asset.id), isNull(mediaAssets.productId)))
      .returning({ storageKey: mediaAssets.storageKey })
    if (!row) continue
    try {
      await deleteUploadedImage(row.storageKey)
      removed++
    } catch (error) {
      console.error(`  database row removed but storage delete failed for ${row.storageKey}: ${error.name}`)
      process.exitCode = 1
    }
  }
  if (apply) console.log(`Removed ${removed} image(s).`)
} finally {
  await pool.end()
}
