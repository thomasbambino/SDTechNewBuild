import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Flag } from "lucide-react";

export interface TimelineItem {
  id: string;
  type: "start" | "milestone";
  date: string;
  title: string;
  notes: string | null;
  images: string[];
  projectName?: string | null;
  authorName?: string | null;
}

interface TimelineFeedProps {
  items: TimelineItem[];
  emptyMessage?: string;
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "SD";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PostImages({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="mt-3 block w-full overflow-hidden rounded-lg border bg-gray-50"
      >
        <img
          src={images[0]}
          alt="Update"
          className="w-full max-h-[480px] object-cover hover:opacity-95 transition-opacity"
          loading="lazy"
        />
      </button>
    );
  }
  if (images.length === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden border">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(i)}
            className="block overflow-hidden bg-gray-50"
          >
            <img src={src} alt={`Update ${i + 1}`} className="w-full h-64 object-cover hover:opacity-95 transition-opacity" loading="lazy" />
          </button>
        ))}
      </div>
    );
  }
  // 3+ images — primary image + stacked column
  const [primary, ...rest] = images;
  const extraCount = rest.length - 2;
  return (
    <div className="mt-3 grid grid-cols-3 gap-1 h-72 rounded-lg overflow-hidden border">
      <button
        type="button"
        onClick={() => onOpen(0)}
        className="col-span-2 row-span-2 block overflow-hidden bg-gray-50"
      >
        <img src={primary} alt="Update 1" className="w-full h-full object-cover hover:opacity-95 transition-opacity" loading="lazy" />
      </button>
      {rest.slice(0, 2).map((src, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(i + 1)}
          className="relative block overflow-hidden bg-gray-50"
        >
          <img src={src} alt={`Update ${i + 2}`} className="w-full h-full object-cover hover:opacity-95 transition-opacity" loading="lazy" />
          {i === 1 && extraCount > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-semibold">
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
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-white/10 rounded-full"
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
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-4 text-white/80 text-sm">{index + 1} / {images.length}</div>
      )}
    </div>
  );
}

export default function TimelineFeed({ items, emptyMessage = "No updates yet" }: TimelineFeedProps) {
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
