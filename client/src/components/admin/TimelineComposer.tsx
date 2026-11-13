import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import heic2any from "heic2any";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Send, Star, ArrowLeft, ArrowRight, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Project {
  id: number;
  name: string;
}

interface TimelineComposerProps {
  projects: Project[];
  clientId: number;
  defaultProjectId?: number;
}

export default function TimelineComposer({ projects, clientId, defaultProjectId }: TimelineComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState<number | undefined>(defaultProjectId ?? projects[0]?.id);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const uploading = uploadProgress !== null;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Pick a project first");
      if (!title.trim()) throw new Error("Give it a title");
      const res = await apiRequest("POST", "/api/milestones", {
        projectId,
        title: title.trim(),
        notes: body.trim() || null,
        imagePaths,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Posted to the timeline" });
      setTitle("");
      setBody("");
      setImagePaths([]);
      queryClient.invalidateQueries({ queryKey: [`/api/timeline/admin?clientId=${clientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/timeline/client"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/milestones`] });
    },
    onError: (err: Error) => toast({ title: "Post failed", description: err.message, variant: "destructive" }),
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
      <Card className="p-5 bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Create a project for this client before posting updates.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium flex-shrink-0">Project:</label>
        <Select value={projectId?.toString()} onValueChange={(v) => setProjectId(parseInt(v))}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a project…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Headline — e.g. Rack installed, cables run"
        className="font-medium"
      />

      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Describe what happened on site, what's next, anything the client should know…"
        rows={4}
        className="resize-none"
      />

      {imagePaths.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ImageIcon className="h-3.5 w-3.5" />
              {imagePaths.length} photo{imagePaths.length === 1 ? "" : "s"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => setImagePaths([])}
            >
              Clear all
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {imagePaths.map((src, i) => (
              <div key={src + i} className="relative group aspect-square rounded-md overflow-hidden border bg-gray-50">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <Badge className="absolute top-1.5 left-1.5 bg-primary text-white text-xs gap-1 shadow">
                    <Star className="h-3 w-3" /> Lead
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      aria-label="Move left"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    {i !== 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => makePrimary(i)}
                        aria-label="Make lead photo"
                        title="Make lead photo"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === imagePaths.length - 1}
                      aria-label="Move right"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-black text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Hover a photo to reorder, remove, or make it the lead (the big one that shows first in the feed).
          </p>
        </div>
      )}

      <div
        className="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 hover:border-muted-foreground/30 transition-colors"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (!uploading && e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
      >
        {uploading ? (
          <>
            <Loader2 className="h-6 w-6 mx-auto text-primary animate-spin" />
            <p className="text-sm text-gray-600 mt-2">
              Uploading {uploadProgress!.done + 1} of {uploadProgress!.total}…
            </p>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-gray-600 mt-2 font-medium">Drop photos here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">JPEG · PNG · HEIC · GIF · WebP</p>
            <p className="text-xs text-gray-400 mt-0.5">Select multiple with Shift-click or Cmd-click</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || uploading || !title.trim() || !projectId}
        >
          <Send className="h-4 w-4 mr-2" />
          {createMutation.isPending ? "Posting…" : "Post Update"}
        </Button>
      </div>
    </Card>
  );
}
