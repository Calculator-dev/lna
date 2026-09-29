# LNA kreativna sehara

Monorepo workspace for the LNA kreativna sehara webshop for handmade gifts and decor,
the admin CRM, and the Fastify API. It is a separate project with its own database,
Supabase project, storage bucket and domains.

## Apps

- `apps/storefront` - Next.js multilingual webshop frontend
- `apps/api` - Fastify + TypeScript + Drizzle backend
- `apps/crm` - React + React Router + TanStack Query admin frontend

## Getting started

Use Node.js 22+ (`nvm use 25` on the current development computer) and pnpm 10.
Install everything from the repository root with `pnpm install`; there is one
workspace lockfile (`pnpm-lock.yaml`).

Run `pnpm dev` from the root to start the API on port 4000, the CRM on port 3000,
and the storefront on port 3001. Ctrl+C stops all three. Stop existing development
servers first. For separate terminals, use `pnpm dev:api`, `pnpm dev:crm`, and
`pnpm dev:storefront`.

Other root commands, also run in CI (`.github/workflows/ci.yml`):

- `pnpm lint`: ESLint for all apps (`eslint.config.mjs`).
- `pnpm typecheck`: TypeScript checks for all apps.
- `pnpm test`: API and CRM tests. Tests mock the database, Supabase and storage.
- `pnpm build`: production builds of all apps.

## Configuration

| App | File | Variables |
| --- | --- | --- |
| API | `apps/api/.env` | `DATABASE_URL`, `SUPABASE_*`, `BACKBLAZE_*`, `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `INQUIRY_NOTIFY_EMAIL`, `CORS_ORIGINS`, `TRUST_PROXY` |
| CRM | `apps/crm/.env.local` | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Storefront | `apps/storefront/.env.local` | `API_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` |

Each app has a `.env.example`. Environment files are git-ignored. Never put a
database URL, service-role key or other secret in a `VITE_` or `NEXT_PUBLIC_` variable.
Restart an app after changing its environment.

In production:

- Set `CORS_ORIGINS` to the storefront and CRM origins, comma-separated
  (e.g. `https://lnakreativnasehara.ba,https://crm.lnakreativnasehara.ba`). Outside production it
  defaults to the localhost development ports. The API logs a warning at startup
  if it is missing in production.
- Behind a reverse proxy or load balancer, set `TRUST_PROXY=true` (or the number
  of proxy hops) so rate limits apply per client rather than per proxy.
- The storefront requires `API_URL` and `NEXT_PUBLIC_API_URL`; they only default
  to `http://localhost:4000` in development.
- The CRM is a single-page app: configure the host to serve `index.html` for all
  paths (for example `/orders/<id>`).

## Database

The API uses PostgreSQL via Drizzle.

- `pnpm --dir apps/api db:check`: read-only connectivity and table check.
- `pnpm --dir apps/api db:generate`: generate a migration after schema changes.
- `pnpm --dir apps/api db:migrate`: apply reviewed migrations to the configured database.

For a new database, `db:migrate` creates the whole schema from `0000_init`.
`drizzle/meta` holds a snapshot of the current schema, so `db:generate` only emits
new changes. If you hand-write a migration, regenerate the snapshot as well.

The initial migration enables row-level security without public policies. The
backend connection must use a trusted database role with access to these tables.
Orders are saved atomically with server-side prices. No demo records are inserted.

## CRM admin authentication

The CRM uses Supabase email/password sign-in. The API checks every admin request with
Supabase Auth `getUser(accessToken)` and requires a confirmed email and
`app_metadata.role === "admin"`. Editable `user_metadata` never grants access.
There is no public admin signup or role-grant endpoint.

1. In `apps/api/.env`, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
   (legacy `SUPABASE_ANON_KEY` is also supported).
2. Copy `apps/crm/.env.example` to `apps/crm/.env.local` and configure
   `VITE_API_URL`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`
   (or legacy `VITE_SUPABASE_ANON_KEY`). Use the same Supabase project.
3. Create or select a confirmed email/password user in Supabase Auth, and assign
   `app_metadata.role` to `admin` through a trusted administrative operation.
   Preserve existing app metadata when updating it. The API caches a verified
   session for up to 60 seconds, so removing the role denies access within a minute.
4. Restart the API and CRM after configuration changes, then sign in.

`GET /admin/me` returns only the verified administrator's ID and email.
Missing/invalid sessions return 401, non-admin accounts return 403, and unavailable
or unconfigured authentication returns 503. The CRM verifies access once per signed-in
user (token refreshes do not interrupt work), attaches the access token to API
requests, and clears cached data when the user changes or signs out.

Admin provisioning: with `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
configured, run `node --env-file=.env scripts/create-admin.mjs EMAIL` from `apps/api`.
This creates an unconfirmed user with no password and the admin role, or grants that
role to the existing user while preserving other app metadata. It sends no email.
Password setup links should redirect to the CRM with `?setup=password`, and the CRM
URL must be allowed in Supabase Auth redirect settings.

## CRM

The dashboard shows live counts (orders today, awaiting review, awaiting production,
inquiries in the last 30 days, catalogue size) and recent orders. Every page has its
own URL, and leaving a product form with unsaved changes asks for confirmation.

### Adding and editing products

Select **Novi proizvod** or open `/products/new`. Required fields are the Bosnian
name and description, category, material/type, main dimensions, production time,
availability, and at least one variant with a SKU and price. Optional English fields
fall back to Bosnian. A new category can be created in the same transaction as the
product. Slugs and SEO defaults are generated automatically.

