import { randomUUID } from "node:crypto"
import type { FastifyPluginAsync } from "fastify"
import { db } from "../db/client.js"
import { mediaAssets } from "../db/schema.js"
import { uploadImage, deleteUploadedImage, imageUrl, permanentImageUrl } from "../services/backblaze.js"
import { MAX_IMAGE_BYTES, prepareImage } from "../services/image-processing.js"

export async function withImageUrls(rows: (typeof mediaAssets.$inferSelect)[]) {
  return Promise.all(rows.map(async row => ({ ...row, url: await imageUrl(row.storageKey) })))
}
export const mediaRoutes: FastifyPluginAsync = async app => {
  app.addContentTypeParser(["image/jpeg", "image/png", "image/webp"], { parseAs: "buffer", bodyLimit: MAX_IMAGE_BYTES }, (_request, body, done) => done(null, body))
  app.post("/media", { bodyLimit: MAX_IMAGE_BYTES }, async (request, reply) => {
    if (!Buffer.isBuffer(request.body)) throw app.httpErrors.unsupportedMediaType("Choose a JPEG, PNG, or WebP image")
    const image = await prepareImage(request.body)
    const id = randomUUID()
    const storageKey = `products/${id}.webp`
    let versionId: string | undefined
    try {
      const stored = await uploadImage(storageKey, image.data)
      versionId = stored.VersionId
    } catch {
      throw app.httpErrors.serviceUnavailable("Image upload failed. Please try again or check the storage configuration.")
    }
    try {
      const url = await imageUrl(storageKey)
      const [asset] = await db.insert(mediaAssets).values({ id, storageKey, publicUrl: permanentImageUrl(storageKey), mimeType: "image/webp", width: image.width, height: image.height, alt: { bs: "", en: "" } }).returning()
      return reply.code(201).send({ ...asset, url })
    } catch (error) {
      await deleteUploadedImage(storageKey, versionId).catch(() => request.log.error("Failed to clean up unsuccessful image upload"))
      throw error
    }
  })
}
