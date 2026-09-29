export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("bs-BA", { style: "currency", currency: "BAM" }).format(amount)

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("bs-BA", { dateStyle: "medium" }).format(new Date(value))

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("bs-BA", { dateStyle: "long", timeStyle: "short" }).format(new Date(value))
