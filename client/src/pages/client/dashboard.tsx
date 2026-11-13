import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import ProjectStatus from "@/components/dashboard/ProjectStatus";
import InvoicesTable, { Invoice } from "@/components/dashboard/InvoicesTable";
import DocumentsList, { Document } from "@/components/dashboard/DocumentsList";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";
import NoteCard from "@/components/dashboard/NoteCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientData {
  client: { id: number; name: string; contactPerson: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; userId: number | null; freshbooksId: string | null; createdAt: string; updatedAt: string };
  projects: { id: number; name: string; description: string | null; clientId: number; status: string; startDate: string | null; dueDate: string | null; budget: number | null; progress: number; freshbooksId: string | null; createdAt: string; updatedAt: string }[];
  invoices: Invoice[];
  documents: Document[];
}

interface TimelinePost {
  id: number;
  projectId: number;
  projectName: string | null;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  authorName: string | null;
  createdAt: string;
}

interface ClientNote {
  id: number;
  clientId: number;
  title: string;
  content: string;
  category: string | null;
  fields: string | null;
  isPinned: boolean;
  createdAt: string;
}

export default function ClientDashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery<ClientData>({ queryKey: ["/api/dashboard/client"] });
  const { data: clientNotes = [] } = useQuery<ClientNote[]>({ queryKey: ["/api/client-notes"], enabled: !!data });

  // Fetch the full timeline (milestones + author + project names) from
  // the server; one request, pre-sorted.
  const { data: timeline = [] } = useQuery<TimelinePost[]>({
    queryKey: ["/api/timeline/client"],
    enabled: !!data,
  });

  const handleDocumentDownload = (doc: Document) => {
    toast({ title: "Download started", description: `Downloading ${doc.name}…` });
    window.open(doc.path, "_blank");
  };

  const timelineItems: TimelineItem[] = [
    ...(data?.projects.map(p => ({
      id: `start-${p.id}`,
      type: "start" as const,
      date: p.startDate || p.createdAt,
      title: `Project started: ${p.name}`,
      notes: p.description,
      images: [] as string[],
      projectName: p.name,
      authorName: null,
    })) ?? []),
    ...timeline.map(m => ({
      id: `milestone-${m.id}`,
      type: "milestone" as const,
      date: m.createdAt,
      title: m.title,
      notes: m.notes,
      images: m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [],
      projectName: m.projectName,
      authorName: m.authorName,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <Button onClick={() => navigate("/client/messages")}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-32" /></div>
                <div className="p-5 space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-32" /></div>
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-28" /></div>
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right column skeleton */}
            <div className="space-y-6">
              <div className="bg-card rounded-lg border">
                <div className="px-5 py-4 border-b"><Skeleton className="h-6 w-32" /></div>
                <div className="p-5 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="w-0.5 flex-1 mt-1" />
                      </div>
                      <div className="pb-4 flex-1 space-y-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-10">
            <p className="text-lg font-medium text-gray-900">Error loading dashboard</p>
            <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column — Timeline feed (the hero of this dashboard) */}
            <div className="lg:col-span-2 space-y-6">
              <TimelineFeed items={timelineItems} />
            </div>

            {/* Right rail — status, invoices, documents, notes */}
            <div className="space-y-6">
              <Card className="bg-white shadow-sm">
                <div className="px-5 py-4 border-b">
                  <h3 className="text-base font-semibold text-gray-900">Project Status</h3>
                </div>
                <div className="p-5">
                  {data!.projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No active projects</p>
                  ) : data!.projects.map(project => (
                    <ProjectStatus key={project.id} project={project} onViewDetails={id => navigate(`/client/projects/${id}`)} />
                  ))}
                </div>
                <div className="bg-gray-50 px-5 py-3 text-sm">
                  <a href="#" className="font-medium text-primary hover:underline" onClick={e => { e.preventDefault(); navigate("/client/projects"); }}>View all projects</a>
                </div>
              </Card>

              <InvoicesTable invoices={data!.invoices} onView={id => navigate(`/client/invoices/${id}`)} viewAllLink="/client/invoices" onViewAll={() => navigate("/client/invoices")} />

              <DocumentsList documents={data!.documents} onDownload={handleDocumentDownload} viewAllLink="/client/documents" onViewAll={() => navigate("/client/documents")} />

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4 text-amber-500" />
                    <h3 className="text-base font-semibold text-gray-900">Important Notes</h3>
                  </div>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); navigate("/client/notes"); }}
                    className="text-xs text-primary hover:underline"
                  >
                    View all
                  </a>
                </div>
                {clientNotes.length === 0 ? (
                  <Card className="bg-white shadow-sm">
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-gray-500">No notes yet.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Important reference info your technician leaves will appear here.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {clientNotes.map(note => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
