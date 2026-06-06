import { ReactNode, TableHTMLAttributes } from "react";

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  /**
   * Optional explicit column widths (CSS length strings; `undefined` = auto).
   * The table is `table-layout: fixed`, so a <colgroup> here lets callers stop
   * equal-width columns from starving wide data columns (e.g. a 10px dot column).
   */
  colWidths?: (string | undefined)[];
}

export function DataTable({ children, className, colWidths, ...rest }: DataTableProps) {
  return (
    <div className="data-table-wrap">
      <table className={["data-table", className].filter(Boolean).join(" ")} {...rest}>
        {colWidths && (
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={i} style={w ? { width: w } : undefined} />
            ))}
          </colgroup>
        )}
        {children}
      </table>
    </div>
  );
}
