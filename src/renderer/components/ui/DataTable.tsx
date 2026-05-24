import { ReactNode, TableHTMLAttributes } from "react";

export function DataTable({
  children,
  className,
  ...rest
}: { children: ReactNode } & TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="data-table-wrap">
      <table className={["data-table", className].filter(Boolean).join(" ")} {...rest}>
        {children}
      </table>
    </div>
  );
}
