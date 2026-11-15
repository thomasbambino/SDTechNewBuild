import { format } from "date-fns";
import { FileText, FileSpreadsheet, FileImage, Download } from "lucide-react";

export interface Document {
  id: number;
  name: string;
  path: string;
  type: string | null;
  size: number | null;
  projectId: number | null;
  projectName?: string;
  clientId: number | null;
  uploadedBy: number | null;
  uploaderName?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsListProps {
  documents: Document[];
  title?: string;
  viewAllLink?: string;
  onViewAll?: () => void;
  onDownload?: (document: Document) => void;
  /** Rail layout: no card chrome, short list. */
  compact?: boolean;
  limit?: number;
}

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (/\.(xlsx|xls|csv)$/.test(n)) return <FileSpreadsheet className="h-4 w-4" />;
  if (/\.(jpe?g|png|gif|svg|heic|webp)$/.test(n)) return <FileImage className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function kindOf(name: string) {
  const ext = name.split(".").pop();
  return ext && ext.length <= 5 ? ext.toUpperCase() : "File";
}

export default function DocumentsList({
  documents,
  title = "Project Documents",
  viewAllLink,
  onViewAll,
  onDownload,
  compact = false,
  limit = 4,
}: DocumentsListProps) {
  const shown = compact ? documents.slice(0, limit) : documents;

  const list = shown.length === 0 ? (
    <p className="text-[14px] leading-relaxed text-foreground/75">
      {compact ? "Quotes, camera maps and manuals land here as the job goes." : "No documents yet."}
    </p>
  ) : (
    <ul className="flex flex-col gap-1">
      {shown.map((document) => (
        <li key={document.id}>
          <button
            type="button"
            onClick={() => onDownload && onDownload(document)}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-accent"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
              {iconFor(document.name)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-semibold">{document.name}</span>
              <span className="text-[12.5px] text-muted-foreground">
                {kindOf(document.name)} · {format(new Date(document.createdAt), "MMM d")}
                {!compact && document.projectName ? ` · ${document.projectName}` : ""}
              </span>
            </span>
            <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );

  if (compact) return list;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
      </div>
      <div className="p-4">
        {list}
        {viewAllLink && (
          <div className="mt-4 px-1">
            <a
              href={viewAllLink}
              onClick={(e) => { if (onViewAll) { e.preventDefault(); onViewAll(); } }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all documents <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
