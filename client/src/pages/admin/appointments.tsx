import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow, startOfDay } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

interface Appointment {
  id: number;
  clientId: number;
  projectId: number | null;
  ticketId: number | null;
  title: string;
  notes: string | null;
  location: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  assignedTo: number | null;
}

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" | "danger" }> = {
  requested: { label: "Requested", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export default function AdminAppointmentsPage() {
  const { data: appts, isLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const [createOpen, setCreateOpen] = useState(false);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const grouped = useMemo(() => {
    const buckets: { label: string; items: Appointment[] }[] = [
      { label: "Needs confirmation", items: [] },
      { label: "Today", items: [] },
      { label: "Tomorrow", items: [] },
      { label: "Upcoming", items: [] },
      { label: "Past", items: [] },
    ];
    for (const a of appts || []) {
      const start = new Date(a.scheduledStart);
      if (a.status === "requested") buckets[0].items.push(a);
      else if (a.status === "cancelled" || isPast(start)) buckets[4].items.push(a);
      else if (isToday(start)) buckets[1].items.push(a);
      else if (isTomorrow(start)) buckets[2].items.push(a);
      else buckets[3].items.push(a);
    }
    return buckets.filter(b => b.items.length > 0);
  }, [appts]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</p>
            <h1 className="text-3xl sm:text-4xl">On-site visits</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Schedule visit
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nothing on the schedule.</p>
        ) : (
          grouped.map(g => (
            <section key={g.label}>
              <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">
                {g.label} <span className="text-foreground/50">· {g.items.length}</span>
              </h2>
              <div className="rounded-lg border divide-y bg-card">
                {g.items.map(a => <ApptRow key={a.id} appt={a} clientName={clientMap.get(a.clientId) || "Unknown"} />)}
              </div>
            </section>
          ))
        )}
      </div>

      <ScheduleVisitDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients} />
    </AppLayout>
  );
}

function ApptRow({ appt, clientName }: { appt: Appointment; clientName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = STATUS_META[appt.status] ?? { label: appt.status, variant: "secondary" as const };
  const start = new Date(appt.scheduledStart);
  const end = new Date(appt.scheduledEnd);

  const update = useMutation({
    mutationFn: async (patch: Partial<Appointment>) => {
      const res = await apiRequest("PUT", `/api/appointments/${appt.id}`, patch);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/appointments"] }),
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="px-4 py-4 flex items-start gap-4 flex-wrap">
      <div className="flex-1 min-w-[260px]">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{appt.title}</p>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mt-1">{clientName}</p>
        <p className="text-sm mt-0.5">{format(start, "EEE, MMM d · h:mm a")} – {format(end, "h:mm a")}</p>
        {appt.location && <p className="text-xs text-muted-foreground">{appt.location}</p>}
        {appt.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{appt.notes}</p>}
      </div>
      <div className="flex gap-1">
        {appt.status === "requested" && (
          <Button size="sm" onClick={() => update.mutate({ status: "confirmed" })}>Confirm</Button>
        )}
        {appt.status === "confirmed" && (
          <Button size="sm" variant="outline" onClick={() => update.mutate({ status: "completed" })}>Mark complete</Button>
        )}
        {appt.status !== "cancelled" && appt.status !== "completed" && (
          <Button size="sm" variant="ghost" onClick={() => update.mutate({ status: "cancelled" })}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

function ScheduleVisitDialog({ open, onOpenChange, clients }: { open: boolean; onOpenChange: (open: boolean) => void; clients: Client[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const end = new Date(d);
    end.setHours(11, 0, 0, 0);
    return {
      clientId: "",
      title: "",
      notes: "",
      location: "",
      scheduledStart: formatLocalDT(d),
      scheduledEnd: formatLocalDT(end),
    };
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/appointments", {
        clientId: parseInt(form.clientId),
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        location: form.location.trim() || null,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Visit scheduled" });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "Couldn't schedule", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule a visit</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (form.clientId && form.title.trim()) mutation.mutate(); }} className="space-y-3">
          <div>
            <Label>Client</Label>
            <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
              <SelectTrigger><SelectValue placeholder="Pick a client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={form.scheduledStart} onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} required /></div>
            <div><Label>End</Label><Input type="datetime-local" value={form.scheduledEnd} onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} required /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.clientId || !form.title.trim() || mutation.isPending}>Schedule</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatLocalDT(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
