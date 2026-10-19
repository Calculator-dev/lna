/** Amounts from the API are in feninga (1/100 KM). */
export const formatMoney = (minor: number) =>
  new Intl.NumberFormat("bs-BA", { style: "currency", currency: "BAM" }).format(minor / 100)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("bs-BA", { dateStyle: "medium" }).format(new Date(value))

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("bs-BA", { dateStyle: "long", timeStyle: "short" }).format(new Date(value))
