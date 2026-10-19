# Analytics and campaigns

The storefront loads **Google Tag Manager (GTM)**. Google Analytics 4 (GA4), and later any ad
tags (Google Ads, Meta Pixel, TikTok), are configured inside GTM, so adding one needs no code
change. Two things are tracked:

- **GA4 ecommerce events**, pushed to GTM's data layer (`apps/storefront/lib/analytics.ts`).
- **Where each order and inquiry came from** (`utm_*` tags, `gclid`, `fbclid`, referring site),
  saved in the shop's own database and shown in the CRM under "Izvor posjete". Ad blockers
  don't affect this, so it's the reliable answer to "which campaign brought this order?".

Nothing is loaded and no banner is shown until `NEXT_PUBLIC_GTM_ID` is set.

## Consent

Visitors see a banner (Bosnian or English) the first time. Google Consent Mode v2 starts with
analytics and ad storage **denied**; GA4 then only receives cookieless pings it uses to model
the missing data. "Prihvati" grants analytics and ads, "Odbij" keeps them denied, and
"Postavke kolačića" in the footer lets visitors change their mind. The campaign source is only
saved in the browser after consent; before that it still goes with an order placed in the same
visit. The privacy page (`/privacy`, `/en/privacy`) is a starting point: have it checked
against the rules that apply to you.

## Events

| Event | When | Notes |
|---|---|---|
| `page_view` | every page, including client-side navigation | sent by GA4 itself (enhanced measurement) |
| `view_item_list` | shop page, and again when filters change the list | `item_list_name: "shop"`, up to 50 items |
| `view_item` | product page | cheapest available variant |
| `add_to_cart` / `remove_from_cart` | cart changes | |
| `view_cart` | cart page, or opening the cart drawer | |
| `begin_checkout` | checkout page with items in the cart | |
| `purchase` | order submitted | `transaction_id` is the order number, so GA4 drops duplicates |
| `generate_lead` | custom-work inquiry sent | |

Items use the variant SKU as `item_id`, the size as `item_variant` and prices in KM with the
currency `BAM`. Orders are confirmed by hand: a `purchase` is an order placed, not paid. Compare
with the CRM for orders that were declined.

## One-time setup

1. **GA4** (analytics.google.com): create a property with time zone *Europe/Sarajevo* and
   currency *Bosnian Convertible Mark (BAM)*, then a **Web** data stream for the shop's address.
   Keep *Enhanced measurement* on, including *Page changes based on browser history events*.
   Note the measurement ID (`G-…`).
2. **GTM** (tagmanager.google.com): create a **Web** container and note its ID (`GTM-…`).
   - *Admin → Container settings*: turn on *Enable consent overview*.
   - Tag **Google tag**: tag ID = the `G-…` ID; trigger *Initialization – All Pages*. Under
     *Advanced → Consent settings* choose *No additional consent required* (Consent Mode
     handles it).
   - Variable **Event** is built in. Create a trigger **Shop events**: *Custom Event*, event
     name `view_item_list|view_item|add_to_cart|remove_from_cart|view_cart|begin_checkout|purchase|generate_lead`,
     *Use regex matching* on.
   - Tag **GA4 – shop events**: type *Google Analytics: GA4 Event*, measurement ID `G-…`, event
     name `{{Event}}`, *More settings → Ecommerce → Send Ecommerce data* from *Data Layer*;
     trigger *Shop events*.
   - *Submit* and *Publish* the container.
3. **Render**: `render.yaml` sets `NEXT_PUBLIC_GTM_ID` (the container is `GTM-5DL8TGR7`). It's
   read at build time, so a change needs a redeploy. If the Blueprint doesn't sync it to the
   existing `lna-shop` service, set it there by hand.
4. **Check it**: GTM *Preview* (Tag Assistant) on the shop, accept cookies, browse, add to cart
   and place a test order; the events show up in Tag Assistant and in GA4 *Admin → DebugView*.
   Decline test orders in the CRM.
5. **GA4 housekeeping**: mark `purchase` and `generate_lead` as *key events*; under *Data
   filters* exclude internal traffic (define your IP under the data stream's *Configure tag
   settings → Define internal traffic*); set data retention to 14 months; link Google Search
   Console once the real domain is live.

When the real domain goes live, update the GA4 data stream URL and `NEXT_PUBLIC_SITE_URL`.

## Campaigns

Tag every link you share with UTM parameters, e.g.

    https://lnakreativnasehara.ba/shop?utm_source=instagram&utm_medium=social&utm_campaign=jesen-2026

Use lowercase and the same few values each time (`utm_medium`: `social`, `paid_social`, `cpc`,
`email`), since GA4 groups by exact text. Google Ads and Meta add `gclid` / `fbclid` themselves.
The CRM shows the last campaign a customer arrived from within 30 days of their order.

Adding an ad platform later (Google Ads conversion, Meta Pixel) is a new tag in GTM using the
same events; set its consent settings to require `ad_storage`.
