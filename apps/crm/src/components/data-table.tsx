import { Link } from "react-router"
import { Button, buttonVariants } from "./ui/button"
import { Card } from "./ui/card"

type Row = { id: string } & Record<string, string>

/** The parts of a query result the table renders; pass a useQuery result or a derived one. */
export type TableState<T> = { data?: T[]; isPending: boolean; error: Error | null; refetch: () => unknown }

export function DataTable<T extends Row>({ query, columns, rowHref, actionLabel = "Uredi", emptyText = "Još nema stavki." }: {
  query: TableState<T>
  columns: Array<{ key: keyof T & string; label: string }>
  rowHref?: (row: T) => string
  actionLabel?: string
  emptyText?: string
}) {
  const span = columns.length + (rowHref ? 1 : 0)
  const rows = query.data ?? []
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
              {columns.map(column => <td key={column.key} className="py-4 pr-4">{row[column.key]}</td>)}
              {rowHref && (
                <td className="py-4 text-right">
                  <Link to={rowHref(row)} className={buttonVariants({ variant: "outline" })} aria-label={`${actionLabel}: ${row[columns[0].key]}`}>{actionLabel}</Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
