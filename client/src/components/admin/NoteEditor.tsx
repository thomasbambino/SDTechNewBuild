import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface NoteField {
  label: string;
  value: string;
  isSecret?: boolean;
}

export interface NoteDraft {
  id?: number;
  title: string;
  content: string;
  category: string;
  fields: NoteField[];
  isPinned: boolean;
}

interface NoteEditorProps {
  clientId: number;
  open: boolean;
  onClose: () => void;
  initial?: NoteDraft;
  invalidateKeys?: readonly string[];
}

const CATEGORY_PRESETS: Record<string, NoteField[]> = {
  credentials: [
    { label: "Username", value: "", isSecret: false },
    { label: "Password", value: "", isSecret: true },
  ],
  network: [
    { label: "Wi-Fi SSID", value: "", isSecret: false },
    { label: "Wi-Fi Password", value: "", isSecret: true },
    { label: "VLAN", value: "", isSecret: false },
  ],
  access: [
    { label: "Door code", value: "", isSecret: true },
    { label: "Instructions", value: "", isSecret: false },
  ],
};

const emptyDraft: NoteDraft = {
  title: "",
  content: "",
  category: "general",
  fields: [],
  isPinned: false,
};

export default function NoteEditor({ clientId, open, onClose, initial, invalidateKeys }: NoteEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<NoteDraft>(initial ?? emptyDraft);

  useEffect(() => {
    if (open) setDraft(initial ?? emptyDraft);
  }, [open, initial]);

  const isEditing = !!initial?.id;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        clientId,
        title: draft.title.trim(),
        content: draft.content.trim(),
        category: draft.category,
        fields: draft.fields.filter(f => f.label.trim() || f.value.trim()),
        isPinned: draft.isPinned,
      };
      if (isEditing && initial?.id) {
        const res = await apiRequest("PUT", `/api/client-notes/${initial.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/client-notes", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEditing ? "Note updated" : "Note added" });
      (invalidateKeys ?? []).forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
      queryClient.invalidateQueries({ queryKey: ["/api/client-notes"] });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const setCategory = (category: string) => {
    setDraft(d => {
      // Only auto-populate preset fields if the user hasn't already added any.
      const shouldPreset = d.fields.length === 0 && CATEGORY_PRESETS[category];
      return {
        ...d,
        category,
        fields: shouldPreset ? CATEGORY_PRESETS[category].map(f => ({ ...f })) : d.fields,
      };
    });
  };

  const updateField = (index: number, patch: Partial<NoteField>) => {
    setDraft(d => ({ ...d, fields: d.fields.map((f, i) => i === index ? { ...f, ...patch } : f) }));
  };
  const addField = () => setDraft(d => ({ ...d, fields: [...d.fields, { label: "", value: "", isSecret: false }] }));
  const removeField = (index: number) => setDraft(d => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }));

  const canSave =
    draft.title.trim().length > 0 &&
    (draft.content.trim().length > 0 || draft.fields.some(f => f.label.trim() && f.value.trim()));

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Note" : "Add Note"}</DialogTitle>
          <DialogDescription>
            This will be visible to the client on their dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={draft.category} onValueChange={setCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General note</SelectItem>
                  <SelectItem value="credentials">Credentials</SelectItem>
                  <SelectItem value="network">Network (Wi-Fi / VLAN)</SelectItem>
                  <SelectItem value="access">Access / door codes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer h-9">
                <Checkbox checked={draft.isPinned} onCheckedChange={v => setDraft(d => ({ ...d, isPinned: !!v }))} />
                <Pin className="h-3.5 w-3.5 text-amber-500" />
                Pin to top
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Title</Label>
            <Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="e.g. Office Wi-Fi" />
          </div>

          <div>
            <Label className="text-xs">Notes {draft.category !== "general" && <span className="text-gray-400 font-normal">(optional)</span>}</Label>
            <Textarea
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="Context, instructions, anything the client should know…"
              rows={3}
              className="resize-none"
            />
          </div>

          {draft.category !== "general" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Fields</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addField}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add field
                </Button>
              </div>
              {draft.fields.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3 border border-dashed rounded-md">
                  No fields yet — click "Add field" to add Wi-Fi SSID / Password / VLAN.
                </p>
              ) : (
                <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                  {draft.fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-4 h-8 text-sm"
                        placeholder="Label"
                        value={field.label}
                        onChange={e => updateField(i, { label: e.target.value })}
                      />
                      <Input
                        className="col-span-6 h-8 text-sm font-mono"
                        placeholder="Value"
                        type={field.isSecret ? "password" : "text"}
                        value={field.value}
                        onChange={e => updateField(i, { value: e.target.value })}
                      />
                      <label className="col-span-1 flex items-center justify-center" title="Mask this value by default">
                        <Checkbox checked={!!field.isSecret} onCheckedChange={v => updateField(i, { isSecret: !!v })} />
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="col-span-1 h-8 w-8 p-0 text-destructive"
                        onClick={() => removeField(i)}
                        aria-label="Remove field"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 flex items-center gap-2 pt-1">
                    Check the lock box to mask the value (password, codes). Clients see "•••••••" and can click to reveal + copy.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save Changes" : "Add Note")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
