import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { AttributionTracker } from "@/components/analytics/attribution-tracker"
import { ConsentBanner } from "@/components/analytics/consent-banner"
import { ConsentDefaults, GoogleTagManager } from "@/components/analytics/google-tag-manager"
import { MetaPixel } from "@/components/analytics/meta-pixel"
import { CartProvider } from "@/components/cart-provider"
import { SiteShell } from "@/components/site-shell"
import { Toaster } from "@/components/ui/sonner"
import { generateLocaleParams, resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getBaseUrl } from "@/lib/seo"
import "../globals.css"

// latin-ext covers the Bosnian letters č, ć, đ, š and ž.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  display: "swap",
})

const instrument = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
})

export const generateStaticParams = generateLocaleParams

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#f4eee3",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
  params,
}: Readonly<LocaleParams & { children: React.ReactNode }>) {
  const locale = await resolveLocale(params)
  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${bricolage.variable} ${instrument.variable}`}>
      <head>
        <ConsentDefaults />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider>
          <CartProvider>
            <SiteShell locale={locale}>{children}</SiteShell>
            <Toaster position="top-center" />
          </CartProvider>
          <ConsentBanner locale={locale} />
        </NextIntlClientProvider>
        <AttributionTracker />
        <GoogleTagManager />
        <MetaPixel />
      </body>
    </html>
  )
}
