import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Check, Circle } from "lucide-react";
import type { ClientDashboardData, TimelinePost } from "./dashboard";
import type { TaskRow } from "@/components/dashboard/TaskList";
import { projectStatusMeta } from "@/components/dashboard/ProjectStatus";
import { formatCurrency } from "@/components/dashboard/InvoicesTable";

/**
 * Printable project report. Admin posts + tasks + project summaries,
 * all on one long page. The chrome (sidebar, header, nav) is hidden
 * when the user hits the browser print dialog so what gets printed is
 * just the summary content.
 *
 * Note: We intentionally do NOT include the Important Notes section
 * because that content often contains Wi-Fi passwords and door codes
 * — safer to keep those off a printable sheet.
 */
export default function ClientReportPage() {
  const [, navigate] = useLocation();
  const { data } = useQuery<ClientDashboardData>({ queryKey: ["/api/dashboard/client"] });
  const { data: timeline = [] } = useQuery<TimelinePost[]>({ queryKey: ["/api/timeline/client"], enabled: !!data });
  const { data: tasks = [] } = useQuery<TaskRow[]>({ queryKey: ["/api/tasks/client"], enabled: !!data });
  const { data: publicSettings } = useQuery<{ companyName?: string; logoPath?: string }>({ queryKey: ["/api/settings/public"] });

  if (!data) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md py-20 text-center text-muted-foreground">Loading report…</div>
      </AppLayout>
    );
  }

  const companyName = publicSettings?.companyName || "SD Tech Pros";
  const today = format(new Date(), "MMMM d, yyyy");

  const timelineByProject = new Map<number, TimelinePost[]>();
  for (const post of timeline) {
    if (!timelineByProject.has(post.projectId)) timelineByProject.set(post.projectId, []);
    timelineByProject.get(post.projectId)!.push(post);
  }

  const tasksByProject = new Map<number, TaskRow[]>();
  for (const task of tasks) {
    if (!tasksByProject.has(task.projectId)) tasksByProject.set(task.projectId, []);
    tasksByProject.get(task.projectId)!.push(task);
  }

  // Sort projects: in-progress first, then planning, then on-hold, then completed
  const projects = [...data.projects].sort((a, b) => {
    const order = ["in_progress", "planning", "on_hold", "completed"];
    const an = order.indexOf(a.status.toLowerCase().replace(/\s+/g, "_"));
    const bn = order.indexOf(b.status.toLowerCase().replace(/\s+/g, "_"));
    return (an === -1 ? 99 : an) - (bn === -1 ? 99 : bn);
  });

  return (
    <AppLayout>
      {/* data-printable: AppLayout containers (h-screen, overflow-hidden) are
          released only for pages that mark themselves; otherwise app pages
          wouldn't scroll on-screen. See @media print block in index.css. */}
      <div data-printable>
        {/* Screen-only toolbar */}
        <div className="no-print sticky top-0 z-20 bg-background border-b border-border">
          <div className="mx-auto max-w-[900px] px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate("/client")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to dashboard
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-4 py-8 print:max-w-none print:px-10 print:py-6 report">
        {/* Header */}
        <header className="flex items-start justify-between gap-6 border-b border-border pb-6 mb-6">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Project Report</p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">{data.client.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Prepared {today} · by {companyName}</p>
          </div>
          {publicSettings?.logoPath && (
            <img src={publicSettings.logoPath} alt={companyName} className="h-12 object-contain print:h-10" />
          )}
        </header>

        {/* Projects */}
        {projects.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No projects to report on yet.</p>
        ) : (
          <div className="space-y-8 print:space-y-6">
            {projects.map((project) => {
              const meta = projectStatusMeta(project.status);
              const projectTimeline = timelineByProject.get(project.id) ?? [];
              const projectTasks = tasksByProject.get(project.id) ?? [];
              const doneTasks = projectTasks.filter(t => t.completedAt);
              const openTasks = projectTasks.filter(t => !t.completedAt);

              return (
                <section key={project.id} className="print:break-inside-avoid">
                  {/* Project summary strip */}
                  <div className="rounded-lg border border-border bg-card p-5 print:p-4 print:bg-transparent">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[280px]">
                        <h2 className="text-xl font-semibold">{project.name}</h2>
                        {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                      </div>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <ReportStat label="Start" value={project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"} />
                      <ReportStat label="Due" value={project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"} />
                      <ReportStat label="Progress" value={`${project.progress ?? 0}%`} />
                      <ReportStat label="Budget" value={project.budget != null ? formatCurrency(project.budget) : "—"} />
                    </dl>
                  </div>

                  {/* Tasks */}
                  {projectTasks.length > 0 && (
                    <div className="mt-5 print:mt-3">
                      <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        Checklist · {doneTasks.length} of {projectTasks.length} complete
                      </h3>
                      <ul className="divide-y border rounded-lg bg-card print:bg-transparent">
                        {[...doneTasks, ...openTasks].map(task => (
                          <li key={task.id} className="px-4 py-2.5 flex items-start gap-3 print:py-1.5">
                            <span className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${task.completedAt ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                              {task.completedAt ? <Check className="h-2.5 w-2.5" /> : <Circle className="h-2 w-2 opacity-0" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${task.completedAt ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{task.description}</p>
                              )}
                              {task.completedAt && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">Completed {format(new Date(task.completedAt), "MMM d, yyyy")}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline */}
                  {projectTimeline.length > 0 && (
                    <div className="mt-5 print:mt-3">
                      <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                        Work log · {projectTimeline.length} update{projectTimeline.length === 1 ? "" : "s"}
                      </h3>
                      <div className="space-y-4 print:space-y-3">
                        {[...projectTimeline]
                          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                          .map(post => {
                            let images: string[] = [];
                            if (post.imagePaths) {
                              try { images = JSON.parse(post.imagePaths); } catch { images = []; }
                            }
                            return (
                              <article key={post.id} className="border rounded-lg p-4 bg-card print:bg-transparent print:break-inside-avoid">
                                <header className="flex items-baseline justify-between gap-3 flex-wrap">
                                  <h4 className="font-semibold">{post.title}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(post.createdAt), "MMM d, yyyy · h:mm a")}
                                    {post.authorName && ` · ${post.authorName}`}
                                  </p>
                                </header>
                                {post.notes && (
                                  <p className="text-sm whitespace-pre-wrap leading-relaxed mt-2">{post.notes}</p>
                                )}
                                {images.length > 0 && (
                                  <div className="mt-3 grid grid-cols-3 gap-2 print:grid-cols-4 print:gap-1.5">
                                    {images.slice(0, 6).map((src, i) => (
                                      <img
                                        key={i}
                                        src={src}
                                        alt=""
                                        className="aspect-[4/3] w-full object-cover rounded border"
                                        loading="lazy"
                                      />
                                    ))}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <footer className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground text-center">
          Generated {today} · {companyName}
        </footer>
        </div>
      </div>
    </AppLayout>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-sm">{value}</dd>
    </div>
  );
}
