import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Pin, StickyNote } from "lucide-react";
import NoteCard, { NoteData } from "@/components/dashboard/NoteCard";

export default function ClientNotesPage() {
  const { data: notes = [], isLoading } = useQuery<NoteData[]>({
    queryKey: ["/api/client-notes"],
  });

  const pinned = notes.filter(n => n.isPinned);
  const rest = notes.filter(n => !n.isPinned);

  return (
    <AppLayout>
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-primary" />
            Notes & Details
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Wi-Fi credentials, VLAN assignments, access codes, and other reference info your technician left for you.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-gray-500">
              Loading notes…
            </CardContent>
          </Card>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <StickyNote className="h-10 w-10 mx-auto text-gray-300" />
              <p className="mt-3 font-medium text-gray-700">No notes yet</p>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                When your technician adds important reference info — Wi-Fi passwords, VLAN assignments,
                door codes — it'll appear here. You can ask them to add anything you want recorded.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Pin className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pinned</h2>
                </div>
                <div className="space-y-3">
                  {pinned.map(note => <NoteCard key={note.id} note={note} />)}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="space-y-3">
                {pinned.length > 0 && (
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-1">All Notes</h2>
                )}
                <div className="space-y-3">
                  {rest.map(note => <NoteCard key={note.id} note={note} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
