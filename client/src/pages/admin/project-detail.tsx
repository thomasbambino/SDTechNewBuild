import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileText, Pencil, Camera } from "lucide-react";
import { projectStatusMeta } from "@/components/dashboard/ProjectStatus";
import { format } from "date-fns";
import { Project, Client, Invoice, Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import TimelineComposer, { ExistingPost } from "@/components/admin/TimelineComposer";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  createdBy: number | null;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
}

function invoiceVariant(s: string | null | undefined): "success" | "warning" | "danger" | "secondary" {
  switch (s) {
    case "paid": return "success";
    case "pending": return "warning";
    case "overdue": return "danger";
    default: return "secondary";
  }
}

function invoiceLabel(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
}

export default function AdminProjectDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectId = parseInt(params.id as string);
  const [editingPost, setEditingPost] = useState<ExistingPost | undefined>(undefined);
  const [composerOpen, setComposerOpen] = useState(false);

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId),
  });

  const { data: client } = useQuery<Client>({
    queryKey: [`/api/clients/${project?.clientId}`],
    enabled: !!project?.clientId,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: [`/api/projects/${projectId}/invoices`],
    enabled: !isNaN(projectId),
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: [`/api/documents?projectId=${projectId}`],
    queryFn: async () => {
      const res = await fetch(`/api/documents?projectId=${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !isNaN(projectId),
  });

  const { data: milestones = [] } = useQuery<Milestone[]>({
    queryKey: [`/api/projects/${projectId}/milestones`],
    enabled: !isNaN(projectId),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/milestones/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  if (isNaN(projectId)) {
    return (
      <AppLayout>
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-destructive">Invalid project ID.</p>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-r-transparent" role="status" />
          <p className="mt-2 text-sm text-muted-foreground">Loading project…</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setLocation("/admin/projects")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
          </Button>
          <p className="text-destructive">Project not found.</p>
        </div>
      </AppLayout>
    );
  }

  const timelineItems: TimelineItem[] = milestones.map(m => {
    const images = m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [];
    return {
      id: `milestone-${m.id}`,
      type: "milestone" as const,
      date: m.createdAt,
      title: m.title,
      notes: m.notes,
      images,
      projectName: project.name,
      authorName: null,
      adminMeta: {
        milestoneId: m.id,
        projectId: m.projectId,
        createdAt: m.createdAt,
        imagePaths: images,
      },
      engagement: {
        milestoneId: m.id,
        likeCount: m.likeCount ?? 0,
        commentCount: m.commentCount ?? 0,
        likedByMe: m.likedByMe ?? false,
      },
    };
  });

  const meta = projectStatusMeta(project.status ?? "");
  const progress = Math.max(0, Math.min(100, project.progress ?? 0));
  const isDone = meta.variant === "success";
  const due = project.dueDate ? new Date(project.dueDate) : null;
  const overdue = !!due && !isDone && due.getTime() < Date.now();
  const openComposer = () => {
    setComposerOpen(true);
    setTimeout(() => document.getElementById("composer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-[13.5px] text-muted-foreground" aria-label="Breadcrumb">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/projects")} className="-ml-2 h-9 px-2 text-primary">
            <ArrowLeft className="h-4 w-4" /> Projects
          </Button>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground/80">{project.name}</span>
        </nav>

        <header className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl">{project.name}</h1>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-muted-foreground">
              {client && (
                <span>For <Link href={`/admin/clients/${client.id}`} className="font-semibold text-primary hover:underline">{client.name}</Link></span>
              )}
              {project.startDate && <span>Started {format(new Date(project.startDate), "MMM d, yyyy")}</span>}
              {due && (
                <span className={overdue ? "font-semibold text-destructive" : ""}>
                  {isDone ? "Finished" : overdue ? "Was due" : "Due"} {format(due, "MMM d, yyyy")}
                </span>
              )}
              {project.budget != null && <span className="font-mono">${project.budget.toLocaleString()} budget</span>}
            </div>
            {project.description && (
              <p className="max-w-2xl whitespace-pre-wrap text-[14.5px] leading-relaxed text-foreground/80">{project.description}</p>
            )}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => setLocation("/admin/projects")} className="flex-1 sm:flex-none">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="signal" onClick={openComposer} disabled={!client} className="flex-[2] sm:flex-none">
              <Camera className="h-4 w-4" /> Post update
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="font-semibold">{isDone ? "All done" : progress === 0 ? "Not started" : "Progress"}</span>
            <span className="font-mono text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full rounded-full ${isDone ? "bg-success" : "bg-primary"}`} style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[12.5px] text-muted-foreground">Progress is set on the project; the client sees this same bar on their dashboard.</p>
        </div>

        <Tabs defaultValue="timeline">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 [scrollbar-width:none]">
            {([
              ["timeline", "Timeline", milestones.length],
              ["invoices", "Invoices", invoices.length],
              ["documents", "Documents", documents.length],
            ] as const).map(([value, label, count]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-11 shrink-0 rounded-none border-b-2 border-transparent px-3 text-[14px] font-medium text-foreground/70 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {label}{count > 0 && <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">{count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-4">
            <div id="composer" className="scroll-mt-20">
              {client && (composerOpen || editingPost) ? (
                <TimelineComposer
                  key={editingPost?.id ?? "new"}
                  projects={[{ id: project.id, name: project.name }]}
                  clientId={client.id}
                  defaultProjectId={project.id}
                  editing={editingPost}
                  onCancel={() => { setEditingPost(undefined); setComposerOpen(false); }}
                  onSaved={() => { setEditingPost(undefined); setComposerOpen(false); }}
                />
              ) : (
                <Button variant="signal" size="lg" className="w-full sm:w-auto" onClick={openComposer} disabled={!client}>
                  <Camera className="h-5 w-5" /> Post an update with photos
                </Button>
              )}
            </div>
            <TimelineFeed
              items={timelineItems}
              emptyMessage="Nothing posted on this project yet. The first photo update is the one the client remembers."
              engagementRefreshKeys={[`/api/projects/${projectId}/milestones`]}
              onEdit={(meta, item) => {
                setEditingPost({
                  id: meta.milestoneId,
                  projectId: meta.projectId,
                  title: item.title,
                  notes: item.notes,
                  imagePaths: meta.imagePaths,
                  createdAt: meta.createdAt,
                });
                openComposer();
              }}
              onDelete={(meta, item) => {
                if (confirm(`Delete post "${item.title}"?`)) deleteMilestoneMutation.mutate(meta.milestoneId);
              }}
            />
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No invoices for this project.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map(i => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium">{i.invoiceNumber}</TableCell>
                          <TableCell className="font-mono">${i.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge variant={invoiceVariant(i.status)}>{invoiceLabel(i.status)}</Badge></TableCell>
                          <TableCell>{i.dueDate ? format(new Date(i.dueDate), "MMM d, yyyy") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {documents.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No documents for this project.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />{d.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{d.type || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{formatBytes(d.size)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {d.createdAt ? format(new Date(d.createdAt), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <a href={d.path} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Open</a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
