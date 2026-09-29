import sharp from "sharp"
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export async function prepareImage(body: Buffer) {
  if (!body.length || body.length > MAX_IMAGE_BYTES) throw Object.assign(new Error("Choose an image smaller than 10 MB"), { statusCode: 413 })
  try {
    const options = { limitInputPixels: 40000000, failOn: "error" as const }
    const metadata = await sharp(body, options).metadata()
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image")
    const { data, info } = await sharp(body, options).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true })
    return { data, width: info.width, height: info.height }
  } catch {
    throw Object.assign(new Error("Choose a valid, non-animated JPEG, PNG, or WebP image under 40 megapixels"), { statusCode: 400 })
  }
}
