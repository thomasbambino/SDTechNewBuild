import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string | null;
  isPublic: boolean;
  publicSummary: string | null;
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  clientId: number;
}

interface Client {
  id: number;
  name: string;
}

export default function AdminCaseStudiesPage() {
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ["/api/projects"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const clientNameByProject = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, c.name]));
    return new Map(projects.map(p => [p.id, clientMap.get(p.clientId) || ""]));
  }, [projects, clients]);

  const projectName = (id: number) => projects.find(p => p.id === id)?.name || `Project #${id}`;

  // One query per project is wasteful but keeps types honest here; we only
  // show public ones + let the admin browse into a project to flag more.
  // For the page itself, fetch via /api/case-studies which returns all public.
  const { data: publicItems = [], isLoading: loadingPublic } = useQuery<any[]>({ queryKey: ["/api/case-studies"] });

  const [browserOpen, setBrowserOpen] = useState<number | null>(null);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Marketing</p>
            <h1 className="text-3xl sm:text-4xl">Case studies</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Flag project updates as public to feed the <a href="/case-studies" className="underline">/case-studies</a> page on your marketing site.
            </p>
          </div>
          <Button asChild variant="outline">
            <a href="/case-studies" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> View public page</a>
          </Button>
        </div>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">Currently public</h2>
          {loadingPublic ? <Skeleton className="h-48 w-full" /> : publicItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No case studies published yet. Pick a project below to review its posts.</p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y bg-card">
              {publicItems.map((p: any) => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-medium">{p.title}</p>
                    <Badge variant="success">Public</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p.projectName} · {p.clientName} · {format(new Date(p.createdAt), "MMM d, yyyy")}</p>
                  {p.summary && <p className="text-sm text-muted-foreground mt-1">{p.summary}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="rounded-lg border divide-y bg-card">
              {projects.map(p => (
                <button
                  key={p.id} type="button"
                  onClick={() => setBrowserOpen(p.id)}
                  className="w-full text-left px-4 py-3 hover-elevate"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{clientNameByProject.get(p.id)}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {browserOpen != null && (
        <ProjectMilestoneBrowser
          projectId={browserOpen}
          onOpenChange={(o) => { if (!o) setBrowserOpen(null); }}
          projectName={projectName(browserOpen)}
        />
      )}
    </AppLayout>
  );
}

function ProjectMilestoneBrowser({ projectId, onOpenChange, projectName }: { projectId: number; onOpenChange: (o: boolean) => void; projectName: string }) {
  const { data: milestones = [] } = useQuery<Milestone[]>({ queryKey: [`/api/projects/${projectId}/milestones`] });
  const [editing, setEditing] = useState<Milestone | null>(null);

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{projectName}</DialogTitle>
            <DialogDescription>Flag updates as public to feature them on your marketing page.</DialogDescription>
          </DialogHeader>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No posts on this project yet.</p>
          ) : (
            <ul className="divide-y">
              {milestones.map(m => (
                <li key={m.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="font-medium">{m.title}</p>
                      {m.isPublic && <Badge variant="success">Public</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(m.createdAt), "MMM d, yyyy")}</p>
                    {m.notes && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.notes}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)}>
                    {m.isPublic ? "Edit" : "Make public"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {editing && (
        <VisibilityDialog
          milestone={editing}
          projectId={projectId}
          onOpenChange={(o) => { if (!o) setEditing(null); }}
        />
      )}
    </>
  );
}

function VisibilityDialog({ milestone, projectId, onOpenChange }: { milestone: Milestone; projectId: number; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPublic, setIsPublic] = useState(milestone.isPublic);
  const [summary, setSummary] = useState(milestone.publicSummary ?? milestone.notes ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/milestones/${milestone.id}/visibility`, {
        isPublic,
        publicSummary: summary.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      queryClient.invalidateQueries({ queryKey: ["/api/case-studies"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Case study visibility</DialogTitle>
          <DialogDescription>Public posts appear on your marketing site. We never expose contact info, notes, or non-flagged photos — only the title, summary, and photos on this post.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-medium">{milestone.title}</p>
            {milestone.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{milestone.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>Show on public /case-studies page</Label>
          </div>
          <div>
            <Label>Public summary (optional — falls back to the post notes if blank)</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
              placeholder="Rewrite the post in a marketing-friendly way. Skip anything sensitive." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
