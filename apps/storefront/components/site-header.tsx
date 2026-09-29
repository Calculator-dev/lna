"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useModalPanel } from "@/hooks/use-modal-panel";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart-provider";
import { CartDrawer } from "@/components/cart-drawer";
import { alternateLocalePath, buildPath, siteName, type Locale } from "@/lib/products";
import { cn } from "@/lib/utils";

const otherLocale: Record<Locale, Locale> = { bs: "en", en: "bs" };

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanel = useModalPanel<HTMLElement>(menuOpen, () => setMenuOpen(false));
  const { totalItems, setOpen, shippingPolicy } = useCart();
  const t = useTranslations("header");
  const common = useTranslations("common");
  const navLinks = [
    { href: "/shop", label: t("nav.allProducts") },
    { href: "/shop?material=wood", label: common("materials.wood") },
    { href: "/shop?material=resin", label: common("materials.resin") },
    { href: "/shop?type=custom", label: t("nav.customizable") },
    { href: "/custom", label: t("nav.customWork") },
    { href: "/about", label: t("nav.about") },
  ];
  const localePrefix = locale === "en" ? "/en" : "";
  const shopHref = `${localePrefix}/shop`;

  return (
    <>
      <div className="bg-black px-3 py-2 text-center text-[9px] font-medium uppercase tracking-[0.14em] text-white sm:text-[11px] sm:tracking-[0.2em]">
        {t("freeDelivery", { amount: String(shippingPolicy.freeFrom) })}
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid h-17 max-w-375 grid-cols-[1fr_auto] items-center gap-3 px-4 md:h-19 md:grid-cols-[220px_1fr] md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center lg:hidden"
              aria-label={t("openMenu")}
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <Link
              href={buildPath(locale)}
              className="text-xl font-black uppercase tracking-tighter text-foreground sm:text-2xl md:text-[26px]"
            >
              {siteName}
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:justify-evenly md:gap-6">
            <div className="w-full max-w-140">
              <SearchForm action={shopHref} id="desktop" />
            </div>
            <HeaderActions
              locale={locale}
              totalItems={totalItems}
              onCartOpen={() => setOpen(true)}
              className="shrink-0"
            />
          </div>

          <HeaderActions
            locale={locale}
            totalItems={totalItems}
            onCartOpen={() => setOpen(true)}
            className="md:hidden"
          />
        </div>

        <div className="border-t border-border/60 px-4 py-3 md:hidden">
          <SearchForm action={shopHref} id="mobile" />
        </div>

        <nav
          className="hidden border-t border-border/60 lg:block"
          aria-label={t("mainNavigation")}
        >
          <div className="mx-auto flex h-12 max-w-375 items-center justify-center gap-8 px-6 xl:gap-11">
            {navLinks.map((item) => {
              const itemPath = `${localePrefix}${item.href.split("?")[0]}`;
              const active = !item.href.includes("?") && pathname === itemPath;
              return (
                <Link
                  key={item.href}
                  href={`${localePrefix}${item.href}`}
                  className={cn(
                    "relative flex h-full items-center text-[13px] font-medium text-foreground/80 transition-colors hover:text-foreground",
                    active &&
                      "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-60 transition-opacity lg:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        inert={!menuOpen}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="absolute inset-0 bg-foreground/40"
          onClick={() => setMenuOpen(false)}
        />
        <aside
          ref={menuPanel}
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[90%] max-w-sm flex-col bg-background transition-transform duration-300",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-5">
            <Link
              href={buildPath(locale)}
              onClick={() => setMenuOpen(false)}
              className="text-xl font-black uppercase tracking-tighter"
            >
              {siteName}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={t("closeMenu")}
              className="flex h-10 w-10 items-center justify-center"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="border-b border-border p-5">
            <SearchForm
              action={shopHref}
              onSubmit={() => setMenuOpen(false)}
              id="drawer"
            />
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={`${localePrefix}${item.href}`}
                onClick={() => setMenuOpen(false)}
                className="border-b border-border/60 py-4 text-base font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border p-5 text-xs leading-6 text-muted-foreground">
            {t("tagline")}
          </div>
        </aside>
      </div>

      <CartDrawer locale={locale} />
    </>
  );
}

function SearchForm({
  action,
  className,
  onSubmit,
  id,
}: {
  action: string;
  className?: string;
  onSubmit?: () => void;
  id: string;
}) {
  const t = useTranslations("header");
  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className={cn(
        "flex h-10 w-full items-center border border-border bg-[#f7f7f5] transition-colors focus-within:border-foreground",
        className,
      )}
    >
      <label htmlFor={`site-search-${id}`} className="sr-only">
        {t("searchLabel")}
      </label>
      <input
        id={`site-search-${id}`}
        name="q"
        type="search"
        placeholder={t("searchLabel")}
        className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="flex h-full w-11 items-center justify-center"
        aria-label={t("searchButton")}
      >
        <Search className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </form>
  );
}

function HeaderActions({
  locale,
  totalItems,
  onCartOpen,
  className,
}: {
  locale: Locale;
  totalItems: number;
  onCartOpen: () => void;
  className?: string;
}) {
  const common = useTranslations("common");
  return (
    <div
      className={cn("flex items-center justify-end gap-1 sm:gap-2", className)}
    >
      {/* The query string is only known client-side; static pages render the plain path first. */}
      <Suspense fallback={<LanguageLink locale={locale} />}>
        <LanguageLinkWithQuery locale={locale} />
      </Suspense>
      <button
        type="button"
        onClick={onCartOpen}
        className="relative flex h-10 items-center justify-center gap-2 px-2 sm:px-3"
        aria-label={common("cart")}
      >
        <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
        <span className="hidden text-sm font-medium md:inline">
          {common("cart")}
        </span>
        <span className="hidden text-sm md:inline">({totalItems})</span>
        {totalItems > 0 && (
          <span className="absolute right-0 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-[10px] text-white md:hidden">
            {totalItems}
          </span>
        )}
      </button>
    </div>
  );
}

function LanguageLinkWithQuery({ locale }: { locale: Locale }) {
  return <LanguageLink locale={locale} search={useSearchParams().toString()} />;
}

function LanguageLink({ locale, search }: { locale: Locale; search?: string }) {
  const pathname = usePathname();
  const t = useTranslations("header");
  return (
    <Link
      href={alternateLocalePath(pathname, search)}
      hrefLang={otherLocale[locale]}
      className="inline-flex h-10 items-center justify-center px-2 text-xs font-medium tracking-[0.16em] text-foreground transition-opacity hover:opacity-60 sm:px-3"
    >
      {t("switchLanguage")}
    </Link>
  );
}
