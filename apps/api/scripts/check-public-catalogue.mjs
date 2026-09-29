import assert from 'node:assert/strict'
import { createApp } from '../dist/app.js'
const app = createApp()
try {
  const response = await app.inject('/public/catalogue')
  assert.equal(response.statusCode, 200)
  const data = response.json()
  assert.ok(Array.isArray(data.products))
  assert.ok(Array.isArray(data.categories))
  for (const product of data.products) {
    assert.ok(product.id && product.slug.bs && product.slug.en)
    assert.equal(product.currency, 'BAM')
    for (const photo of product.media) {
      const image = await app.inject(photo.url)
      assert.equal(image.statusCode, 302)
      const remote = await fetch(image.headers.location, { signal: AbortSignal.timeout(15000) })
      assert.equal(remote.status, 200)
      await remote.body?.cancel()
    }
  }
  console.log(JSON.stringify({ ok: true, products: data.products.length, categories: data.categories.length, images: data.products.reduce((sum, p) => sum + p.media.length, 0), slugs: data.products.map(p => p.slug) }))
} finally { await app.close() }
