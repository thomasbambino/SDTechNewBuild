import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  includedHours: number | null;
  features: string | null;
  isActive: boolean;
}

export default function AdminServicePlansPage() {
  const { data: plans, isLoading } = useQuery<Plan[]>({ queryKey: ["/api/service-plans"] });
  const [editing, setEditing] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1000px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Billing</p>
            <h1 className="text-3xl sm:text-4xl">Service plans</h1>
            <p className="text-sm text-muted-foreground mt-1">Define the managed-services plans you offer. Assign them per-client from the client detail page.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New plan
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !plans || plans.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-display text-xl font-semibold">No plans yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create a plan to offer managed services.</p>
            <Button onClick={() => setCreateOpen(true)}>Create first plan</Button>
          </div>
        ) : (
          <div className="rounded-lg border divide-y bg-card">
            {plans.map(p => <PlanRow key={p.id} plan={p} onEdit={() => setEditing(p)} />)}
          </div>
        )}
      </div>

      {createOpen && <PlanDialog open={createOpen} onOpenChange={setCreateOpen} plan={null} />}
      {editing && <PlanDialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} plan={editing} />}
    </AppLayout>
  );
}

function PlanRow({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/service-plans/${plan.id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/service-plans"] }),
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
  const features: string[] = (() => {
    if (!plan.features) return [];
    try { const p = JSON.parse(plan.features); return Array.isArray(p) ? p.filter(s => typeof s === "string") : []; }
    catch { return []; }
  })();

  return (
    <div className="px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-semibold text-lg">{plan.name}</p>
          <span className="text-sm text-muted-foreground">${plan.monthlyPrice}/mo</span>
          {plan.includedHours != null && <span className="text-xs text-muted-foreground">· {plan.includedHours}h included</span>}
          {!plan.isActive && <Badge variant="secondary">Inactive</Badge>}
        </div>
        {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
        {features.length > 0 && (
          <ul className="text-xs text-muted-foreground mt-2 list-disc ml-4">
            {features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete plan "${plan.name}"?`)) del.mutate(); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (o: boolean) => void; plan: Plan | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const features: string[] = (() => {
      if (!plan?.features) return [];
      try { const p = JSON.parse(plan.features); return Array.isArray(p) ? p.filter(s => typeof s === "string") : []; }
      catch { return []; }
    })();
    return {
      name: plan?.name || "",
      description: plan?.description || "",
      monthlyPrice: plan?.monthlyPrice != null ? String(plan.monthlyPrice) : "",
      includedHours: plan?.includedHours != null ? String(plan.includedHours) : "",
      features: features.join("\n"),
      isActive: plan?.isActive ?? true,
    };
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        monthlyPrice: Number(form.monthlyPrice) || 0,
        includedHours: form.includedHours ? Number(form.includedHours) : null,
        features: JSON.stringify(form.features.split("\n").map(s => s.trim()).filter(Boolean)),
        isActive: form.isActive,
      };
      const res = plan
        ? await apiRequest("PUT", `/api/service-plans/${plan.id}`, payload)
        : await apiRequest("POST", "/api/service-plans", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-plans"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{plan ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) save.mutate(); }} className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monthly price ($)</Label><Input type="number" min="0" step="1" value={form.monthlyPrice} onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))} /></div>
            <div><Label>Included hours (optional)</Label><Input type="number" min="0" step="0.5" value={form.includedHours} onChange={e => setForm(f => ({ ...f, includedHours: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Features (one per line)</Label>
            <Textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} rows={5}
              placeholder="24/7 monitoring&#10;Quarterly network audit&#10;Priority response" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label>Active (show to new clients)</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.name.trim() || save.isPending}>{plan ? "Save" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
