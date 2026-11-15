import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import ProjectStatus, { ProjectDetails } from "@/components/dashboard/ProjectStatus";
import InvoicesTable, { Invoice, formatCurrency } from "@/components/dashboard/InvoicesTable";
import DocumentsList, { Document } from "@/components/dashboard/DocumentsList";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";
import NoteCard, { NoteData } from "@/components/dashboard/NoteCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, Check, Clock, MessageSquare, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ClientDashboardData {
  client: { id: number; name: string; contactPerson: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; userId: number | null; freshbooksId: string | null; createdAt: string; updatedAt: string };
  projects: ProjectDetails[];
  invoices: Invoice[];
  documents: Document[];
}

export interface TimelinePost {
  id: number;
  projectId: number;
  projectName: string | null;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  authorName: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface ClientNote extends NoteData {
  clientId: number;
  isPinned: boolean;
}

/* ------------------------------------------------------------------ */
/* Container: fetches, then renders the view                           */
/* ------------------------------------------------------------------ */

export default function ClientDashboard() {
  const { data, isLoading, isError, refetch } = useQuery<ClientDashboardData>({ queryKey: ["/api/dashboard/client"] });
  const { data: clientNotes = [] } = useQuery<ClientNote[]>({ queryKey: ["/api/client-notes"], enabled: !!data });
  const { data: timeline = [] } = useQuery<TimelinePost[]>({ queryKey: ["/api/timeline/client"], enabled: !!data });

  return (
    <AppLayout>
      {isLoading ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
          <p className="font-display text-2xl font-semibold">We couldn't load your dashboard.</p>
          <p className="text-sm text-muted-foreground">Usually a blip. Try again, and message your tech if it keeps happening.</p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <ClientDashboardView data={data} timeline={timeline} notes={clientNotes} />
      )}
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* View: everything visual. Pure props, so it can be previewed.        */
/* ------------------------------------------------------------------ */

export function ClientDashboardView({ data, timeline, notes }: { data: ClientDashboardData; timeline: TimelinePost[]; notes: ClientNote[] }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleDocumentDownload = (doc: Document) => {
    toast({ title: "Download started", description: `Downloading ${doc.name}…` });
    window.open(doc.path, "_blank");
  };

  const timelineItems: TimelineItem[] = [
    ...data.projects.map(p => ({
      id: `start-${p.id}`,
      type: "start" as const,
      date: p.startDate || p.createdAt,
      title: `Project started: ${p.name}`,
      notes: p.description,
      images: [] as string[],
      projectName: p.name,
      authorName: null,
    })),
    ...timeline.map(m => ({
      id: `milestone-${m.id}`,
      type: "milestone" as const,
      date: m.createdAt,
      title: m.title,
      notes: m.notes,
      images: m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [],
      projectName: m.projectName,
      authorName: m.authorName,
      engagement: { milestoneId: m.id, likeCount: m.likeCount, commentCount: m.commentCount, likedByMe: m.likedByMe },
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Day one: no posts from the tech yet (project kickoff rows alone don't count).
  const isEmpty = timeline.length === 0;
  const techName = timeline.find(t => t.authorName)?.authorName ?? null;
  const activeProject = data.projects.find(p => p.status.toLowerCase().replace(/\s+/g, "_") === "in_progress") ?? data.projects[0] ?? null;
  const nextStart = data.projects
    .map(p => p.startDate)
    .filter((d): d is string => !!d && new Date(d).getTime() > Date.now())
    .sort()[0] ?? null;

  const unpaid = data.invoices
    .filter(i => i.status.toLowerCase() !== "paid")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const dueNow = unpaid[0] ?? null;

  const pinnedNotes = [...notes].sort((a, b) => Number(!!b.isPinned) - Number(!!a.isPinned)).slice(0, 2);
  const recentInvoices = [...data.invoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recentDocuments = [...data.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const headline = isEmpty
    ? nextStart ? `Welcome. Your first visit is ${format(new Date(nextStart), "EEEE")}.` : "Welcome. We'll post here from the first visit."
    : "Here's where things stand.";

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 py-7 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {data.client.name}{techName ? ` · Your tech: ${techName.split(" ")[0]}` : ""}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-none">{headline}</h1>
        </div>
        {dueNow ? (
          <Button onClick={() => navigate("/client/invoices")}>
            Pay invoice #{dueNow.invoiceNumber.replace(/^#/, "")} · {formatCurrency(dueNow.amount)}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate("/client/messages")}>
            <MessageSquare className="h-4 w-4" />
            Message {techName ? techName.split(" ")[0] : "your tech"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-7">
        {/* Timeline: the hero */}
        <section className="flex min-w-0 flex-[999_1_540px] flex-col gap-4" aria-label="Timeline">
          {isEmpty ? (
            <ZeroState
              projectName={activeProject?.name ?? null}
              nextStart={nextStart}
              hasQuote={data.documents.length > 0}
              onMessage={() => navigate("/client/messages")}
              onDocuments={() => navigate("/client/documents")}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="mr-2 font-display text-2xl font-semibold">Timeline</h2>
                <span className="text-sm text-muted-foreground">{timeline.length} update{timeline.length === 1 ? "" : "s"}</span>
              </div>
              <TimelineFeed items={timelineItems} engagementRefreshKeys={["/api/timeline/client"]} />
            </>
          )}
        </section>

        {/* Rail */}
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:max-w-[400px]" aria-label="Project summary">
          <RailCard title="Project status" linkLabel="All projects" onLink={() => navigate("/client/projects")}>
            {data.projects.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-foreground/75">No project on the books yet. Once a quote is accepted it shows up here with a progress bar.</p>
            ) : (
              <div className="flex flex-col gap-5">
                {data.projects.slice(0, 2).map(project => (
                  <ProjectStatus key={project.id} project={project} onViewDetails={() => navigate("/client/projects")} />
                ))}
              </div>
            )}
          </RailCard>

          <RailCard title="Important notes" linkLabel="All notes" onLink={() => navigate("/client/notes")}>
            {pinnedNotes.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-foreground/75">Wi-Fi passwords, camera logins and access codes will show up here after install, so you never have to dig through texts for them.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pinnedNotes.map(note => <NoteCard key={note.id} note={note} compact />)}
              </div>
            )}
          </RailCard>

          <RailCard title="Recent invoices" linkLabel="All invoices" onLink={() => navigate("/client/invoices")}>
            <InvoicesTable compact invoices={recentInvoices} onView={() => navigate("/client/invoices")} />
            {dueNow && (
              <Button size="sm" className="mt-3 self-start" onClick={() => navigate("/client/invoices")}>Pay #{dueNow.invoiceNumber.replace(/^#/, "")}</Button>
            )}
          </RailCard>

          <RailCard title="Project documents" linkLabel="All files" onLink={() => navigate("/client/documents")}>
            <DocumentsList compact documents={recentDocuments} onDownload={handleDocumentDownload} />
          </RailCard>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function RailCard({ title, linkLabel, onLink, children }: { title: string; linkLabel?: string; onLink?: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</h2>
        {linkLabel && onLink && (
          <button type="button" onClick={onLink} className="text-[13px] font-semibold text-primary hover:underline">{linkLabel}</button>
        )}
      </div>
      {children}
    </section>
  );
}

function ZeroState({ projectName, nextStart, hasQuote, onMessage, onDocuments }: { projectName: string | null; nextStart: string | null; hasQuote: boolean; onMessage: () => void; onDocuments: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-input bg-card px-6 py-10 text-center sm:px-8">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-signal-soft text-signal-soft-foreground">
        <Camera className="h-8 w-8" strokeWidth={1.8} />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-3xl">Your timeline starts on the first visit.</h2>
        <p className="text-[15px] leading-relaxed text-foreground/75">
          Your tech posts photos and short updates from the job site as the work happens, so you'll see progress here before you see an invoice. Until then, here's what's already in place.
        </p>
      </div>
      <ul className="flex w-full max-w-md flex-col gap-2 text-left">
        <ZeroRow done>Your account and team logins are set up</ZeroRow>
        {hasQuote && <ZeroRow done>Quote accepted{projectName ? ` · ${projectName}` : ""}</ZeroRow>}
        {nextStart ? (
          <ZeroRow next>First day on site: {format(new Date(nextStart), "EEE, MMM d")}{projectName ? ` · ${projectName}` : ""}</ZeroRow>
        ) : (
          <ZeroRow next>Next: your tech confirms the first visit</ZeroRow>
        )}
      </ul>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button onClick={onMessage}><MessageSquare className="h-4 w-4" />Message your tech</Button>
        {hasQuote && <Button variant="outline" onClick={onDocuments}>View the quote <ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

function ZeroRow({ children, done = false, next = false }: { children: React.ReactNode; done?: boolean; next?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-lg px-3.5 py-3 text-[14.5px] ${next ? "bg-primary-soft font-semibold text-primary-soft-foreground" : "bg-muted"}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${next ? "bg-primary text-primary-foreground" : "bg-success-soft text-success-soft-foreground"}`}>
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />}
      </span>
      {children}
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-4 py-7 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-10 w-80" />
      </div>
      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_540px] flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex flex-col gap-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div></div>
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:max-w-[400px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
