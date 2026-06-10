import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import ProjectStatus from "@/components/dashboard/ProjectStatus";
import InvoicesTable, { Invoice } from "@/components/dashboard/InvoicesTable";
import DocumentsList, { Document } from "@/components/dashboard/DocumentsList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Pin, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClientData {
  client: { id: number; name: string; contactPerson: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; userId: number | null; freshbooksId: string | null; createdAt: string; updatedAt: string };
  projects: { id: number; name: string; description: string | null; clientId: number; status: string; startDate: string | null; dueDate: string | null; budget: number | null; progress: number; freshbooksId: string | null; createdAt: string; updatedAt: string }[];
  invoices: Invoice[];
  documents: Document[];
}

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  createdBy: number | null;
  createdAt: string;
}

interface ClientNote {
  id: number;
  clientId: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function ClientDashboard() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, isError, refetch } = useQuery<ClientData>({ queryKey: ["/api/dashboard/client"] });
  const { data: clientNotes = [] } = useQuery<ClientNote[]>({ queryKey: ["/api/client-notes"], enabled: !!data });

  // Fetch milestones for all projects
  const projectIds = data?.projects.map(p => p.id) ?? [];
  const { data: allMilestones = [] } = useQuery<Milestone[]>({
    queryKey: ["/api/milestones/all-client", projectIds],
    queryFn: async () => {
      if (!projectIds.length) return [];
      const results = await Promise.all(
        projectIds.map(id => fetch(`/api/projects/${id}/milestones`, { credentials: "include" }).then(r => r.json()))
      );
      return results.flat();
    },
    enabled: projectIds.length > 0,
  });

  const handleDocumentDownload = (doc: Document) => {
    toast({ title: "Download started", description: `Downloading ${doc.name}…` });
    window.open(doc.path, "_blank");
  };

  // Build timeline: project start dates + milestones, sorted chronologically (newest first)
  const timelineItems = [
    ...(data?.projects.map(p => ({
      id: `start-${p.id}`,
      type: "start" as const,
      date: p.startDate || p.createdAt,
      title: `Project started: ${p.name}`,
      notes: p.description,
      images: [] as string[],
    })) ?? []),
    ...allMilestones.map(m => ({
      id: `milestone-${m.id}`,
      type: "milestone" as const,
      date: m.createdAt,
      title: m.title,
      notes: m.notes,
      images: m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [],
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
          <div className="text-center py-10 text-sm text-gray-500">Loading your dashboard…</div>
        ) : isError ? (
          <div className="text-center py-10">
            <p className="text-lg font-medium text-gray-900">Error loading dashboard</p>
            <Button onClick={() => refetch()} className="mt-4">Try Again</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — projects / invoices / documents */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-white shadow rounded-lg">
                <div className="px-5 py-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">Project Status</h3>
                </div>
                <div className="p-5">
                  {data.projects.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">No active projects</p>
                  ) : data.projects.map(project => (
                    <ProjectStatus key={project.id} project={project} onViewDetails={id => navigate(`/client/projects/${id}`)} />
                  ))}
                </div>
                <div className="bg-gray-50 px-5 py-3 text-sm">
                  <a href="#" className="font-medium text-primary hover:underline" onClick={e => { e.preventDefault(); navigate("/client/projects"); }}>View all projects</a>
                </div>
              </Card>

              <InvoicesTable invoices={data.invoices} onView={id => navigate(`/client/invoices/${id}`)} viewAllLink="/client/invoices" onViewAll={() => navigate("/client/invoices")} />

              <DocumentsList documents={data.documents} onDownload={handleDocumentDownload} viewAllLink="/client/documents" onViewAll={() => navigate("/client/documents")} />
            </div>

            {/* Right column — timeline + important notes */}
            <div className="space-y-6">
              {/* Important Notes */}
              {clientNotes.length > 0 && (
                <Card className="bg-white shadow rounded-lg">
                  <div className="px-5 py-4 border-b flex items-center gap-2">
                    <Pin className="h-4 w-4 text-amber-500" />
                    <h3 className="text-base font-medium text-gray-900">Important Notes</h3>
                  </div>
                  <div className="divide-y">
                    {clientNotes.map(note => (
                      <div key={note.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-gray-900">{note.title}</p>
                          {note.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{format(new Date(note.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Project Timeline */}
              <Card className="bg-white shadow rounded-lg">
                <div className="px-5 py-4 border-b">
                  <h3 className="text-base font-medium text-gray-900">Project Timeline</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Progress updates from your team</p>
                </div>
                <div className="px-5 py-4">
                  {timelineItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No updates yet</p>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
                      <div className="space-y-6">
                        {timelineItems.map(item => (
                          <div key={item.id} className="relative pl-9">
                            <div className={`absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center ring-2 ring-white ${item.type === "start" ? "bg-primary" : "bg-green-500"}`}>
                              <span className="text-white text-xs font-bold">{item.type === "start" ? "S" : "✓"}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                              <p className="text-xs text-gray-400 mb-1">{format(new Date(item.date), "MMM d, yyyy · h:mm a")}</p>
                              {item.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.notes}</p>}
                              {item.images.length > 0 && (
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {item.images.map((src, i) => (
                                    <a key={i} href={src} target="_blank" rel="noreferrer">
                                      <img src={src} alt={`Update ${i + 1}`} className="rounded-md w-full h-24 object-cover border hover:opacity-90 transition-opacity" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
