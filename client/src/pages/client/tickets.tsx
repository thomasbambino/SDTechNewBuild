import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LifeBuoy, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { value: "support", label: "Support" },
  { value: "install", label: "New install" },
  { value: "outage", label: "Outage" },
  { value: "question", label: "Question" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent — down" },
];

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" | "danger" }> = {
  new:          { label: "New", variant: "info" },
  acknowledged: { label: "Acknowledged", variant: "secondary" },
  in_progress:  { label: "In progress", variant: "info" },
  scheduled:    { label: "Scheduled", variant: "warning" },
  resolved:     { label: "Resolved", variant: "success" },
  closed:       { label: "Closed", variant: "secondary" },
};

const PRIORITY_VARIANT: Record<string, "info" | "success" | "warning" | "secondary" | "danger"> = {
  low: "secondary",
  normal: "secondary",
  high: "warning",
  urgent: "danger",
};

export default function ClientTicketsPage() {
  const { data: tickets, isLoading } = useQuery<Ticket[]>({ queryKey: ["/api/tickets"] });
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</p>
            <h1 className="text-3xl sm:text-4xl">Requests</h1>
            <p className="text-sm text-muted-foreground mt-1">Something broken, something new to install, or a question — file it here.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New request
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0,1,2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-display text-xl font-semibold">No requests yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">File one when something needs attention — we'll get back to you same-day for anything urgent.</p>
            <Button onClick={() => setCreateOpen(true)}>Open first request</Button>
          </div>
        ) : (
          <div className="rounded-lg border divide-y bg-card">
            {tickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </div>
        )}
      </div>

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppLayout>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const meta = STATUS_META[ticket.status] ?? { label: ticket.status, variant: "secondary" as const };
  const priorityVariant = PRIORITY_VARIANT[ticket.priority] ?? "secondary";
  return (
    <Link href={`/client/tickets/${ticket.id}`}>
      <a className="flex items-start gap-4 px-4 py-4 hover-elevate cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{ticket.title}</p>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {ticket.priority === "urgent" && <Badge variant={priorityVariant}>Urgent</Badge>}
            {ticket.priority === "high" && <Badge variant={priorityVariant}>High</Badge>}
          </div>
          {ticket.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ticket.description}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            Opened {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            {ticket.location ? ` · ${ticket.location}` : ""}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
      </a>
    </Link>
  );
}

function CreateTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", category: "support", priority: "normal", location: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tickets", form);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request opened", description: "We've been notified and will reach out shortly." });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      onOpenChange(false);
      setForm({ title: "", description: "", category: "support", priority: "normal", location: "" });
    },
    onError: (err: Error) => toast({ title: "Couldn't open request", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New service request</DialogTitle>
          <DialogDescription>Tell us what's going on. If it's urgent (something is down), mark it that way so we page the on-call tech.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) mutation.mutate(); }}
          className="space-y-3"
        >
          <div>
            <Label>What's the problem?</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder='e.g. "WiFi is down at the Oceanside office"' required />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's affected, when it started, what you've already tried…" rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Location (optional)</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Main office, server closet" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim() || mutation.isPending}>
              {mutation.isPending ? "Opening…" : "Open request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
