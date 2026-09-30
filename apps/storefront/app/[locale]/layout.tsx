import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NextIntlClientProvider } from "next-intl"
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
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", sizes: "32x32", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", media: "(prefers-color-scheme: dark)" },
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
      <body suppressHydrationWarning className="min-h-screen bg-background font-sans antialiased">
        <NextIntlClientProvider>
          <CartProvider>
            <SiteShell locale={locale}>{children}</SiteShell>
            <Toaster position="top-center" />
          </CartProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
