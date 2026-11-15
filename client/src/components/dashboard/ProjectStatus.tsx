import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";

export interface ProjectDetails {
  id: number;
  name: string;
  description: string | null;
  clientId: number;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  budget: number | null;
  progress: number;
  freshbooksId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStatusProps {
  project: ProjectDetails;
  onViewDetails?: (projectId: number) => void;
}

/** Status → label + badge tint. Blue is "happening", green is "done", grey is "not yet". */
export function projectStatusMeta(status: string): { label: string; variant: "info" | "success" | "warning" | "secondary" } {
  switch (status.toLowerCase().replace(/\s+/g, "_")) {
    case "in_progress": return { label: "In progress", variant: "info" };
    case "completed": return { label: "Complete", variant: "success" };
    case "on_hold": return { label: "On hold", variant: "warning" };
    case "planning": return { label: "Scheduled", variant: "secondary" };
    default: return { label: status, variant: "secondary" };
  }
}

const fmtDate = (d: string | null) => (d ? format(new Date(d), "MMM d") : null);

export default function ProjectStatus({ project, onViewDetails }: ProjectStatusProps) {
  const meta = projectStatusMeta(project.status);
  const progress = Math.max(0, Math.min(100, project.progress ?? 0));
  const start = fmtDate(project.startDate);
  const due = fmtDate(project.dueDate);
  const isDone = meta.variant === "success";

  const whenLine = isDone
    ? due ? `Finished ${due}` : "Finished"
    : progress === 0 && start
      ? `Starts ${start}`
      : due
        ? `Due ${due}`
        : start
          ? `Started ${start}`
          : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold leading-tight">{project.name}</p>
          {whenLine && <p className="mt-0.5 text-[13px] text-muted-foreground">{whenLine}</p>}
        </div>
        <Badge variant={meta.variant} className="shrink-0">{meta.label}</Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold">{isDone ? "All done" : progress === 0 ? "Not started" : "Progress"}</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${isDone ? "bg-success" : "bg-primary"}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      {project.description && (
        <p className="line-clamp-2 text-[13.5px] leading-snug text-foreground/75">{project.description}</p>
      )}
      {onViewDetails && (
        <button
          type="button"
          onClick={() => onViewDetails(project.id)}
          className="inline-flex min-h-[32px] items-center gap-1 self-start text-[13.5px] font-semibold text-primary hover:underline"
        >
          Details <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
