import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { seedDashboard, seedProducts } from './fixtures.ts'
import { dashboardView, orderRows, productRows } from '../src/lib/admin-data.ts'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../src/app.tsx'

function render(client: QueryClient, element: React.ReactElement | null, path = '/') {
  const router = createMemoryRouter(element ? [{ path: '*', element }] : routes, { initialEntries: [path] })
  return renderToString(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
}

test('API odgovor kontrolne ploče prikazuje se bez greške', () => {
  const data = dashboardView(seedDashboard)
  assert.equal(data.totals.length, 5)
  assert.equal(data.totals[0].value, '4')
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(['dashboard'], data)
  client.setQueryData(['products'], productRows(seedProducts))
  client.setQueryData(['orders'], orderRows(seedDashboard.recentOrders))
  const html = render(client, null)
  assert.match(html, /Današnje narudžbe/)
  assert.match(html, /LNA-104251/)
  assert.match(html, /98,00\u00a0KM/)
  client.clear()
})

test('API proizvodi se mapiraju u lokalizovane ćelije tabele', () => {
  const products = productRows(seedProducts)
  assert.equal(products[0].name, 'Monogram za vjenčanje')
  assert.equal(products[0].price, '45,00\u00a0KM')
  assert.deepEqual(productRows([]), [])
})

test('obrazac proizvoda prikazuje tok za prvi proizvod bez postojećih kategorija', async () => {
  const { ProductForm } = await import('../src/components/product-form.tsx')
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(['categories'], [])
  const html = render(client, <ProductForm onSaved={() => {}} onCancel={() => {}} />)
  assert.match(html, /Dodaj proizvod/)
  assert.match(html, /Kreiraj kategoriju/)
  assert.match(html, /Još nema kategorija/)
  assert.match(html, /Sačuvaj proizvod/)
  assert.match(html, /Naziv proizvoda na bosanskom/)
  client.clear()
})

test('obrazac za uređivanje popunjen je sačuvanim detaljima proizvoda', async () => {
  const { ProductForm } = await import('../src/components/product-form.tsx')
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(['categories'], [{ id: 'category-id', translations: { bs: { name: 'Dom' } } }])
  const product = { ...seedProducts[0], id: 'product-id', categoryId: 'category-id', price: 72, featured: true }
  const html = render(client, <ProductForm product={product} onSaved={() => {}} onCancel={() => {}} />)
  assert.match(html, /Uredi proizvod/)
  assert.match(html, /Sačuvaj izmjene/)
  assert.match(html, /value="72"/)
  assert.match(html, /value="LNA-MONO-01"/)
  assert.match(html, /value="category-id" selected/)
  assert.match(html, /Monogram za vjenčanje/)
  assert.equal(productRows([product])[0].id, 'product-id')
  client.clear()
})

test('sačuvane slike proizvoda prikazuju pregled, opise i kontrole glavne slike', async () => {
  const { ProductImages } = await import('../src/components/product-images.tsx')
  const images = [{ id: 'image-id', url: 'https://example.com/photo.webp', width: 400, height: 300, alt: { bs: 'Drveni natpis', en: 'Wooden sign' }, isPrimary: true }]
  const html = renderToString(<ProductImages images={images} onChange={() => {}} onBusy={() => {}} disabled={false} />)
  assert.match(html, /Slike proizvoda/)
  assert.match(html, /photo.webp/)
  assert.match(html, /Drveni natpis/)
  assert.match(html, /Glavna/)
  assert.match(html, /Ukloni/)
  assert.match(html, /image\/jpeg,image\/png,image\/webp/)
})

test('liste proizvoda, narudžbi i upita imaju stanja učitavanja i prazne liste', () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  assert.match(render(client, null, '/orders'), /Učitavanje…/)
  client.setQueryData(['inquiries'], [])
  assert.match(render(client, null, '/inquiries'), /Još nema upita/)
  assert.match(render(client, null, '/ne-postoji'), /Stranica nije pronađena/)
  client.clear()
})

test('nacrt proizvoda zadržava ID-eve varijanti i gradi API tijelo zahtjeva', async () => {
  const { productPayload, variantDrafts } = await import('../src/lib/product-draft.ts')
  const variantId = '0b3f4f5e-9f55-4e0e-9d57-8f1d6a3a2c11'
  const drafts = variantDrafts({ ...seedProducts[0], id: 'product-id', variants: [
    { id: variantId, sku: 'LNA-1', dimensions: '30 cm', price: 45, active: true, isDefault: true },
    { id: 'product-id-default', sku: 'LNA-2', dimensions: '40 cm', price: 60, active: false, isDefault: false },
  ] })
  assert.equal(drafts[0].id, variantId)
  assert.equal(drafts[1].id, undefined)
  assert.notEqual(drafts[0].key, drafts[1].key)
  const form = new FormData()
  form.set('name.bs', ' Monogram ')
  form.set('description.bs', 'Opis')
  form.set('care.bs', ' Čistiti suhom krpom. ')
  form.set('leadTime.bs', '3 dana')
  form.set('stockLabel.bs', 'Po narudžbi')
  form.set('type', 'custom')
  form.set('material', 'resin')
  form.set('featured', 'on')
  const body = productPayload({ form, category: 'category-id', images: [], variants: drafts, mainDimensions: '35 cm' })
  assert.equal('categoryId' in body ? body.categoryId : undefined, 'category-id')
  assert.deepEqual(body.variants[0], { id: variantId, sku: 'LNA-1', dimensions: '35 cm', price: 45, active: true })
  assert.deepEqual(body.variants[1], { sku: 'LNA-2', dimensions: '40 cm', price: 60, active: false })
  assert.equal(body.translations.bs.name, 'Monogram')
  assert.equal(body.translations.en.name, 'Monogram')
  assert.equal(body.translations.bs.care, 'Čistiti suhom krpom.')
  assert.equal(body.translations.en.care, 'Čistiti suhom krpom.')
  assert.equal(body.featured, true)
  assert.equal(body.customizable, false)
})
