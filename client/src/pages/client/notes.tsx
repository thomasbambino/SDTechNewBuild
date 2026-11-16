import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import NoteCard, { NoteData, parseNoteFields, noteCategoryLabel } from "@/components/dashboard/NoteCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, KeyRound, MessageSquare } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Container                                                           */
/* ------------------------------------------------------------------ */

export default function ClientNotesPage() {
  const { data: notes = [], isLoading } = useQuery<NoteData[]>({ queryKey: ["/api/client-notes"] });
  return (
    <AppLayout>
      {isLoading ? <NotesSkeleton /> : <ClientNotesView notes={notes} />}
    </AppLayout>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

type Filter = "all" | "pinned" | string;

const CATEGORY_ORDER = ["network", "credentials", "access", "general"];

export function ClientNotesView({ notes }: { notes: NoteData[] }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Only offer category chips for categories that actually exist.
  const categories = useMemo(() => {
    const present = new Set(notes.map(n => n.category || "general"));
    return CATEGORY_ORDER.filter(c => present.has(c));
  }, [notes]);
  const hasPinned = notes.some(n => n.isPinned);

  // Search titles, body text and field labels. Never secret values.
  const matches = (n: NoteData) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [n.title, n.content, ...parseNoteFields(n.fields).flatMap(f => (f.isSecret ? [f.label] : [f.label, f.value]))]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };
  const inFilter = (n: NoteData) =>
    filter === "all" ? true : filter === "pinned" ? !!n.isPinned : (n.category || "general") === filter;

  const visible = notes.filter(n => matches(n) && inFilter(n));
  const pinned = visible.filter(n => n.isPinned);
  const rest = visible.filter(n => !n.isPinned);
  const isFiltering = query.trim() !== "" || filter !== "all";

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All notes" },
    ...(hasPinned ? [{ id: "pinned" as Filter, label: "Pinned" }] : []),
    ...categories.map(c => ({ id: c as Filter, label: noteCategoryLabel(c) })),
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-xl flex-col gap-1.5">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Reference</p>
          <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-none">Important notes</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-foreground/75">
            Reference info left for you: Wi-Fi, logins, codes and instructions. Hidden values stay hidden until you reveal them.
          </p>
        </div>
        {notes.length > 0 && (
          <label className="relative flex w-full items-center sm:w-[300px]">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
              className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        )}
      </div>

      {notes.length === 0 ? (
        <NotesZeroState onMessage={() => navigate("/client/messages")} />
      ) : (
        <>
          {/* Filter chips: only shown when there is something to filter by */}
          {chips.length > 2 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notes">
              {chips.map(c => {
                const on = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(c.id)}
                    className={`inline-flex h-9 items-center rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors ${
                      on ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground/80 hover:bg-accent"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-input bg-card px-6 py-12 text-center">
              <p className="font-display text-xl font-semibold">Nothing matches.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different search, or clear the filter.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); setFilter("all"); }}>Show all notes</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {pinned.length > 0 && (
                <NoteGroup title="Pinned" count={pinned.length} notes={pinned} />
              )}
              {rest.length > 0 && (
                <NoteGroup title={pinned.length > 0 ? (isFiltering ? "Also matching" : "Everything else") : isFiltering ? "Matching" : "All notes"} count={rest.length} notes={rest} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function NoteGroup({ title, count, notes }: { title: string; count: number; notes: NoteData[] }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-display text-[22px] font-semibold">{title}</h2>
        <span className="text-[13px] text-muted-foreground">{count} {count === 1 ? "note" : "notes"}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {notes.map(note => <NoteCard key={note.id} note={note} />)}
      </div>
    </section>
  );
}

function NotesZeroState({ onMessage }: { onMessage: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl border border-dashed border-input bg-card px-6 py-12 text-center">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-primary-soft text-primary-soft-foreground">
        <KeyRound className="h-8 w-8" strokeWidth={1.8} />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-3xl">No notes yet</h2>
        <p className="text-[15px] leading-relaxed text-foreground/75">
          Wi-Fi passwords, network details, logins and access codes left for you will show up here.
        </p>
      </div>
      <Button onClick={onMessage}><MessageSquare className="h-4 w-4" />Send a message</Button>
    </div>
  );
}

function NotesSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-4 py-7 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}</div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
