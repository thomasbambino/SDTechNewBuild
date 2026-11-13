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
import { ArrowLeft, Mail, Phone, MapPin, User, FileText, MessageSquare, Eye, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { Client, Project, Invoice, Document, Message } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import TimelineComposer from "@/components/admin/TimelineComposer";
import TimelineFeed, { TimelineItem } from "@/components/dashboard/TimelineFeed";
import NoteCard from "@/components/dashboard/NoteCard";
import NoteEditor, { NoteDraft } from "@/components/admin/NoteEditor";
import TeamMembers from "@/components/dashboard/TeamMembers";
import { Plus, Trash2, Pencil } from "lucide-react";

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
}

export default function ClientDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { impersonateMutation } = useAuth();
  const [createdLogin, setCreatedLogin] = useState<{ username: string; tempPassword: string; userId: number } | null>(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDraft | undefined>(undefined);
  const clientId = parseInt(params.id as string);

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/client-notes/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-notes?clientId=${clientId}`] });
      toast({ title: "Note deleted" });
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
          <p className="mt-2 text-sm text-gray-500">Loading client…</p>
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

  const statusVariant = (s: string | null | undefined) => {
    switch (s) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "on_hold": return "outline";
      case "paid": return "default";
      case "overdue": return "destructive";
      default: return "secondary";
    }
  };

  const statusLabel = (s: string | null | undefined) => {
    if (!s) return "—";
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/admin/clients")} className="mb-2 -ml-3">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <User className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl">{client.name}</CardTitle>
                {client.contactPerson && (
                  <CardDescription className="mt-1">{client.contactPerson}</CardDescription>
                )}
              </div>
              <div className="flex-shrink-0">
                {client.userId ? (
                  <Button
                    onClick={() => impersonateMutation.mutate(client.userId as number)}
                    disabled={impersonateMutation.isPending}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {impersonateMutation.isPending ? "Opening…" : "View as Client"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => createLoginMutation.mutate()}
                    disabled={createLoginMutation.isPending || !client.email}
                    title={!client.email ? "Client needs an email address first" : undefined}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    {createLoginMutation.isPending ? "Creating…" : "Create Login"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" /> <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4" /> {client.phone}
              </div>
            )}
            {client.address && (
              <div className="flex items-start gap-2 text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5" /> <span className="whitespace-pre-wrap">{client.address}</span>
              </div>
            )}
            {client.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Internal notes</p>
                <p className="whitespace-pre-wrap text-gray-600">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline">
          <TabsList>
            <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="messages">Messages ({messages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-4">
            <TimelineComposer projects={projects} clientId={clientId} />
            <TimelineFeed
              items={timeline.map(m => ({
                id: `milestone-${m.id}`,
                type: "milestone" as const,
                date: m.createdAt,
                title: m.title,
                notes: m.notes,
                images: m.imagePaths ? (JSON.parse(m.imagePaths) as string[]) : [],
                projectName: m.projectName,
                authorName: m.authorName,
              })) as TimelineItem[]}
              emptyMessage="No posts yet. Use the composer above to publish your first update."
            />
          </TabsContent>

          <TabsContent value="projects" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {projects.length === 0 ? (
                  <p className="p-6 text-sm text-gray-500 text-center">No projects for this client yet.</p>
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
                          <TableCell><Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge></TableCell>
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
                  <p className="p-6 text-sm text-gray-500 text-center">No invoices for this client.</p>
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
                  <p className="p-6 text-sm text-gray-500 text-center">No documents for this client.</p>
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
                              <FileText className="h-4 w-4 text-gray-400" />{d.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">{d.type || "—"}</TableCell>
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

          <TabsContent value="notes" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingNote(undefined); setNoteEditorOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Note
              </Button>
            </div>
            {notes.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-500 text-center py-4">No client-visible notes yet.</p>
                  <p className="text-xs text-gray-400 text-center">
                    Use notes for Wi-Fi credentials, VLAN assignments, access codes, and anything the client should be able to reference.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
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
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
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
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
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
                  <p className="p-6 text-sm text-gray-500 text-center">No messages with this client.</p>
                ) : (
                  <div className="divide-y">
                    {messages.map(m => (
                      <div key={m.id} className="p-4 flex gap-3 items-start">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          <p className="text-xs text-gray-400 mt-1">
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
