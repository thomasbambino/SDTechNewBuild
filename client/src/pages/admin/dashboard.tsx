import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, formatDistanceToNow, isPast } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Activity } from "@/components/dashboard/ActivityFeed";
import { Inquiry } from "@/components/dashboard/InquiriesList";
import { Project } from "@/components/dashboard/ProjectsTable";
import { projectStatusMeta } from "@/components/dashboard/ProjectStatus";
import { formatCurrency } from "@/components/dashboard/InvoicesTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, FileText, MessageSquare, ChevronRight, Camera, RefreshCw } from "lucide-react";
import { describeActivity, shortRelativeTime } from "@/lib/describeActivity";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AdminDashboardData {
  stats: {
    activeProjects: number;
    totalClients: number;
    outstandingInvoices: number;
    newInquiriesCount: number;
    openTasksCount: number;
  };
  recentActivities: Activity[];
  pendingInquiries: Inquiry[];
  recentProjects: (Project & { clientName: string | null })[];
  recentPhotos: RecentPhoto[];
}

export interface RecentPhoto {
  url: string;
  projectName: string | null;
  clientName: string | null;
  postTitle: string;
  createdAt: string;
  milestoneId: number;
  projectId: number;
}

/* ------------------------------------------------------------------ */
/* Container                                                           */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<AdminDashboardData>({ queryKey: ["/api/dashboard/admin"] });
  const { data: unread } = useQuery<{ count: number }>({ queryKey: ["/api/messages/unread-count"], refetchInterval: 30000 });

  return (
    <AppLayout>
      {isLoading ? (
        <AdminHomeSkeleton />
      ) : isError || !data ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
          <p className="font-display text-2xl font-semibold">Couldn't load the dashboard.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <AdminHomeView data={data} unreadMessages={unread?.count ?? 0} onRefresh={() => refetch()} refreshing={isFetching} />
      )}
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function AdminHomeView({ data, unreadMessages, onRefresh, refreshing = false, userName }: {
  data: AdminDashboardData;
  unreadMessages: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  userName?: string;
}) {
  const [, navigate] = useLocation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const firstName = userName?.split(" ")[0];

  const needs: { key: string; icon: React.ReactNode; tone: string; title: string; detail: string; count?: number; to: string }[] = [];
  if (data.pendingInquiries.length > 0) {
    needs.push({
      key: "inq", icon: <Inbox className="h-5 w-5" />, tone: "bg-primary-soft text-primary-soft-foreground",
      title: `${data.pendingInquiries.length} new quote request${data.pendingInquiries.length === 1 ? "" : "s"}`,
      detail: data.pendingInquiries.slice(0, 2).map(i => i.name).join(" · "),
      to: "/admin/inquiries",
    });
  }
  if (data.stats.outstandingInvoices > 0) {
    needs.push({
      key: "inv", icon: <FileText className="h-5 w-5" />, tone: "bg-warning-soft text-warning-soft-foreground",
      title: `${formatCurrency(data.stats.outstandingInvoices)} outstanding`,
      detail: "Across pending and overdue invoices",
      to: "/admin/invoices",
    });
  }
  if (unreadMessages > 0) {
    needs.push({
      key: "msg", icon: <MessageSquare className="h-5 w-5" />, tone: "bg-primary-soft text-primary-soft-foreground",
      title: `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`,
      detail: "Unread client messages",
      count: unreadMessages,
      to: "/admin/messages",
    });
  }

  const active = data.recentProjects.filter(p => p.status.toLowerCase().replace(/\s+/g, "_") !== "completed");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{format(new Date(), "EEE MMM d")} · Admin</p>
          <h1 className="text-3xl sm:text-4xl">{greeting}{firstName ? `, ${firstName}` : ""}.</h1>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Refresh" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button onClick={() => navigate("/admin/clients")}>
            <Camera className="h-4 w-4" />
            Post an update
          </Button>
        </div>
      </div>

      {/* At-a-glance stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Active jobs"        value={String(data.stats.activeProjects)}                        onClick={() => navigate("/admin/projects")} />
        <Stat label="Open tasks"         value={String(data.stats.openTasksCount)}                        onClick={() => navigate("/admin/projects")} />
        <Stat label="Outstanding"        value={formatCurrency(data.stats.outstandingInvoices)}           onClick={() => navigate("/admin/invoices")} />
        <Stat label="Clients"            value={String(data.stats.totalClients)}                          onClick={() => navigate("/admin/clients")} />
      </div>

      {/* Recent photos strip */}
      {data.recentPhotos.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-label="Recent photos">
          <div className="flex items-center justify-between">
            <SectionLabel>From the field</SectionLabel>
            <span className="text-[12.5px] text-muted-foreground">{data.recentPhotos.length} latest</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {data.recentPhotos.map((p) => (
              <button
                key={`${p.milestoneId}-${p.url}`}
                type="button"
                onClick={() => navigate(`/admin/projects/${p.projectId}`)}
                title={`${p.clientName ? p.clientName + " · " : ""}${p.postTitle}`}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-left text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 truncate">
                  {p.clientName ?? p.projectName}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-7 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-7">
          {/* Needs you */}
          <section className="flex flex-col gap-2.5" aria-label="Needs you">
            <SectionLabel>{needs.length > 0 ? `Needs you · ${needs.length}` : "Needs you"}</SectionLabel>
            {needs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-input bg-card px-5 py-6 text-[14.5px] text-foreground/75">
                Nothing pending. Quote requests, unread messages and unpaid invoices show up here.
              </div>
            ) : (
              needs.map(n => (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => navigate(n.to)}
                  className="flex min-h-[64px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:bg-accent/60"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${n.tone}`}>{n.icon}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold leading-tight">{n.title}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{n.detail}</span>
                  </span>
                  {n.count ? (
                    <Badge className="h-5 px-2">{n.count}</Badge>
                  ) : (
                    <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </section>

          {/* Active jobs */}
          <section className="flex flex-col gap-2.5" aria-label="Active jobs">
            <div className="flex items-center justify-between">
              <SectionLabel>Active jobs · {data.stats.activeProjects}</SectionLabel>
              <button type="button" onClick={() => navigate("/admin/projects")} className="text-[13px] font-semibold text-primary hover:underline">All projects</button>
            </div>
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-input bg-card px-5 py-6 text-[14.5px] text-foreground/75">
                No open jobs. New projects appear here with their progress.
              </div>
            ) : (
              active.slice(0, 5).map(p => {
                const meta = projectStatusMeta(p.status);
                const progress = Math.max(0, Math.min(100, p.progress ?? 0));
                const due = p.dueDate ? new Date(p.dueDate) : null;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/admin/projects/${p.id}`)}
                    className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-left shadow-sm hover:bg-accent/60"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-semibold">{p.name}</span>
                        {p.clientName && <span className="truncate text-[12.5px] text-muted-foreground">{p.clientName}</span>}
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </span>
                      <span className="font-mono text-[12px] text-muted-foreground">{progress}%</span>
                      {due && (
                        <span className={`text-[12.5px] ${isPast(due) && progress < 100 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                          Due {format(due, "MMM d")}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </section>
        </div>

        {/* Recent activity */}
        <section className="flex flex-col gap-2.5" aria-label="Recent activity">
          <div className="flex items-center justify-between">
            <SectionLabel>Recent activity</SectionLabel>
            <button type="button" onClick={() => navigate("/admin/activities")} className="text-[13px] font-semibold text-primary hover:underline">Audit log</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {data.recentActivities.length === 0 ? (
              <p className="px-4 py-6 text-[14.5px] text-foreground/75">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentActivities.map(a => {
                  const described = describeActivity(a);
                  return (
                    <li key={a.id} className="flex gap-3 px-4 py-3 text-[13.5px]">
                      <span className="w-[56px] shrink-0 pt-px text-[12.5px] text-muted-foreground">
                        {shortRelativeTime(a.createdAt)}
                      </span>
                      <span className="min-w-0 text-foreground/85">
                        {described.actor && <span className="font-semibold text-foreground">{described.actor}</span>}
                        {described.actor && " "}
                        <span>{described.verb}</span>
                        {described.object && (
                          <> <span className="font-medium text-foreground">{described.object}</span></>
                        )}
                        {described.suffix && <span> {described.suffix}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h2>;
}

function Stat({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start gap-0.5 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm hover:bg-accent/60">
      <span className="font-display text-3xl font-bold leading-none">{value}</span>
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
    </button>
  );
}


function AdminHomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-9 w-64" /></div>
      <div className="grid gap-7 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
