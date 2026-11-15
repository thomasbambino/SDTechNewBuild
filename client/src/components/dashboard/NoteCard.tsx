import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Pin, Eye, EyeOff, Copy, Check } from "lucide-react";
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
  /** Rail layout: tighter, body text clamped. */
  compact?: boolean;
}

export function parseNoteFields(raw: string | null | undefined): NoteField[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function noteCategoryLabel(category: string | null | undefined): string {
  switch (category) {
    case "credentials": return "Login";
    case "network": return "Network";
    case "access": return "Access";
    default: return "Note";
  }
}

/** One label/value row. Secret values show dots until revealed, and re-hide after 30 s. */
export function NoteFieldRow({ field, compact = false }: { field: NoteField; compact?: boolean }) {
  const [revealed, setRevealed] = useState(!field.isSecret);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const toggle = () => {
    const next = !revealed;
    setRevealed(next);
    if (next && field.isSecret) setTimeout(() => setRevealed(false), 30_000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(field.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Couldn't copy", description: "Select the value and copy it by hand.", variant: "destructive" });
    }
  };

  return (
    <div className={`flex items-center gap-2 rounded-lg bg-muted ${compact ? "min-h-[44px] px-3 py-1.5" : "min-h-[48px] px-3 py-2"}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-foreground/70">{field.label}</span>
        <span className={`truncate font-mono text-[14px] font-medium ${!revealed ? "tracking-[0.18em]" : ""}`}>
          {revealed ? field.value : "•".repeat(compact ? 8 : Math.min(Math.max(field.value.length, 8), 14))}
        </span>
      </div>
      {field.isSecret && (
        <Button variant="outline" size="sm" className="h-8 px-2.5 text-[13px]" onClick={toggle}>
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? "Hide" : "Reveal"}
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={copy} aria-label={`Copy ${field.label}`}>
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export default function NoteCard({ note, action, compact = false }: NoteCardProps) {
  const fields = parseNoteFields(note.fields);

  return (
    <div className={`flex flex-col gap-3 rounded-xl border bg-card ${note.isPinned ? "border-signal" : "border-border"} ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-[22px] items-center rounded border border-input px-2 font-display text-[11.5px] font-semibold uppercase tracking-[0.1em] text-foreground/80">
              {noteCategoryLabel(note.category)}
            </span>
            {note.isPinned && (
              <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-signal-soft px-2 text-[11.5px] font-semibold text-signal-soft-foreground">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
          </div>
          <p className={`font-semibold leading-tight ${compact ? "text-[15px]" : "text-[17px]"}`}>{note.title}</p>
        </div>
        {action}
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {fields.map((f, i) => <NoteFieldRow key={i} field={f} compact={compact} />)}
        </div>
      )}

      {note.content && (
        <p className={`whitespace-pre-line text-[14px] leading-relaxed text-foreground/80 ${compact ? "line-clamp-3" : ""}`}>{note.content}</p>
      )}

      <p className="border-t border-border pt-2.5 text-[12.5px] text-muted-foreground">
        Left {format(new Date(note.createdAt), "MMM d, yyyy")}
      </p>
    </div>
  );
}
