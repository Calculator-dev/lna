// All amounts are integers in feninga (1/100 KM), named *Minor, so a value is never
// mistaken for whole KM.

/** "1.234 KM" / "12,50 KM" in Bosnian, "BAM 1,234" / "BAM 12.50" in English. */
export function formatKM(minor: number, locale: "bs" | "en") {
  const fraction = minor % 100 === 0 ? 0 : 2
  const value = new Intl.NumberFormat(locale === "bs" ? "bs-BA" : "en-GB", { minimumFractionDigits: fraction, maximumFractionDigits: fraction }).format(minor / 100)
  return locale === "bs" ? `${value} KM` : `BAM ${value}`
}
