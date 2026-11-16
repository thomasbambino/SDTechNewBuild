import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Asset } from "@/pages/client/assets";

const CATEGORIES = [
  { value: "switch", label: "Switch" },
  { value: "router", label: "Router" },
  { value: "ap", label: "Access point" },
  { value: "camera", label: "Camera" },
  { value: "nvr", label: "NVR / Recorder" },
  { value: "firewall", label: "Firewall" },
  { value: "server", label: "Server" },
  { value: "ups", label: "UPS / Power" },
  { value: "other", label: "Other" },
];

export default function AssetsPanel({ clientId }: { clientId: number }) {
  const { data: assets = [], isLoading } = useQuery<Asset[]>({ queryKey: [`/api/assets?clientId=${clientId}`] });
  const [editing, setEditing] = useState<Asset | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Equipment on-site. Clients see this on their Inventory page.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add equipment
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Nothing logged yet. Add what's installed on-site to give the client visibility.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y bg-card">
          {assets.map(a => <AssetRow key={a.id} asset={a} clientId={clientId} onEdit={() => setEditing(a)} />)}
        </div>
      )}

      {createOpen && <AssetDialog open={createOpen} onOpenChange={setCreateOpen} clientId={clientId} asset={null} />}
      {editing && <AssetDialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }} clientId={clientId} asset={editing} />}
    </div>
  );
}

function AssetRow({ asset, clientId, onEdit }: { asset: Asset; clientId: number; onEdit: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const del = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/assets/${asset.id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/assets?clientId=${clientId}`] }),
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });
  const warranty = warrantyStatus(asset.warrantyExpiresAt);
  const cat = CATEGORIES.find(c => c.value === asset.category)?.label || asset.category;

  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="font-medium">{asset.name}</p>
          <span className="text-xs text-muted-foreground">{cat}</span>
          {warranty && <Badge variant={warranty.variant}>{warranty.label}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[asset.manufacturer, asset.model, asset.location].filter(Boolean).join(" · ")}
        </p>
        {(asset.serialNumber || asset.installedAt) && (
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {asset.serialNumber && <>SN: <span className="font-mono">{asset.serialNumber}</span></>}
            {asset.installedAt && <> · Installed {format(new Date(asset.installedAt), "MMM yyyy")}</>}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${asset.name}"?`)) del.mutate(); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function warrantyStatus(expiresAt: string | null): { label: string; variant: "success" | "warning" | "danger" } | null {
  if (!expiresAt) return null;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return { label: "Out of warranty", variant: "danger" };
  if (days < 60) return { label: `${days}d left`, variant: "warning" };
  return { label: "Under warranty", variant: "success" };
}

function AssetDialog({ open, onOpenChange, clientId, asset }: { open: boolean; onOpenChange: (o: boolean) => void; clientId: number; asset: Asset | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    category: asset?.category || "switch",
    name: asset?.name || "",
    manufacturer: asset?.manufacturer || "",
    model: asset?.model || "",
    serialNumber: asset?.serialNumber || "",
    firmware: asset?.firmware || "",
    location: asset?.location || "",
    installedAt: asset?.installedAt ? asset.installedAt.slice(0, 10) : "",
    warrantyExpiresAt: asset?.warrantyExpiresAt ? asset.warrantyExpiresAt.slice(0, 10) : "",
    notes: asset?.notes || "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        clientId,
        category: form.category,
        name: form.name.trim(),
        manufacturer: form.manufacturer.trim() || null,
        model: form.model.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        firmware: form.firmware.trim() || null,
        location: form.location.trim() || null,
        installedAt: form.installedAt ? new Date(form.installedAt).toISOString() : null,
        warrantyExpiresAt: form.warrantyExpiresAt ? new Date(form.warrantyExpiresAt).toISOString() : null,
        notes: form.notes.trim() || null,
      };
      const res = asset
        ? await apiRequest("PUT", `/api/assets/${asset.id}`, payload)
        : await apiRequest("POST", "/api/assets", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/assets?clientId=${clientId}`] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{asset ? "Edit equipment" : "Add equipment"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) save.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Serial number</Label><Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} /></div>
            <div><Label>Firmware</Label><Input value={form.firmware} onChange={e => setForm(f => ({ ...f, firmware: e.target.value }))} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Installed</Label><Input type="date" value={form.installedAt} onChange={e => setForm(f => ({ ...f, installedAt: e.target.value }))} /></div>
            <div><Label>Warranty expires</Label><Input type="date" value={form.warrantyExpiresAt} onChange={e => setForm(f => ({ ...f, warrantyExpiresAt: e.target.value }))} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.name.trim() || save.isPending}>{asset ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
