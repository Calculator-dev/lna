import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { seedDashboard, seedProducts } from './fixtures.ts'
import { dashboardView, orderRows, productRows } from '../src/lib/admin-data.ts'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../src/app.tsx'
import { ProductsPage } from '../src/pages/products.tsx'

// Cache entry of a paged admin list (usePagedList) holding one loaded page.
const onePage = <T,>(items: T[], nextCursor: string | null = null) => ({ pages: [{ items, nextCursor }], pageParams: [undefined] })

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
  client.setQueryData(['products'], onePage(productRows(seedProducts)))
  client.setQueryData(['orders'], onePage(orderRows(seedDashboard.recentOrders)))
  const html = render(client, null)
  assert.match(html, /Današnje narudžbe/)
  assert.match(html, /LNA-104251/)
  assert.match(html, /98,50\u00a0KM/)
  client.clear()
})

test('API proizvodi se mapiraju u lokalizovane ćelije tabele', () => {
  const products = productRows(seedProducts)
  assert.equal(products[0].name, 'Monogram za vjenčanje')
  assert.equal(products[0].price, '45,00\u00a0KM')
  assert.deepEqual(productRows([]), [])
  const [withImage, withoutImage] = productRows([
    { ...seedProducts[0], primaryImage: { url: 'https://img.example/m1.webp', alt: { bs: 'Monogram od hrasta' } } },
    { ...seedProducts[0], primaryImage: null },
  ])
  assert.equal(withImage.image, 'https://img.example/m1.webp')
  assert.equal(withImage.imageAlt, 'Monogram od hrasta')
  assert.equal(withoutImage.image, '')
})

test('lista proizvoda prikazuje glavnu sliku ili oznaku da je nema', () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(['products'], onePage(productRows([
    { ...seedProducts[0], id: 'p1', primaryImage: { url: 'https://img.example/m1.webp', alt: { bs: 'Monogram od hrasta' } } },
    { ...seedProducts[0], id: 'p2', primaryImage: null },
  ])))
  const html = render(client, <ProductsPage />, '/products')
  assert.match(html, /<img[^>]+src="https:\/\/img\.example\/m1\.webp"[^>]+alt="Monogram od hrasta"|<img[^>]+alt="Monogram od hrasta"[^>]+src="https:\/\/img\.example\/m1\.webp"/)
  assert.match(html, /Nema glavne slike/)
  assert.match(html, /aria-label="Uredi: Monogram za vjenčanje"/)
  client.clear()
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
  const product = { ...seedProducts[0], id: 'product-id', categoryId: 'category-id', priceMinor: 7200, featured: true }
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
  client.setQueryData(['inquiries'], onePage([]))
  assert.match(render(client, null, '/inquiries'), /Još nema upita/)
  assert.doesNotMatch(render(client, null, '/inquiries'), /Učitaj još/)
  // A page with a cursor after it offers the next one.
  client.setQueryData(['orders'], onePage(orderRows(seedDashboard.recentOrders), 'next-cursor'))
  const orders = render(client, null, '/orders')
  assert.match(orders, /LNA-104251/)
  assert.match(orders, /Učitaj još/)
  assert.match(render(client, null, '/ne-postoji'), /Stranica nije pronađena/)
  client.clear()
})

test('nacrt proizvoda zadržava ID-eve varijanti i gradi API tijelo zahtjeva', async () => {
  const { productPayload, variantDrafts } = await import('../src/lib/product-draft.ts')
  const variantId = '0b3f4f5e-9f55-4e0e-9d57-8f1d6a3a2c11'
  const drafts = variantDrafts({ ...seedProducts[0], id: 'product-id', variants: [
    { id: variantId, sku: 'LNA-1', dimensions: '30 cm', priceMinor: 4550, active: true, isDefault: true },
    { id: 'product-id-default', sku: 'LNA-2', dimensions: '40 cm', priceMinor: 6000, active: false, isDefault: false },
  ] })
  assert.equal(drafts[0].id, variantId)
  // The price field shows KM: decimals only when there are feninga.
  assert.deepEqual(drafts.map(draft => draft.price), ['45.50', '60'])
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
  assert.deepEqual(body.variants[0], { id: variantId, sku: 'LNA-1', dimensions: '35 cm', priceMinor: 4550, active: true })
  assert.deepEqual(body.variants[1], { sku: 'LNA-2', dimensions: '40 cm', priceMinor: 6000, active: false })
  assert.equal(body.translations.bs.name, 'Monogram')
  assert.equal(body.translations.en.name, 'Monogram')
  assert.equal(body.translations.bs.care, 'Čistiti suhom krpom.')
  assert.equal(body.translations.en.care, 'Čistiti suhom krpom.')
  assert.equal(body.featured, true)
  assert.equal(body.customizable, false)
})

test('cijene upisane u KM pretvaraju se u feninge', async () => {
  const { toMinor } = await import('../src/lib/product-draft.ts')
  assert.equal(toMinor('45'), 4500)
  assert.equal(toMinor('45.5'), 4550)
  assert.equal(toMinor('45,50'), 4550)
  assert.equal(toMinor('0.07'), 7)
  // Anything else is sent as invalid and rejected by the API rather than guessed.
  for (const invalid of ['', '45.505', '-1', 'abc']) assert.ok(Number.isNaN(toMinor(invalid)), invalid)
})

test('izvor posjete prikazuje kampanju ili direktnu posjetu', async () => {
  const { AttributionCard } = await import('../src/components/attribution-card.tsx')
  const { renderToString } = await import('react-dom/server')
  const html = renderToString(<AttributionCard attribution={{ source: 'facebook', medium: 'paid_social', campaign: 'jesen-2026', fbclid: 'abc', landingPath: '/shop' }} />)
  assert.match(html, /jesen-2026/)
  assert.match(html, /facebook \/ paid_social/)
  assert.match(html, /Meta/)
  assert.match(renderToString(<AttributionCard attribution={null} />), /Direktna posjeta/)
})
