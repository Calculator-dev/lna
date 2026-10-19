import Script from "next/script"
import { CONSENT_KEY } from "@/lib/consent"
import { gtmId } from "@/lib/analytics"

const validId = gtmId && /^GTM-[A-Z0-9]+$/.test(gtmId) ? gtmId : undefined

/**
 * Consent Mode v2 defaults: everything denied, then a choice saved on an earlier visit. This
 * runs before the page's own code, so no shop event can reach the data layer ahead of it.
 */
export function ConsentDefaults() {
  if (!validId) return null
  const script = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
try {
  var choice = localStorage.getItem(${JSON.stringify(CONSENT_KEY)});
  if (choice === 'granted' || choice === 'denied') gtag('consent', 'update', { analytics_storage: choice, ad_storage: choice, ad_user_data: choice, ad_personalization: choice });
} catch (e) {}
`
  // A plain inline script in <head>: it runs while the HTML is parsed, before any page code.
  return <script id="consent-defaults" dangerouslySetInnerHTML={{ __html: script }} />
}

/** Loads Google Tag Manager once the page is interactive. Renders nothing without an ID. */
export function GoogleTagManager() {
  if (!validId) return null
  return (
    <Script id="google-tag-manager" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(validId)});
`}</Script>
  )
}
