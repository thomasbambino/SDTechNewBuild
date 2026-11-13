import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Upload, X, Send } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);

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

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/milestones/image", { method: "POST", credentials: "include", body: fd });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Upload failed for ${file.name}`);
        }
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      }
      setImagePaths(prev => [...prev, ...uploaded]);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImagePaths(prev => prev.filter((_, i) => i !== index));
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
        <div className="grid grid-cols-4 gap-2">
          {imagePaths.map((src, i) => (
            <div key={i} className="relative group aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover rounded-md border" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="border-2 border-dashed border-muted rounded-md p-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files); }}
      >
        <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-1">
          {uploading ? "Uploading…" : "Drop photos here or click to upload (PNG/JPEG/GIF/WebP)"}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
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
