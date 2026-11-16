import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isPast } from "date-fns";

export interface Invoice {
  id: number;
  invoiceNumber: string;
  projectId: number | null;
  projectName?: string;
  clientId: number;
  clientName?: string;
  amount: number;
  status: string;
  dueDate: string | null;
  description: string | null;
  freshbooksId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvoicesTableProps {
  invoices: Invoice[];
  title?: string;
  viewAllLink?: string;
  onViewAll?: () => void;
  onView?: (invoiceId: number) => void;
  /** Narrow-column layout for a dashboard rail: a short list instead of a table. */
  compact?: boolean;
  /** In compact mode, how many to show. */
  limit?: number;
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);

const formatDate = (dateString: string | null) => (dateString ? format(new Date(dateString), "MMM d, yyyy") : "N/A");

/** Status → badge. "Pending" reads as "Due <date>" so the client sees a date, not a state. */
export function InvoiceStatusBadge({ invoice }: { invoice: Invoice }) {
  const status = invoice.status.toLowerCase();
  if (status === "paid") return <Badge variant="success">Paid</Badge>;
  if (status === "overdue" || (status === "pending" && invoice.dueDate && isPast(new Date(invoice.dueDate)))) {
    return <Badge variant="danger">Overdue</Badge>;
  }
  if (status === "pending") {
    return <Badge variant="warning">{invoice.dueDate ? `Due ${format(new Date(invoice.dueDate), "MMM d")}` : "Due"}</Badge>;
  }
  return <Badge variant="secondary">{invoice.status}</Badge>;
}

export default function InvoicesTable({
  invoices,
  title = "Recent Invoices",
  viewAllLink,
  onViewAll,
  onView,
  compact = false,
  limit = 3,
}: InvoicesTableProps) {
  const viewAll = (e: React.MouseEvent) => {
    if (onViewAll) { e.preventDefault(); onViewAll(); }
  };

  if (compact) {
    const shown = invoices.slice(0, limit);
    return (
      <div className="flex flex-col gap-3">
        {shown.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-foreground/75">
            No invoices yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shown.map((invoice) => (
              <li key={invoice.id}>
                <button
                  type="button"
                  onClick={() => onView && onView(invoice.id)}
                  className="flex min-h-[44px] w-full flex-col gap-0.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-accent"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[13.5px] font-semibold">#{invoice.invoiceNumber.replace(/^#/, "")}</span>
                    <InvoiceStatusBadge invoice={invoice} />
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">{invoice.projectName || invoice.description || "Invoice"}</span>
                    <span className="font-mono text-[13.5px]">{formatCurrency(invoice.amount)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        {invoices.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-sm font-semibold">#{invoice.invoiceNumber.replace(/^#/, "")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{invoice.projectName || "N/A"}</TableCell>
                  <TableCell className="font-mono text-sm">{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell><InvoiceStatusBadge invoice={invoice} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="link" className="h-auto p-0" onClick={() => onView && onView(invoice.id)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      {viewAllLink && (
        <div className="border-t border-border bg-muted/50 px-5 py-3 text-sm">
          <a href={viewAllLink} onClick={viewAll} className="font-semibold text-primary hover:underline">
            View all invoices <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      )}
    </div>
  );
}
