import type { ReactNode } from "react"
import { Link } from "react-router"
import { Button, buttonVariants } from "./ui/button"
import { Card } from "./ui/card"

type Row = { id: string } & Record<string, string>

/** The parts of a query result the table renders; pass a useQuery result or a derived one. */
export type TableState<T> = {
  data?: T[]
  isPending: boolean
  error: Error | null
  refetch: () => unknown
  /** Set while more rows can be loaded (see usePagedList). */
  more?: { loading: boolean; error: Error | null; load: () => void }
}

export function DataTable<T extends Row>({ query, columns, rowHref, actionLabel = "Uredi", emptyText = "Još nema stavki." }: {
  query: TableState<T>
  /** `render` replaces the plain text cell, e.g. for images. */
  columns: Array<{ key: keyof T & string; label: string; render?: (row: T) => ReactNode }>
  rowHref?: (row: T) => string
  actionLabel?: string
  emptyText?: string
}) {
  const span = columns.length + (rowHref ? 1 : 0)
  const rows = query.data ?? []
  // Custom cells (e.g. images) don't make a readable name for the row's action link.
  const labelKey = (columns.find(column => !column.render) ?? columns[0]).key
  return (
    <Card className="mt-6 overflow-x-auto p-6">
      <table className="w-full text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            {columns.map(column => <th key={column.key} scope="col" className="pb-3 font-medium">{column.label}</th>)}
            {rowHref && <th scope="col" className="pb-3"><span className="sr-only">Radnje</span></th>}
          </tr>
        </thead>
        <tbody>
          {query.isPending && <tr><td colSpan={span} className="py-8 text-muted-foreground" role="status">Učitavanje…</td></tr>}
          {!query.data && query.error && (
            <tr><td colSpan={span} className="py-8">
              <p role="alert" className="text-destructive">Podatke nije moguće učitati: {query.error.message}</p>
              <Button variant="outline" className="mt-3" onClick={() => void query.refetch()}>Pokušaj ponovo</Button>
            </td></tr>
          )}
          {query.data && rows.length === 0 && <tr><td colSpan={span} className="py-8 text-muted-foreground">{emptyText}</td></tr>}
          {rows.map(row => (
            <tr key={row.id} className="border-t border-border">
              {columns.map(column => <td key={column.key} className="py-4 pr-4 align-middle">{column.render ? column.render(row) : row[column.key]}</td>)}
              {rowHref && (
                <td className="py-4 text-right">
                  <Link to={rowHref(row)} className={buttonVariants({ variant: "outline" })} aria-label={`${actionLabel}: ${row[labelKey]}`}>{actionLabel}</Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {query.more && (
        <div className="mt-4 border-t border-border pt-4 text-center">
          {query.more.error && <p role="alert" className="mb-3 text-sm text-destructive">Sljedeće stavke nije moguće učitati: {query.more.error.message}</p>}
          <Button variant="outline" disabled={query.more.loading} onClick={query.more.load}>
            {query.more.loading ? "Učitavanje…" : "Učitaj još"}
          </Button>
        </div>
      )}
    </Card>
  )
}
