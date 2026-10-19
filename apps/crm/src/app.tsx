import { useEffect, useRef } from "react"
import { Link, NavLink, Outlet, useLocation, type RouteObject } from "react-router"
import { Boxes, LayoutDashboard, MessageSquareMore, ShoppingCart } from "lucide-react"
import { PageHeader } from "./components/page-header"
import { DashboardPage } from "./pages/dashboard"
import { InquiriesPage, InquiryPage } from "./pages/inquiries"
import { OrderPage, OrdersPage } from "./pages/orders"
import { EditProductPage, NewProductPage } from "./pages/product-editor"
import { ProductsPage } from "./pages/products"

const navigation = [
  { to: "/", label: "Pregled", icon: LayoutDashboard },
  { to: "/products", label: "Proizvodi", icon: Boxes },
  { to: "/orders", label: "Narudžbe", icon: ShoppingCart },
  { to: "/inquiries", label: "Upiti", icon: MessageSquareMore },
] as const

function Layout() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)
  // Move focus to the new page's title so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo(0, 0)
    document.getElementById("page-title")?.focus()
  }, [pathname])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-border bg-card/70 p-5">
          <Link to="/" className="flex items-center gap-3" aria-label="LNA kreativna sehara CRM">
            <img src="/logo.png" alt="" width={390} height={225} className="h-12 w-auto" />
            <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">CRM</span>
          </Link>
          <nav aria-label="Glavna navigacija" className="mt-8 space-y-2">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) => `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="Greška 404" title="Stranica nije pronađena" description="Adresa ne postoji ili je stranica premještena." />
      <Link to="/" className="mt-6 inline-block text-sm underline underline-offset-4">Nazad na pregled</Link>
    </>
  )
}

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <NewProductPage /> },
      { path: "products/:id/edit", element: <EditProductPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "orders/:id", element: <OrderPage /> },
      { path: "inquiries", element: <InquiriesPage /> },
      { path: "inquiries/:id", element: <InquiryPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]
