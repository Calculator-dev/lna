import { formatDate, formatMoney } from "./format";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customer: string;
  status: string;
  amount: number;
  createdAt: string;
};
export type AdminDashboard = {
  totals: {
    ordersToday: number;
    awaitingReview: number;
    productionQueued: number;
    inquiriesLast30Days: number;
    productsActive: number;
  };
  recentOrders: AdminOrder[];
};
export type AdminProduct = {
  id?: string;
  sku: string;
  type: string;
  price: number;
  translations: Record<string, { name: string }>;
};
const productType = (type: string) =>
  type === "custom"
    ? "Personalizirani"
    : type === "standard"
      ? "Standardni"
      : type;
const orderStatuses: Record<string, string> = {
  submitted: "Zaprimljena",
  confirmed: "Prihvaćena",
  declined: "Odbijena",
  processing: "U obradi",
  production: "U proizvodnji",
  in_production: "U proizvodnji",
  packed: "Spakovana",
  shipped: "Poslana",
  completed: "Završena",
  cancelled: "Otkazana",
};
const orderStatus = (status: string) =>
  orderStatuses[status.toLowerCase()] ?? status;
export function orderRows(orders: AdminOrder[]) {
  return orders.map((order) => ({
    ...order,
    status: orderStatus(order.status),
    amount: formatMoney(order.amount),
    createdAt: formatDate(order.createdAt),
  }));
}
export const localizedOrderStatus = orderStatus;
export function dashboardView(data: AdminDashboard) {
  return {
    totals: [
      { label: "Današnje narudžbe", value: String(data.totals.ordersToday) },
      { label: "Čeka pregled", value: String(data.totals.awaitingReview) },
      {
        label: "Čeka proizvodnju",
        value: String(data.totals.productionQueued),
      },
      { label: "Upiti (30 dana)", value: String(data.totals.inquiriesLast30Days) },
      { label: "Proizvodi u katalogu", value: String(data.totals.productsActive) },
    ],
    recentOrders: orderRows(data.recentOrders),
  };
}
export function productRows(products: AdminProduct[]) {
  return products.map((product) => ({
    id: product.id ?? "",
    sku: product.sku,
    name:
      product.translations.bs?.name ??
      product.translations.en?.name ??
      product.sku,
    type: productType(product.type),
    price: formatMoney(product.price),
  }));
}

export type ProductDetails = AdminProduct & {
  media?: ProductImage[];
  id: string;
  categoryId: string;
  material: string;
  dimensions: string;
  featured: boolean;
  customizable: boolean;
  leadTime: Record<string, string>;
  stockLabel: Record<string, string>;
  variants?: ProductVariant[];
  translations: Record<
    string,
    {
      name: string;
      tagline: string;
      shortDescription: string;
      description: string;
      slug: string;
    }
  >;
};

export type ProductVariant = {
  id: string;
  sku: string;
  dimensions: string;
  price: number;
  active?: boolean;
  isDefault?: boolean;
};

export type ProductImage = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: { bs: string; en: string };
  isPrimary: boolean;
};

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  locale: "bs" | "en";
  status: string;
  paymentStatus: string;
  customer: { fullName: string; email: string; phone: string | null };
  shippingAddress: {
    address: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  notes: string | null;
  declineReason: string | null;
  reviewedAt: string | null;
  reviewEmailSentAt: string | null;
  confirmationEmailSentAt: string | null;
  createdAt: string;
  subtotal: number;
  shippingAmount: number;
  amount: number;
  items: Array<{
    id: string;
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    personalization: string | null;
  }>;
};

export type OrderDecisionResult = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    declineReason: string | null;
    reviewedAt: string | null;
    reviewEmailSentAt: string | null;
  };
  notification:
    | { sent: true }
    | { sent: false; reason: "not_configured" | "delivery_failed" };
};

export type AdminInquiry = {
  id: string;
  fullName: string;
  email: string;
  brief: string;
  deadline: string | null;
  createdAt: string;
};
export type AdminInquiryDetail = AdminInquiry & {
  locale: "bs" | "en";
  phone: string | null;
  dimensions: string | null;
};
export function inquiryRows(inquiries: AdminInquiry[]) {
  return inquiries.map((inquiry) => ({
    id: inquiry.id,
    fullName: inquiry.fullName,
    email: inquiry.email,
    brief: inquiry.brief.length > 90 ? `${inquiry.brief.slice(0, 90).trimEnd()}…` : inquiry.brief,
    deadline: inquiry.deadline ?? "—",
    createdAt: formatDate(inquiry.createdAt),
  }));
}
