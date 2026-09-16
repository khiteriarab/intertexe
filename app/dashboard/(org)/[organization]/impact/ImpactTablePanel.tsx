import type { ReactNode } from "react";

export function ImpactTablePanel({
  headers,
  rows,
  emptyMessage,
  note,
}: {
  headers: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
  emptyMessage: string;
  note?: string;
}) {
  return (
    <div className="space-y-4">
      {note ? <p className="text-sm text-[var(--ent-muted)] max-w-2xl">{note}</p> : null}
      <div className="ent-catalog-table-wrap">
        <table className="ent-trace-table ent-catalog-table">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col" className={header === "Action" ? "ent-catalog-actions" : undefined}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="text-sm text-[var(--ent-muted)] py-8 px-4">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.key}-${index}`} className={index === row.cells.length - 1 ? "ent-catalog-actions" : undefined}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