Prices are whole KM, and each variant has one price, which is what orders are charged.
The storefront lists a product's sizes cheapest first and preselects the cheapest; shop
cards show "Od" (from) before the lowest price when sizes cost different amounts.

Choose **Uredi** on a product to open `/products/:id/edit`, which submits a full update
through `PUT /admin/products/:id`. Updates keep existing slugs and variant IDs (so
customers' carts stay valid), refresh SEO defaults and `updatedAt`, and return 404 for
missing products or 409 for duplicate SKUs.

### Reviewing orders

Open **Detalji** on an order to view the customer, delivery address, notes, ordered
products, personalization, shipping and total. A submitted order can be accepted once
(after a confirmation step), or declined with a required explanation. The decision,
review time, decline reason, and notification time are saved.

Customer emails are sent through Resend. Configure `RESEND_API_KEY` and
`ORDER_EMAIL_FROM`; the sender must use a domain verified in Resend. Customers get a
receipt when they order and an email when the order is accepted or declined. Email
failures never roll back a saved order or decision; the CRM shows whether each email
was sent so the customer can be contacted manually if needed.

### Custom-work inquiries

The storefront's custom-work form saves inquiries through `POST /public/inquiries`.
They appear under **Upiti** in the CRM. Set `INQUIRY_NOTIFY_EMAIL` to also email each
inquiry to the shop (reply-to is the customer's address).

## Materials

Products have one material: `wood` (Drvo), `resin` (Epoksidna smola) or `mixed`
(Kombinovano). To change the list, update `materialEnum` in `apps/api/src/db/schema.ts`
(then `db:generate`), `productInput` in `apps/api/src/lib/product-input.ts`, the
material options in `apps/crm/src/components/product-form.tsx`, `materials` in
`apps/storefront/lib/products.ts`, the header links in `site-header.tsx`, and the
`common.materials` and `product.highlights.materialText` messages.

## Shipping

Shipping is calculated by the API (`apps/api/src/lib/shipping.ts`): free from 150 KM,
otherwise 10 KM. Orders store the amount, emails and the CRM show it, and the storefront
reads the same policy from `GET /public/catalogue`.

## Product images

The product form accepts up to eight JPEG, PNG, or WebP images (10 MB each).
Uploads go through the authenticated API (`POST /admin/media` with the file as
its binary body and the matching Content-Type). The backend decodes and checks
images, rejects animation and oversized dimensions, strips metadata, and converts
them to WebP at a maximum of 2400 pixels per side.

Configure `BACKBLAZE_ENDPOINT`, `BACKBLAZE_REGION`, `BACKBLAZE_KEY_ID`,
`BACKBLAZE_APP_KEY`, and `BACKBLAZE_BUCKET_NAME` in `apps/api/.env`. The application
key needs read/write access to the configured bucket and the `products/` prefix.
The bucket can remain private; no browser CORS configuration is needed.

Choose a primary image and enter Bosnian/English image descriptions. Saving the
product links its images in the same database transaction as product changes.
Removing an image from the form takes effect on save and detaches it from the
product. Existing product updates that omit `images` preserve all attachments;
sending `images: []` detaches them.

Detached images and uploads abandoned before saving stay in storage until cleaned up.
From `apps/api`, after `pnpm build`:

```sh
node --env-file=.env scripts/cleanup-media.mjs            # list what would be removed
node --env-file=.env scripts/cleanup-media.mjs --apply    # remove images unlinked for 24h+
```

`--hours=N` changes the age threshold. Run `node --env-file=.env scripts/check-storage.mjs`
to upload, read, and remove a generated test image (needs delete permission).

## Storefront

Bosnian is the default language at unprefixed URLs (`/shop`); English lives under `/en`
(`/en/shop`). Both are served by `app/[locale]` using [next-intl](https://next-intl.dev):
`i18n/routing.ts` defines the locales, `proxy.ts` serves unprefixed paths as Bosnian and
redirects `/bs/...` to the unprefixed URL. The language comes only from the URL.

### Translations

All storefront text lives in `apps/storefront/messages/bs.json` and `messages/en.json`,
grouped by page or component (`header`, `shop`, `product`, `cart`, `checkout`, ...), with
shared terms under `common` and page titles under `meta`. To change wording, edit the JSON;
both files must have the same keys. Keys are type-checked against `bs.json`, so a missing
or misspelled key fails `pnpm typecheck`. Placeholders use ICU syntax, e.g.
`"Od {price}"`. Product names and descriptions come from the CRM, not these files.

The storefront loads `GET /public/catalogue` on the server for categories, products,
translations, SEO, images, and the shipping policy. Catalogue reads happen at request
time so CRM changes appear on the next page load. Empty catalogues show no sample
products; failures show a retry page. No database credentials go to the browser.

The cart is stored in the browser. On the cart and checkout pages it is repriced from
the live catalogue, and products that are no longer sold are removed with a notice.
Order and inquiry submissions are limited to 10 per client per 10 minutes.

Product images are served from `/api/media/:id`. The route streams the image from
private storage with a one-day cache, which lets `next/image` resize and convert it to
AVIF/WebP. All saved products are public (there is no draft/publish switch yet).
Cart and checkout pages are excluded from search indexing and the sitemap.

The legacy localized `/public/products`, `/public/products/:slug`, and
`/public/categories` API endpoints remain available alongside `/public/catalogue`.
