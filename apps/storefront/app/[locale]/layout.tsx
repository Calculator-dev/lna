import type { Metadata, Viewport } from "next"
import { Inter, Fraunces } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { NextIntlClientProvider } from "next-intl"
import { CartProvider } from "@/components/cart-provider"
import { SiteShell } from "@/components/site-shell"
import { Toaster } from "@/components/ui/sonner"
import { generateLocaleParams, resolveLocale, type LocaleParams } from "@/lib/locale-params"
import { getBaseUrl } from "@/lib/seo"
import "../globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
  themeColor: "#f6efe3",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
  params,
}: Readonly<LocaleParams & { children: React.ReactNode }>) {
  const locale = await resolveLocale(params)
  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
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
