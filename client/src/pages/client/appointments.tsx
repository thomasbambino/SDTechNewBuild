import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Appointment {
  id: number;
  title: string;
  notes: string | null;
  location: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" | "danger" }> = {
  requested: { label: "Requested", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};

export default function ClientAppointmentsPage() {
  const { data: appts, isLoading } = useQuery<Appointment[]>({ queryKey: ["/api/appointments"] });
  const [createOpen, setCreateOpen] = useState(false);

  const upcoming = (appts || []).filter(a => !isPast(new Date(a.scheduledStart)) && a.status !== "cancelled");
  const past = (appts || []).filter(a => isPast(new Date(a.scheduledStart)) || a.status === "cancelled");

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Service</p>
            <h1 className="text-3xl sm:text-4xl">Site visits</h1>
            <p className="text-sm text-muted-foreground mt-1">Request an on-site visit, or review ones we've already got on the books.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Request visit
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (appts || []).length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-display text-xl font-semibold">Nothing scheduled</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Need someone on-site? Request a window that works for you and we'll confirm.</p>
            <Button onClick={() => setCreateOpen(true)}>Request a visit</Button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">Upcoming</h2>
                <div className="rounded-lg border divide-y bg-card">
                  {upcoming.map(a => <ApptRow key={a.id} appt={a} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-2">Past</h2>
                <div className="rounded-lg border divide-y bg-card">
                  {past.map(a => <ApptRow key={a.id} appt={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <RequestVisitDialog open={createOpen} onOpenChange={setCreateOpen} />
    </AppLayout>
  );
}

function ApptRow({ appt }: { appt: Appointment }) {
  const meta = STATUS_META[appt.status] ?? { label: appt.status, variant: "secondary" as const };
  const start = new Date(appt.scheduledStart);
  const end = new Date(appt.scheduledEnd);
  return (
    <div className="px-4 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium">{appt.title}</p>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="text-sm mt-1">
          {format(start, "EEE, MMM d · h:mm a")} – {format(end, "h:mm a")}
        </p>
        {appt.location && <p className="text-xs text-muted-foreground mt-0.5">{appt.location}</p>}
        {appt.notes && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{appt.notes}</p>}
      </div>
    </div>
  );
}

function RequestVisitDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const end = new Date(d);
    end.setHours(11, 0, 0, 0);
    return {
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
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        location: form.location.trim() || null,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Visit requested", description: "We'll confirm the window as soon as a tech can take it." });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "Couldn't request visit", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request an on-site visit</DialogTitle>
          <DialogDescription>Pick a window that works for you — we'll confirm or counter-propose if the slot is taken.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) mutation.mutate(); }} className="space-y-3">
          <div>
            <Label>Reason for the visit</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder='e.g. "Install new access point"' required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={form.scheduledStart}
                onChange={e => setForm(f => ({ ...f, scheduledStart: e.target.value }))} required />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={form.scheduledEnd}
                onChange={e => setForm(f => ({ ...f, scheduledEnd: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Address or room" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Access instructions, what to bring, who to ask for…" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title.trim() || mutation.isPending}>
              {mutation.isPending ? "Requesting…" : "Request visit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** <input type="datetime-local"> wants `YYYY-MM-DDTHH:mm` in LOCAL time. */
function formatLocalDT(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
