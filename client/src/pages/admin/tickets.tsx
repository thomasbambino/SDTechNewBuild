import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

interface Ticket {
  id: number;
  clientId: number;
  projectId: number | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  createdBy: number | null;
  assignedTo: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketComment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
}

type TicketDetail = Ticket & { comments: TicketComment[] };

const STATUS_OPTIONS = ["new", "acknowledged", "in_progress", "scheduled", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "normal", "high", "urgent"];

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" | "danger" }> = {
  new:          { label: "New", variant: "info" },
  acknowledged: { label: "Acknowledged", variant: "secondary" },
  in_progress:  { label: "In progress", variant: "info" },
  scheduled:    { label: "Scheduled", variant: "warning" },
  resolved:     { label: "Resolved", variant: "success" },
  closed:       { label: "Closed", variant: "secondary" },
};

export default function AdminTicketsPage() {
  const { data: tickets, isLoading } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("open");

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const filtered = useMemo(() => {
    if (!tickets) return [];
    if (statusFilter === "all") return tickets;
    if (statusFilter === "open") return tickets.filter(t => t.status !== "resolved" && t.status !== "closed");
    return tickets.filter(t => t.status === statusFilter);
  }, [tickets, statusFilter]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</p>
            <h1 className="text-3xl sm:text-4xl">Service requests</h1>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="all">All</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_META[s]?.label || s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
          {/* List */}
          <section className="rounded-lg border bg-card overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No requests match.</p>
            ) : (
              <ul className="divide-y max-h-[70vh] overflow-y-auto">
                {filtered.map(t => {
                  const meta = STATUS_META[t.status] ?? { label: t.status, variant: "secondary" as const };
                  const active = t.id === selectedId;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={`w-full text-left px-4 py-3 ${active ? "bg-primary-soft" : "hover-elevate"}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{t.title}</span>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                          {t.priority === "urgent" && <Badge variant="danger">Urgent</Badge>}
                          {t.priority === "high" && <Badge variant="warning">High</Badge>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {clientMap.get(t.clientId) || `Client #${t.clientId}`} · {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Detail */}
          <section>
            {selectedId == null ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                Select a request to view detail and respond.
              </div>
            ) : (
              <AdminTicketDetail ticketId={selectedId} clientName={clientMap.get(tickets?.find(t => t.id === selectedId)?.clientId ?? -1) ?? ""} />
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

function AdminTicketDetail({ ticketId, clientName }: { ticketId: number; clientName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: ticket, isLoading } = useQuery<TicketDetail>({ queryKey: [`/api/tickets/${ticketId}`] });
  const [reply, setReply] = useState("");

  const update = useMutation({
    mutationFn: async (patch: Partial<Ticket>) => {
      const res = await apiRequest("PUT", `/api/tickets/${ticketId}`, patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const comment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/comments`, { content: reply.trim() });
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
    },
    onError: (err: Error) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading || !ticket) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-5 border-b">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{clientName}</p>
        <h2 className="text-xl font-semibold mt-1">{ticket.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Opened {format(new Date(ticket.createdAt), "MMM d, yyyy · h:mm a")}
          {ticket.location ? ` · ${ticket.location}` : ""}
        </p>
        {ticket.description && <p className="text-sm whitespace-pre-wrap mt-3 leading-relaxed">{ticket.description}</p>}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Status</p>
            <Select value={ticket.status} onValueChange={v => update.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_META[s]?.label || s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Priority</p>
            <Select value={ticket.priority} onValueChange={v => update.mutate({ priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="p-5 border-b">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
          Conversation ({ticket.comments.length})
        </h3>
        {ticket.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          <ul className="space-y-4">
            {ticket.comments.map(c => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">
                    {c.authorName || "Unknown"}
                    {(c.authorRole === "admin" || c.authorRole === "internal") && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">Team</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed mt-0.5">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="p-4 space-y-2"
        onSubmit={(e) => { e.preventDefault(); if (reply.trim()) comment.mutate(); }}
      >
        <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Reply…" rows={3} />
        <div className="flex justify-end">
          <Button type="submit" disabled={!reply.trim() || comment.isPending}>Send</Button>
        </div>
      </form>
    </div>
  );
}
