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
import { Wordmark } from "@/components/wordmark";

const otherLocale: Record<Locale, Locale> = { bs: "en", en: "bs" };

export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
      <div className="bg-primary px-3 py-2 text-primary-foreground">
        <div className="mx-auto flex max-w-375 items-center justify-center gap-4 text-center text-[11px] font-medium tracking-[0.04em] sm:text-xs">
          <span className="ornament hidden w-20 opacity-40 sm:block" aria-hidden />
          {t("freeDelivery", { amount: String(shippingPolicy.freeFrom) })}
          <span className="ornament hidden w-20 opacity-40 sm:block" aria-hidden />
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-375 items-center gap-3 px-4 md:h-20 md:px-6">
          <button
            type="button"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary xl:hidden"
            aria-label={t("openMenu")}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.6} />
          </button>
          <Link href={buildPath(locale)} aria-label={siteName} className="shrink-0 text-foreground">
            <Wordmark />
          </Link>

          <nav className="mx-auto hidden items-center gap-1 xl:flex" aria-label={t("mainNavigation")}>
            {navLinks.map((item) => {
              const itemPath = `${localePrefix}${item.href.split("?")[0]}`;
              const active = !item.href.includes("?") && pathname === itemPath;
              return (
                <Link
                  key={item.href}
                  href={`${localePrefix}${item.href}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-[13.5px] font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground",
                    active && "bg-foreground text-background hover:bg-foreground hover:text-background",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <HeaderActions
            locale={locale}
            totalItems={totalItems}
            onCartOpen={() => setOpen(true)}
            searchOpen={searchOpen}
            onSearchToggle={() => {
              const opening = !searchOpen;
              setSearchOpen(opening);
              // Wait for the bar to become visible before moving focus into it.
              if (opening) requestAnimationFrame(() => document.getElementById("site-search-bar")?.focus());
            }}
            className="ml-auto xl:ml-0"
          />
        </div>

        <div className={cn("border-t border-border/60 px-4 py-3 md:px-6", searchOpen ? "md:block" : "md:hidden")}>
          <div className="mx-auto max-w-2xl">
            <SearchForm action={shopHref} id="bar" />
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-60 transition-opacity xl:hidden",
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
          className="absolute inset-0 bg-walnut/50"
          onClick={() => setMenuOpen(false)}
        />
        <aside
          ref={menuPanel}
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className={cn(
            "absolute inset-y-0 left-0 flex w-[90%] max-w-sm flex-col rounded-r-3xl bg-background transition-transform duration-300",
            menuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-5 py-5">
            <Link
              href={buildPath(locale)}
              onClick={() => setMenuOpen(false)}
              aria-label={siteName}
            >
              <Wordmark />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={t("closeMenu")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            >
              <X className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>
          <span className="ornament mx-5 text-accent" aria-hidden />
          <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            {navLinks.map((item, index) => (
              <Link
                key={item.href}
                href={`${localePrefix}${item.href}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-baseline gap-4 border-b border-border/70 py-3.5 font-serif text-[28px] leading-tight transition-colors hover:text-primary"
              >
                <span className="w-6 font-sans text-xs font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="m-4 rounded-2xl bg-primary p-5 text-sm leading-6 text-primary-foreground/85">
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
        "flex h-11 w-full items-center rounded-full border border-input bg-card pl-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
        className,
      )}
    >
      <label htmlFor={`site-search-${id}`} className="sr-only">
        {t("searchLabel")}
      </label>
      <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} aria-hidden />
      <input
        id={`site-search-${id}`}
        name="q"
        type="search"
        placeholder={t("searchLabel")}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="mr-1 h-9 rounded-full bg-foreground px-4 text-xs font-semibold text-background transition-colors hover:bg-foreground/85"
      >
        {t("searchButton")}
      </button>
    </form>
  );
}

function HeaderActions({
  locale,
  totalItems,
  onCartOpen,
  searchOpen,
  onSearchToggle,
  className,
}: {
  locale: Locale;
  totalItems: number;
  onCartOpen: () => void;
  searchOpen: boolean;
  onSearchToggle: () => void;
  className?: string;
}) {
  const common = useTranslations("common");
  const t = useTranslations("header");
  return (
    <div
      className={cn("flex items-center justify-end gap-1 sm:gap-1.5", className)}
    >
      <button
        type="button"
        onClick={onSearchToggle}
        aria-expanded={searchOpen}
        aria-label={t("searchLabel")}
        className={cn(
          "hidden h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-secondary md:flex",
          searchOpen && "bg-secondary",
        )}
      >
        {searchOpen ? <X className="h-4.5 w-4.5" strokeWidth={1.6} /> : <Search className="h-4.5 w-4.5" strokeWidth={1.6} />}
      </button>
      {/* The query string is only known client-side; static pages render the plain path first. */}
      <Suspense fallback={<LanguageLink locale={locale} />}>
        <LanguageLinkWithQuery locale={locale} />
      </Suspense>
      <button
        type="button"
        onClick={onCartOpen}
        className="relative ml-1 flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-3.5 text-background transition-colors hover:bg-foreground/85 sm:px-4"
        aria-label={`${common("cart")} (${totalItems})`}
      >
        <ShoppingBag className="h-4.5 w-4.5" strokeWidth={1.6} />
        <span className="hidden text-sm font-semibold sm:inline">
          {common("cart")}
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
          {totalItems}
        </span>
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
      className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-border px-3 text-xs font-semibold tracking-[0.12em] text-foreground transition-colors hover:border-foreground"
    >
      {t("switchLanguage")}
    </Link>
  );
}
