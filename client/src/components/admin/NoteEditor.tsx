import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Lock, Unlock } from "lucide-react";
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

  const categoryLabel: Record<string, string> = { general: "Note", credentials: "Login", network: "Network", access: "Access" };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[100dvh] w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-h-[90vh] sm:max-w-xl sm:rounded-xl">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="font-display text-2xl font-semibold">{isEditing ? "Edit note" : "New note"}</DialogTitle>
          <DialogDescription className="text-[13px]">Visible to the client under Notes. Locked values are hidden until revealed.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title" className="text-[13px] font-semibold text-foreground/80">Title</Label>
            <Input
              id="note-title"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Staff Wi-Fi, NVR login, server closet keypad"
              className="h-12 text-[17px] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-semibold text-foreground/80">Category</Label>
              <Select value={draft.category} onValueChange={setCategory}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Note</SelectItem>
                  <SelectItem value="credentials">Login</SelectItem>
                  <SelectItem value="network">Network (Wi-Fi / VLAN)</SelectItem>
                  <SelectItem value="access">Access / door codes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-pinned" className="text-[13px] font-semibold text-foreground/80">Pinned to dashboard</Label>
              <label htmlFor="note-pinned" className="flex h-11 cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 text-[14px] font-semibold">
                {draft.isPinned ? "On" : "Off"}
                <Switch id="note-pinned" checked={draft.isPinned} onCheckedChange={v => setDraft(d => ({ ...d, isPinned: !!v }))} />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-[13px] font-semibold text-foreground/80">Values</Label>
              <span className="text-[12px] text-muted-foreground">Lock = hidden from the client until they reveal it</span>
            </div>
            {draft.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-input px-3 py-3 text-center text-[13px] text-muted-foreground">
                {draft.category === "general" ? "Optional. Add a value for anything the client will copy: a password, an IP, a code." : "No values yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {draft.fields.map((field, i) => (
                  <div key={i} className={`flex flex-col gap-2 rounded-xl border bg-card p-2.5 ${field.isSecret ? "border-primary" : "border-border"}`}>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-9 flex-1 border-0 bg-transparent px-1 text-[13px] font-semibold shadow-none focus-visible:ring-1"
                        placeholder="Label (Password, SSID, Code)"
                        value={field.label}
                        onChange={e => updateField(i, { label: e.target.value })}
                        aria-label="Label"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`h-9 w-9 p-0 ${field.isSecret ? "border-primary bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft" : "text-muted-foreground"}`}
                        onClick={() => updateField(i, { isSecret: !field.isSecret })}
                        aria-pressed={!!field.isSecret}
                        aria-label={field.isSecret ? "Secret, tap to make visible" : "Visible, tap to make secret"}
                      >
                        {field.isSecret ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground" onClick={() => removeField(i)} aria-label="Remove value">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      className="h-11 border-transparent bg-muted font-mono text-[15px]"
                      placeholder="Value"
                      type="text"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      value={field.value}
                      onChange={e => updateField(i, { value: e.target.value })}
                      aria-label="Value"
                    />
                    {field.isSecret && (
                      <p className="text-[12px] font-medium text-primary">Hidden from the client until they reveal it. You always see what you type.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" className="h-11 w-full border-dashed" onClick={addField}>
              <Plus className="h-4 w-4" /> Add a value
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-content" className="text-[13px] font-semibold text-foreground/80">
              Instructions {draft.category !== "general" && <span className="font-normal text-muted-foreground">(optional)</span>}
            </Label>
            <Textarea
              id="note-content"
              value={draft.content}
              onChange={e => setDraft(d => ({ ...d, content: e.target.value }))}
              placeholder="Instructions or context for the client."
              rows={4}
              className="resize-none text-[14.5px] leading-relaxed"
            />
          </div>
          <p className="text-[12.5px] text-muted-foreground">Shown to the client as a {categoryLabel[draft.category] ?? "Note"} card. Hidden values are encrypted at rest.</p>
        </div>

        <DialogFooter className="flex-row gap-2.5 border-t border-border px-5 py-4 sm:justify-end">
          <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={onClose}>Cancel</Button>
          <Button size="lg" className="flex-[2] sm:flex-none" onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
            {saveMutation.isPending ? (isEditing ? "Saving…" : "Adding…") : (isEditing ? "Save note" : "Add note")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
