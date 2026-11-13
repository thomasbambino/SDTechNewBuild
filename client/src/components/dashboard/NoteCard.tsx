import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, Eye, EyeOff, Copy, KeyRound, Wifi, Shield, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface NoteField {
  label: string;
  value: string;
  isSecret?: boolean;
}

export interface NoteData {
  id: number;
  title: string;
  content: string;
  category?: string | null;
  fields?: string | null; // JSON-encoded NoteField[]
  isPinned?: boolean | null;
  createdAt: string;
}

interface NoteCardProps {
  note: NoteData;
  action?: React.ReactNode; // optional trailing admin action, e.g. delete button
}

function parseFields(raw: string | null | undefined): NoteField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function categoryMeta(category: string | null | undefined) {
  switch (category) {
    case "credentials": return { label: "Credentials", icon: <KeyRound className="h-3.5 w-3.5" />, color: "bg-amber-50 text-amber-800 border-amber-200" };
    case "network": return { label: "Network", icon: <Wifi className="h-3.5 w-3.5" />, color: "bg-blue-50 text-blue-800 border-blue-200" };
    case "access": return { label: "Access", icon: <Shield className="h-3.5 w-3.5" />, color: "bg-purple-50 text-purple-800 border-purple-200" };
    default: return { label: "Note", icon: <StickyNote className="h-3.5 w-3.5" />, color: "bg-gray-50 text-gray-700 border-gray-200" };
  }
}

function FieldRow({ field }: { field: NoteField }) {
  const [revealed, setRevealed] = useState(!field.isSecret);
  const { toast } = useToast();
  const copy = () => {
    navigator.clipboard?.writeText(field.value);
    toast({ title: "Copied" });
  };
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="text-xs font-medium text-gray-500 w-32 flex-shrink-0 pt-0.5">{field.label}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-mono break-all ${!revealed ? "tracking-widest" : ""}`}>
          {revealed ? field.value : "•".repeat(Math.min(field.value.length, 16))}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        {field.isSecret && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRevealed(v => !v)} aria-label={revealed ? "Hide" : "Reveal"}>
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copy} aria-label="Copy">
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function NoteCard({ note, action }: NoteCardProps) {
  const meta = categoryMeta(note.category);
  const fields = parseFields(note.fields);

  return (
    <div className="border rounded-lg bg-white">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {note.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
            <p className="font-semibold text-sm text-gray-900">{note.title}</p>
            <Badge variant="outline" className={`text-xs gap-1 ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(note.createdAt), "MMM d, yyyy")}</p>
        </div>
        {action}
      </div>
      <div className="px-4 py-3 space-y-2">
        {note.content && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
        )}
        {fields.length > 0 && (
          <div className="divide-y rounded-md border bg-gray-50/50">
            {fields.map((f, i) => <div key={i} className="px-3"><FieldRow field={f} /></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
