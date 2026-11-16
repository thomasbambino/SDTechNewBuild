import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw, Upload, X, Loader2 } from "lucide-react";
import heic2any from "heic2any";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SITE_STRING_REGISTRY, type SiteStringKey } from "@/lib/siteStrings";

export default function SiteTextPage() {
  const { toast } = useToast();
  const { data: overrides = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-strings"],
  });

  // Local draft state: the admin can edit several fields before saving.
  // Only dirty rows get sent on Save.
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Seed the draft with current values once the query resolves.
  useEffect(() => {
    if (isLoading) return;
    const seed: Record<string, string> = {};
    for (const key of Object.keys(SITE_STRING_REGISTRY) as SiteStringKey[]) {
      seed[key] = overrides[key] ?? SITE_STRING_REGISTRY[key].default;
    }
    setDraft(seed);
  }, [isLoading, overrides]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, SiteStringKey[]>();
    for (const key of Object.keys(SITE_STRING_REGISTRY) as SiteStringKey[]) {
      const g = SITE_STRING_REGISTRY[key].group;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(key);
    }
    return Array.from(byGroup.entries());
  }, []);

  const dirty = useMemo(() => {
    const changed: Record<string, string> = {};
    for (const key of Object.keys(draft) as SiteStringKey[]) {
      const current = overrides[key] ?? SITE_STRING_REGISTRY[key].default;
      if (draft[key] !== current) changed[key] = draft[key];
    }
    return changed;
  }, [draft, overrides]);

  const dirtyCount = Object.keys(dirty).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/site-strings", dirty);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `Saved ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/site-strings"] });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const resetToDefault = (key: SiteStringKey) => {
    setDraft(d => ({ ...d, [key]: SITE_STRING_REGISTRY[key].default }));
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Text</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Every editable string on the public website lives here. Changes apply instantly after you save — no deploy needed.
              Leave a field matching its default to not override it.
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={dirtyCount === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : dirtyCount === 0 ? "No changes" : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-sm text-gray-500">Loading…</CardContent></Card>
        ) : (
          groups.map(([groupName, keys]) => (
            <Card key={groupName}>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-display text-lg font-semibold">{groupName}</h2>
                <div className="space-y-5">
                  {keys.map(key => {
                    const entry = SITE_STRING_REGISTRY[key];
                    const current = draft[key] ?? "";
                    const isDirty = key in dirty;
                    const isDefault = current === entry.default;
                    const InputCmp = entry.multiline ? Textarea : Input;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">
                            {entry.label}
                            {isDirty && <span className="ml-2 text-xs font-normal text-amber-600">Unsaved</span>}
                          </Label>
                          {!isDefault && (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => resetToDefault(key)}
                            >
                              <RotateCcw className="h-3 w-3" /> Reset
                            </button>
                          )}
                        </div>
                        {entry.kind === "image" ? (
                          <ImageField
                            value={current}
                            onChange={(url) => setDraft(d => ({ ...d, [key]: url }))}
                          />
                        ) : (
                          <InputCmp
                            value={current}
                            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [key]: e.target.value }))}
                            rows={entry.multiline ? 3 : undefined}
                            className={entry.multiline ? "resize-none" : ""}
                          />
                        )}
                        {entry.help && (
                          <p className="text-xs text-gray-500">{entry.help}</p>
                        )}
                        <p className="text-[11px] text-gray-400 font-mono">{key}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Sticky footer save for long scrolling */}
        <div className="sticky bottom-4 flex justify-end">
          {dirtyCount > 0 && (
            <Button
              size="lg"
              className="shadow-lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving…" : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      // Convert HEIC in the browser so the server's magic-byte check accepts it.
      let prepped: File = file;
      const isHeic = file.type === "image/heic" || file.type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
      if (isHeic) {
        try {
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          prepped = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
        } catch {
          // Let the server's heic-convert fallback handle it.
          prepped = new File([file], file.name, { type: file.type || "image/heic" });
        }
      }
      const fd = new FormData();
      fd.append("image", prepped);
      const res = await fetch("/api/content/image", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let message = text;
        try { const j = JSON.parse(text); if (j.message) message = j.message; } catch { /* keep */ }
        throw new Error(message || "Upload failed");
      }
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-32 w-32 object-cover rounded-md border" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 h-32 flex flex-col items-center justify-center gap-1"
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault(); e.stopPropagation();
            if (!uploading && e.dataTransfer.files?.[0]) upload(e.dataTransfer.files[0]);
          }}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Click or drop an image</p>
            </>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ""; }}
      />
    </div>
  );
}
