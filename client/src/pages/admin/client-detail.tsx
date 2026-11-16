import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Mail, Phone, MapPin, FileText, MessageSquare, Eye, KeyRound, Camera } from "lucide-react";
import { format } from "date-fns";
import { Client, Project, Invoice, Document, Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import TimelineComposer, { ExistingPost } from "@/components/admin/TimelineComposer";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";
import NoteCard from "@/components/dashboard/NoteCard";
import NoteEditor, { NoteDraft } from "@/components/admin/NoteEditor";
import TeamMembers from "@/components/dashboard/TeamMembers";
import { Plus, Trash2, Pencil } from "lucide-react";
import { projectStatusMeta } from "@/components/dashboard/ProjectStatus";

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

interface TimelinePost {
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

export default function ClientDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { impersonateMutation } = useAuth();
  const [createdLogin, setCreatedLogin] = useState<{ username: string; tempPassword: string; userId: number } | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDraft | undefined>(undefined);
  const [editingPost, setEditingPost] = useState<ExistingPost | undefined>(undefined);
  const [composerOpen, setComposerOpen] = useState(false);
  const clientId = parseInt(params.id as string);

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/client-notes/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-notes?clientId=${clientId}`] });
      toast({ title: "Note deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/milestones/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/timeline/admin?clientId=${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/client"] });
      toast({ title: "Post deleted" });
    },
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const createLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/create-login`);
      return res.json() as Promise<{ username: string; tempPassword: string; userId: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setCreatedLogin(data);
    },
    onError: (err: Error) => toast({ title: "Failed to create login", description: err.message, variant: "destructive" }),
  });

  const { data: client, isLoading: clientLoading, error: clientError } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !isNaN(clientId),
  });

  const { data: allProjects = [] } = useQuery<Project[]>({ queryKey: ['/api/projects'] });
  const { data: allInvoices = [] } = useQuery<Invoice[]>({ queryKey: ['/api/invoices'] });
  const { data: allDocuments = [] } = useQuery<Document[]>({ queryKey: ['/api/documents'] });
  const { data: notes = [] } = useQuery<ClientNote[]>({
    queryKey: [`/api/client-notes?clientId=${clientId}`],
    enabled: !isNaN(clientId),
  });
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/messages?clientId=${clientId}`],
    enabled: !isNaN(clientId),
  });
  const { data: timeline = [] } = useQuery<TimelinePost[]>({
    queryKey: [`/api/timeline/admin?clientId=${clientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/timeline/client?clientId=${clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load timeline");
      return res.json();
    },
    enabled: !isNaN(clientId),
  });

  const projects = allProjects.filter(p => p.clientId === clientId);
  const invoices = allInvoices.filter(i => i.clientId === clientId);
  const documents = allDocuments.filter(d => d.clientId === clientId || projects.some(p => p.id === d.projectId));

  if (isNaN(clientId)) {
    return (
      <AppLayout>
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-destructive">Invalid client ID.</p>
        </div>
      </AppLayout>
    );
  }

  if (clientLoading) {
    return (
      <AppLayout>
        <div className="py-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-r-transparent" role="status" />
          <p className="mt-2 text-sm text-muted-foreground">Loading client…</p>
        </div>
      </AppLayout>
    );
  }

  if (clientError || !client) {
    return (
      <AppLayout>
        <div className="py-6 px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setLocation("/admin/clients")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
          </Button>
          <p className="text-destructive">Client not found.</p>
        </div>
      </AppLayout>
    );
  }

  const statusVariant = (s: string | null | undefined): "info" | "success" | "warning" | "danger" | "secondary" => {
    switch (s) {
      case "completed": case "paid": return "success";
      case "in_progress": return "info";
      case "on_hold": case "pending": return "warning";
      case "overdue": return "danger";
      default: return "secondary";
    }
  };

  const statusLabel = (s: string | null | undefined) => {
    if (!s) return "—";
    if (s === "in_progress") return "In progress";
    return s.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());
  };

  const initials = client.name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const openComposer = () => {
    setComposerOpen(true);
    setTimeout(() => document.getElementById("composer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 text-[13.5px] text-muted-foreground" aria-label="Breadcrumb">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/clients")} className="-ml-2 h-9 px-2 text-primary">
            <ArrowLeft className="h-4 w-4" /> Clients
          </Button>
          <span aria-hidden="true">/</span>
          <span className="truncate text-foreground/80">{client.name}</span>
        </nav>

        <header className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft font-display text-xl font-bold tracking-wide text-primary-soft-foreground" aria-hidden="true">{initials}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="truncate text-2xl sm:text-3xl">{client.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-muted-foreground">
              {client.contactPerson && <span>{client.contactPerson}</span>}
              {client.phone && <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" />{client.phone}</a>}
              {client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" />{client.email}</a>}
              {client.createdAt && <span>Client since {format(new Date(client.createdAt), "MMM yyyy")}</span>}
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button variant="outline" onClick={() => setLocation("/admin/messages")} className="flex-1 sm:flex-none">
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
            {client.userId ? (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => impersonateMutation.mutate(client.userId as number)}
                disabled={impersonateMutation.isPending}
              >
                <Eye className="h-4 w-4" />
                {impersonateMutation.isPending ? "Opening…" : "View as client"}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => createLoginMutation.mutate()}
                disabled={createLoginMutation.isPending || !client.email}
                title={!client.email ? "Client needs an email address first" : undefined}
              >
                <KeyRound className="h-4 w-4" />
                {createLoginMutation.isPending ? "Creating…" : "Create login"}
              </Button>
            )}
            <Button onClick={openComposer} className="w-full sm:w-auto">
              <Camera className="h-4 w-4" /> Post update
            </Button>
          </div>
        </header>

        {(client.address || client.notes) && (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 text-[13.5px] text-foreground/80">
            {client.address && (
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><span className="whitespace-pre-wrap">{client.address}</span></div>
            )}
            {client.notes && (
              <div className={client.address ? "border-t border-border pt-2" : ""}>
                <p className="mb-0.5 font-display text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Internal notes · not visible to client</p>
                <p className="whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="timeline">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 [scrollbar-width:none]">
            {([
              ["timeline", "Timeline", timeline.length],
              ["projects", "Projects", projects.length],
              ["invoices", "Invoices", invoices.length],
              ["documents", "Documents", documents.length],
              ["notes", "Notes", notes.length],
              ["team", "Team", null],
              ["messages", "Messages", messages.length],
            ] as const).map(([value, label, count]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-11 shrink-0 rounded-none border-b-2 border-transparent px-3 text-[14px] font-medium text-foreground/70 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {label}{count !== null && count > 0 && <span className="ml-1.5 text-[12px] font-medium text-muted-foreground">{count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-4">
            <div id="composer" className="scroll-mt-20">
              {composerOpen || editingPost ? (
                <TimelineComposer
                  key={editingPost?.id ?? "new"}
                  projects={projects}
                  clientId={clientId}
                  editing={editingPost}
                  onCancel={() => { setEditingPost(undefined); setComposerOpen(false); }}
                  onSaved={() => { setEditingPost(undefined); setComposerOpen(false); }}
                />
              ) : (
                <Button size="lg" className="w-full sm:w-auto" onClick={openComposer} disabled={projects.length === 0}>
                  <Camera className="h-5 w-5" /> Post an update with photos
                </Button>
              )}
              {projects.length === 0 && !composerOpen && (
                <p className="mt-2 text-[13px] text-muted-foreground">Create a project for this client before posting updates.</p>
              )}
            </div>
            <TimelineFeed
              items={timeline.map(m => {
                const images = m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [];
                return {
                  id: `milestone-${m.id}`,
                  type: "milestone" as const,
                  date: m.createdAt,
                  title: m.title,
                  notes: m.notes,
                  images,
                  projectName: m.projectName,
                  authorName: m.authorName,
                  adminMeta: {
                    milestoneId: m.id,
                    projectId: m.projectId,
                    createdAt: m.createdAt,
                    imagePaths: images,
                  },
                  engagement: {
                    milestoneId: m.id,
                    likeCount: m.likeCount,
                    commentCount: m.commentCount,
                    likedByMe: m.likedByMe,
                  },
                };
              }) as TimelineItem[]}
              emptyMessage="No posts for this client yet."
              engagementRefreshKeys={[`/api/timeline/admin?clientId=${clientId}`]}
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

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {projects.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No projects for this client yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            <Link href="/admin/projects" className="hover:underline">{p.name}</Link>
                          </TableCell>
                          <TableCell><Badge variant={projectStatusMeta(p.status ?? "").variant}>{projectStatusMeta(p.status ?? "").label}</Badge></TableCell>
                          <TableCell>{p.progress ?? 0}%</TableCell>
                          <TableCell>{p.dueDate ? format(new Date(p.dueDate), "MMM d, yyyy") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {invoices.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No invoices for this client.</p>
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
                  <p className="p-6 text-sm text-muted-foreground text-center">No documents for this client.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
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

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] text-muted-foreground">Visible to the client under Notes. Locked values are hidden until revealed.</p>
              <Button onClick={() => { setEditingNote(undefined); setNoteEditorOpen(true); }}>
                <Plus className="h-4 w-4" /> Add note
              </Button>
            </div>
            {notes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-input bg-card px-6 py-10 text-center">
                <p className="font-display text-xl font-semibold">No notes yet.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Wi-Fi credentials, VLAN assignments, camera logins and door codes.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {notes.map(note => {
                  let parsedFields: any[] = [];
                  if (note.fields) {
                    try { parsedFields = JSON.parse(note.fields) || []; } catch { parsedFields = []; }
                  }
                  return (
                    <NoteCard
                      key={note.id}
                      note={note}
                      action={
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => {
                              setEditingNote({
                                id: note.id,
                                title: note.title,
                                content: note.content ?? "",
                                category: note.category ?? "general",
                                fields: parsedFields,
                                isPinned: !!note.isPinned,
                              });
                              setNoteEditorOpen(true);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 text-destructive hover:bg-destructive-soft"
                            onClick={() => { if (confirm(`Delete "${note.title}"? The client loses it too.`)) deleteNoteMutation.mutate(note.id); }}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}

            <NoteEditor
              clientId={clientId}
              open={noteEditorOpen}
              onClose={() => setNoteEditorOpen(false)}
              initial={editingNote}
              invalidateKeys={[`/api/client-notes?clientId=${clientId}`]}
            />
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <TeamMembers clientId={clientId} canManage={true} />
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {messages.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No messages with this client.</p>
                ) : (
                  <div className="divide-y">
                    {messages.map(m => (
                      <div key={m.id} className="p-4 flex gap-3 items-start">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.createdAt ? format(new Date(m.createdAt), "MMM d, yyyy h:mm a") : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="p-4 border-t">
                      <Link href="/admin/messages" className="text-sm text-primary hover:underline">Open in Messages →</Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!createdLogin} onOpenChange={open => { if (!open) setCreatedLogin(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login created for {client.name}</DialogTitle>
              <DialogDescription>
                Copy these credentials now — the password won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 text-sm">
              <div><span className="text-gray-500">Username: </span><strong>{createdLogin?.username}</strong></div>
              <div><span className="text-gray-500">Password: </span><strong className="font-mono">{createdLogin?.tempPassword}</strong></div>
            </div>
            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (createdLogin) navigator.clipboard?.writeText(`Username: ${createdLogin.username}\nPassword: ${createdLogin.tempPassword}`);
                  toast({ title: "Copied to clipboard" });
                }}
              >
                Copy
              </Button>
              <Button variant="outline" onClick={() => setCreatedLogin(null)}>Done</Button>
              <Button
                onClick={() => {
                  if (!createdLogin) return;
                  const userId = createdLogin.userId;
                  setCreatedLogin(null);
                  impersonateMutation.mutate(userId);
                }}
                disabled={impersonateMutation.isPending}
              >
                <Eye className="h-4 w-4 mr-2" /> View as Client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
