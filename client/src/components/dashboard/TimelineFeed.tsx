import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface TimelineItem {
  id: string;
  type: "start" | "milestone";
  date: string;
  title: string;
  notes: string | null;
  images: string[];
  projectName?: string | null;
  authorName?: string | null;
  // Optional admin payload: when present, the post renders an Edit/Delete menu.
  // Set only on milestones (not project kickoffs).
  adminMeta?: {
    milestoneId: number;
    projectId: number;
    createdAt: string;
    imagePaths: string[];
  };
}

interface TimelineFeedProps {
  items: TimelineItem[];
  emptyMessage?: string;
  // Called with the admin payload when the admin clicks Edit/Delete.
  onEdit?: (meta: NonNullable<TimelineItem["adminMeta"]>, item: TimelineItem) => void;
  onDelete?: (meta: NonNullable<TimelineItem["adminMeta"]>, item: TimelineItem) => void;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "SD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PostImages({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  if (images.length === 0) return null;

  const tile = (src: string, index: number, className = "") => (
    <button
      key={src + index}
      type="button"
      onClick={() => onOpen(index)}
      className={`relative block overflow-hidden bg-gray-50 ${className}`}
    >
      <img
        src={src}
        alt={`Update photo ${index + 1}`}
        className="w-full h-full object-cover hover:opacity-95 transition-opacity"
        loading="lazy"
      />
    </button>
  );

  if (images.length === 1) {
    return (
      <div className="mt-3 w-full overflow-hidden rounded-lg border bg-gray-50">
        <button
          type="button"
          onClick={() => onOpen(0)}
          className="block w-full"
        >
          <img
            src={images[0]}
            alt="Update"
            className="w-full max-h-[520px] object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </button>
      </div>
    );
  }

  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border h-80">
        {tile(images[0], 0, "h-full")}
        {tile(images[1], 1, "h-full")}
      </div>
    );
  }

  if (images.length === 3) {
    // Big left, two stacked right — the Facebook "3 up" layout.
    return (
      <div className="mt-3 grid grid-cols-3 grid-rows-2 gap-1 rounded-lg overflow-hidden border h-80">
        {tile(images[0], 0, "col-span-2 row-span-2")}
        {tile(images[1], 1)}
        {tile(images[2], 2)}
      </div>
    );
  }

  // 4+ photos: 2×2 grid, last tile shows "+N" when there are extras.
  const visible = images.slice(0, 4);
  const extraCount = images.length - 4;
  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border h-96">
      {visible.map((src, i) => (
        <button
          key={src + i}
          type="button"
          onClick={() => onOpen(i)}
          className="relative block overflow-hidden bg-gray-50"
        >
          <img
            src={src}
            alt={`Update photo ${i + 1}`}
            className="w-full h-full object-cover hover:opacity-95 transition-opacity"
            loading="lazy"
          />
          {i === 3 && extraCount > 0 && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-2xl font-semibold">
              +{extraCount}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Top bar: counter + close */}
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <div className="text-sm font-medium">
          {images.length > 1 ? `${index + 1} of ${images.length}` : "Photo"}
        </div>
        <button
          className="hover:text-white p-1"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main stage */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4">
        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <img
          src={images[index]}
          alt=""
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Thumbnail strip — only shown when there's more than one */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-black/60" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 overflow-x-auto scroll-smooth pb-1 justify-center">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={`relative flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-md overflow-hidden transition-all ${
                  i === index
                    ? "ring-2 ring-white scale-105"
                    : "opacity-60 hover:opacity-100"
                }`}
                aria-label={`Show photo ${i + 1}`}
              >
                <img src={src} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimelineFeed({ items, emptyMessage = "No updates yet", onEdit, onDelete }: TimelineFeedProps) {
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  if (items.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Project Timeline</h3>
          <p className="text-xs text-gray-500 mt-0.5">Updates from your team will appear here</p>
        </div>
        <p className="text-sm text-gray-400 text-center py-10">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white shadow-sm">
        <div className="px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Project Timeline</h3>
          <p className="text-xs text-gray-500 mt-0.5">Progress updates from your team</p>
        </div>
        <div className="divide-y">
          {items.map(item => (
            <article key={item.id} className="px-5 py-5">
              <header className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className={item.type === "start" ? "bg-primary/10 text-primary" : "bg-indigo-100 text-indigo-700"}>
                    {item.type === "start" ? <Flag className="h-4 w-4" /> : initialsOf(item.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    {item.type === "start" && (
                      <Badge variant="outline" className="text-xs">Project kickoff</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.projectName && <span className="font-medium">{item.projectName} · </span>}
                    {format(new Date(item.date), "MMM d, yyyy · h:mm a")}
                    {item.authorName && item.type !== "start" && <span> · by {item.authorName}</span>}
                  </p>
                </div>
                {item.adminMeta && (onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex-shrink-0 h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
                        aria-label="Post options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(item.adminMeta!, item)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit post
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(item.adminMeta!, item)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </header>

              {item.notes && (
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
              )}

              <PostImages images={item.images} onOpen={(index) => setLightbox({ images: item.images, index })} />
            </article>
          ))}
        </div>
      </Card>

      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
