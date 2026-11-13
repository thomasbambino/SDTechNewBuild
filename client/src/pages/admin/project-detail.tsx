import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, DollarSign, FileText, Pencil } from "lucide-react";
import { format } from "date-fns";
import { Project, Client, Invoice, Document } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import TimelineComposer from "@/components/admin/TimelineComposer";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  createdBy: number | null;
  createdAt: string;
}

function statusVariant(s: string | null | undefined) {
  switch (s) {
    case "completed": return "default";
    case "in_progress": return "secondary";
    case "on_hold": return "outline";
    default: return "secondary";
  }
}

function statusLabel(s: string | null | undefined) {
  if (!s) return "—";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminProjectDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const projectId = parseInt(params.id as string);

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
          <p className="mt-2 text-sm text-gray-500">Loading project…</p>
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

  const timelineItems: TimelineItem[] = milestones.map(m => ({
    id: `milestone-${m.id}`,
    type: "milestone" as const,
    date: m.createdAt,
    title: m.title,
    notes: m.notes,
    images: m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [],
    projectName: project.name,
    authorName: null,
  }));

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/admin/projects")} className="mb-2 -ml-3">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                {client && (
                  <CardDescription className="mt-1">
                    Client: <Link href={`/admin/clients/${client.id}`} className="text-primary hover:underline">{client.name}</Link>
                  </CardDescription>
                )}
                {project.description && (
                  <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{project.description}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" onClick={() => setLocation("/admin/projects")}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {project.startDate ? format(new Date(project.startDate), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Due Date</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {project.dueDate ? format(new Date(project.dueDate), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Budget</p>
                <p className="font-medium flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                  {project.budget != null ? `$${project.budget.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs font-medium">{project.progress ?? 0}%</span>
              </div>
              <Progress value={project.progress ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline ({milestones.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-4">
            {client && (
              <TimelineComposer
                projects={[{ id: project.id, name: project.name }]}
                clientId={client.id}
                defaultProjectId={project.id}
              />
            )}
            <TimelineFeed
              items={timelineItems}
              emptyMessage="No posts on this project yet."
            />
            {milestones.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-2">Admin tools</p>
                  <div className="space-y-1">
                    {milestones.map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-700 truncate">{m.title}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete post "${m.title}"?`)) deleteMilestoneMutation.mutate(m.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500 text-center">No invoices for this project.</p>
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
                          <TableCell>${i.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge variant={statusVariant(i.status)}>{statusLabel(i.status)}</Badge></TableCell>
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
                  <p className="p-6 text-sm text-gray-500 text-center">No documents for this project.</p>
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
                              <FileText className="h-4 w-4 text-gray-400" />{d.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">{d.type || "—"}</TableCell>
                          <TableCell className="text-gray-500 text-sm">{formatBytes(d.size)}</TableCell>
                          <TableCell className="text-gray-500 text-sm">
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
