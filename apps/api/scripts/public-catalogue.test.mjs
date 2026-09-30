import assert from 'node:assert/strict'
import test from 'node:test'
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost/unused'
const { catalogueResponse } = await import('../dist/services/public-catalogue.js')
test('live catalogue serializes translations, categories and primary-first stable image URLs', () => {
  const result = catalogueResponse([{ id: 'category', translations: { bs: { name: 'Dom', slug: 'dom', description: '' }, en: { name: 'Home', slug: 'home', description: '' } }, seo: {} }], [{ id: 'product', sku: 'SKU', categoryId: 'category', price: 45, translations: { bs: { name: 'Ime', slug: 'ime', care: 'Uljeni hrast' }, en: { name: 'Name', slug: 'name' } }, seo: {}, leadTime: { bs: '3 dana', en: '3 days' }, stockLabel: {}, type: 'custom', material: 'resin', featured: true, customizable: true }], [{ id: 'second', productId: 'product', storageKey: 'private-secret', isPrimary: false, alt: {}, width: 100, height: 100, mimeType: 'image/webp' }, { id: 'primary', productId: 'product', isPrimary: true, alt: { bs: 'Slika' }, width: 100, height: 100, mimeType: 'image/webp' }, { id: 'unattached', productId: null }])
  const product = result.products[0]
  assert.equal(product.name.en, 'Name')
  assert.equal(product.categoryName.en, 'Home')
  assert.deepEqual(product.care, { bs: 'Uljeni hrast', en: 'Uljeni hrast' })
  assert.equal(product.currency, 'BAM')
  assert.equal(product.media.length, 2)
  assert.equal(product.media[0].url, '/public/media/primary')
  assert.equal(product.media[0].alt.en, 'Slika')
  assert.ok(!JSON.stringify(result).includes('private-secret'))
  assert.deepEqual(catalogueResponse([], [], []), { shipping: { freeFrom: 150, fee: 10 }, products: [], categories: [] })
})
