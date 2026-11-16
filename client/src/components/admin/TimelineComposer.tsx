import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import heic2any from "heic2any";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Star, ArrowLeft, ArrowRight, Loader2, Camera, Images, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Project {
  id: number;
  name: string;
}

export interface ExistingPost {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  imagePaths: string[];
  createdAt: string;
}

interface TimelineComposerProps {
  projects: Project[];
  clientId: number;
  defaultProjectId?: number;
  // When provided, the composer is in "edit" mode: PUTs instead of POSTs
  // and seeds fields from the post. onCancel / onSaved let callers dismiss.
  editing?: ExistingPost;
  onCancel?: () => void;
  onSaved?: () => void;
}

// For <input type="datetime-local"> the browser expects YYYY-MM-DDTHH:mm in
// local time, not ISO 8601 UTC.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TimelineComposer({ projects, clientId, defaultProjectId, editing, onCancel, onSaved }: TimelineComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState<number | undefined>(editing?.projectId ?? defaultProjectId ?? projects[0]?.id);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.notes ?? "");
  const [imagePaths, setImagePaths] = useState<string[]>(editing?.imagePaths ?? []);
  // Default to the existing post's timestamp when editing, otherwise "now".
  const initialTs = editing ? new Date(editing.createdAt) : new Date();
  const [postedAt, setPostedAt] = useState<string>(toLocalInputValue(initialTs));
  const [customTime, setCustomTime] = useState<boolean>(!!editing);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const uploading = uploadProgress !== null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Pick a project first");
      if (!title.trim()) throw new Error("Give it a title");
      // datetime-local returns a local-time string; convert to ISO for the API.
      // Only send createdAt when the admin explicitly set one — otherwise let
      // the server default to the request time.
      const createdAt = customTime ? new Date(postedAt).toISOString() : undefined;
      const payload = {
        projectId,
        title: title.trim(),
        notes: body.trim() || null,
        imagePaths,
        ...(createdAt ? { createdAt } : {}),
      };
      if (editing) {
        const res = await apiRequest("PUT", `/api/milestones/${editing.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/milestones", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: editing ? "Post updated" : "Posted to the timeline" });
      if (!editing) {
        setTitle("");
        setBody("");
        setImagePaths([]);
        setCustomTime(false);
        setPostedAt(toLocalInputValue(new Date()));
      }
      queryClient.invalidateQueries({ queryKey: [`/api/timeline/admin?clientId=${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/client"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
      onSaved?.();
    },
    onError: (err: Error) => toast({ title: editing ? "Update failed" : "Post failed", description: err.message, variant: "destructive" }),
  });

  const prepareFile = async (file: File): Promise<File | null> => {
    const isHeic = file.type === "image/heic"
      || file.type === "image/heif"
      || /\.(heic|heif)$/i.test(file.name);
    if (!isHeic && !file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: `${file.name} was skipped.`, variant: "destructive" });
      return null;
    }
    if (!isHeic) return file;
    // Try the client-side HEIC → JPEG fast path first. If heic2any chokes
    // on this particular variant (Live Photo, 10-bit HDR, newer brand),
    // fall through and upload the raw HEIC — the server has a heic-convert
    // fallback that handles the variants heic2any can't.
    try {
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
    } catch {
      // Hand off the raw HEIC to the server.
      return new File([file], file.name, { type: file.type || "image/heic" });
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadProgress({ done: 0, total: list.length });

    const uploaded: string[] = [];
    const failures: string[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const prepped = await prepareFile(list[i]);
        if (!prepped) {
          setUploadProgress(p => p ? { ...p, done: p.done + 1 } : p);
          continue;
        }
        try {
          const fd = new FormData();
          fd.append("image", prepped);
          const res = await fetch("/api/milestones/image", { method: "POST", credentials: "include", body: fd });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            let message = text;
            try { const j = JSON.parse(text); if (j.message) message = j.message; } catch { /* keep raw */ }
            throw new Error(message || `Upload failed`);
          }
          const data = await res.json();
          if (data.url) uploaded.push(data.url);
        } catch (err: any) {
          // Don't abort the batch — remember the failure and keep going.
          failures.push(`${prepped.name}: ${err.message}`);
        }
        setUploadProgress(p => p ? { ...p, done: p.done + 1 } : p);
      }
    } finally {
      // Always commit whatever succeeded, even if some files failed.
      if (uploaded.length > 0) setImagePaths(prev => [...prev, ...uploaded]);
      setUploadProgress(null);
    }

    if (failures.length > 0) {
      toast({
        title: failures.length === list.length ? "No files uploaded" : `${failures.length} of ${list.length} failed`,
        description: failures.slice(0, 3).join(" · ") + (failures.length > 3 ? ` · +${failures.length - 3} more` : ""),
        variant: "destructive",
      });
    }
  };

  const removeImage = (index: number) => {
    setImagePaths(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImagePaths(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const makePrimary = (index: number) => {
    setImagePaths(prev => {
      if (index === 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked);
      return next;
    });
  };

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-input bg-card px-5 py-6 text-center text-sm text-muted-foreground">
        Create a project for this client before posting updates.
      </div>
    );
  }

  const tile = "relative aspect-square overflow-hidden rounded-[10px] border border-border bg-muted";

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-md sm:p-5" aria-label={editing ? "Edit update" : "New update"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{editing ? "Edit update" : "New update"}</h2>
        {projects.length === 1 ? (
          <span className="truncate text-[13px] text-muted-foreground">{projects[0].name}</span>
        ) : (
          <Select value={projectId?.toString()} onValueChange={(v) => setProjectId(parseInt(v))}>
            <SelectTrigger className="h-10 w-auto max-w-[60%] gap-2 border-input text-[13.5px]" aria-label="Project">
              <SelectValue placeholder="Pick a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="composer-title" className="text-[13px] font-semibold text-foreground/80">Headline</label>
        <Input
          id="composer-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Building C cameras online: 38 of 112 done"
          className="h-12 font-display text-[22px] font-semibold tracking-tight placeholder:font-sans placeholder:text-base placeholder:font-normal"
        />
        <p className="text-[12px] text-muted-foreground">Short and specific. Numbers help.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="composer-body" className="text-[13px] font-semibold text-foreground/80">What happened</label>
        <Textarea
          id="composer-body"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What was done and what's next."
          rows={4}
          className="resize-none text-[15px] leading-relaxed"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-foreground/80">
            Photos{imagePaths.length > 0 ? ` · ${imagePaths.length}` : ""}
          </span>
          <span className="text-[12px] text-muted-foreground">HEIC is fine · up to 15 MB each</span>
        </div>
        <div
          className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (!uploading && e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
        >
          <button
            type="button"
            onClick={() => !uploading && cameraInputRef.current?.click()}
            disabled={uploading}
            className={`${tile} flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-input bg-card text-[13px] font-semibold text-primary hover:bg-accent/60 disabled:opacity-60 sm:hidden`}
          >
            <Camera className="h-6 w-6" /> Camera
          </button>
          <button
            type="button"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className={`${tile} flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-input bg-card text-[13px] font-semibold text-primary hover:bg-accent/60 disabled:opacity-60`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[11.5px] font-medium text-muted-foreground">{uploadProgress!.done + 1} of {uploadProgress!.total}</span>
              </>
            ) : (
              <>
                <Images className="h-6 w-6" />
                <span className="sm:hidden">Library</span>
                <span className="hidden sm:inline">Add photos</span>
              </>
            )}
          </button>
          {imagePaths.map((src, i) => (
            <div key={src + i} className={`${tile} group`}>
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 inline-flex h-5 items-center gap-1 rounded bg-primary px-1.5 font-display text-[10.5px] font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow">
                  <Star className="h-2.5 w-2.5" /> Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white disabled:opacity-30" aria-label="Move earlier"><ArrowLeft className="h-3.5 w-3.5" /></button>
                {i !== 0 && (
                  <button type="button" onClick={() => makePrimary(i)} className="flex h-7 items-center justify-center rounded-md bg-black/60 px-1.5 text-[11px] font-semibold text-white" aria-label="Make cover photo">Cover</button>
                )}
                <button type="button" onClick={() => moveImage(i, 1)} disabled={i === imagePaths.length - 1} className="flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white disabled:opacity-30" aria-label="Move later"><ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        {imagePaths.length > 1 && (
          <p className="text-[12px] text-muted-foreground">The cover photo shows first in the feed. Use the arrows to reorder.</p>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />
      </div>

      <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
        <button
          type="button"
          onClick={() => {
            const next = !customTime;
            setCustomTime(next);
            if (next) setPostedAt(toLocalInputValue(editing ? new Date(editing.createdAt) : new Date()));
          }}
          className="flex min-h-[48px] items-center justify-between gap-3 px-3.5 text-left text-[14px]"
          aria-expanded={customTime}
        >
          <span className="flex items-center gap-2.5 font-medium text-foreground/80"><Clock className="h-4 w-4 text-muted-foreground" />Timestamp</span>
          <span className="font-semibold">{customTime ? "Custom" : editing ? "Keep original" : "Now"}</span>
        </button>
        {customTime && (
          <div className="flex flex-wrap items-center gap-2 px-3.5 py-3">
            <input
              type="datetime-local"
              value={postedAt}
              onChange={e => setPostedAt(e.target.value)}
              aria-label="Posted at"
              className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-[14px]"
            />
            <span className="text-[12px] text-muted-foreground">Use this to backdate a post.</span>
          </div>
        )}
      </div>

      <div className="flex gap-2.5 pt-1">
        {(editing || onCancel) && (
          <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={() => onCancel?.()} disabled={saveMutation.isPending}>
            Cancel
          </Button>
        )}
        <Button
         
          size="lg"
          className="flex-[2] sm:flex-none"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || uploading || !title.trim() || !projectId}
        >
          <Send className="h-4 w-4" />
          {saveMutation.isPending ? (editing ? "Saving…" : "Posting…") : (editing ? "Save changes" : "Post update")}
        </Button>
      </div>
    </section>
  );
}
