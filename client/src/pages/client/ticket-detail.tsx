import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Ticket } from "./tickets";

interface TicketComment {
  id: number;
  ticketId: number;
  userId: number;
  content: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
}

type TicketWithComments = Ticket & { comments: TicketComment[] };

const STATUS_META: Record<string, { label: string; variant: "info" | "success" | "warning" | "secondary" | "danger" }> = {
  new:          { label: "New", variant: "info" },
  acknowledged: { label: "Acknowledged", variant: "secondary" },
  in_progress:  { label: "In progress", variant: "info" },
  scheduled:    { label: "Scheduled", variant: "warning" },
  resolved:     { label: "Resolved", variant: "success" },
  closed:       { label: "Closed", variant: "secondary" },
};

export default function ClientTicketDetailPage() {
  const [, params] = useRoute("/client/tickets/:id");
  const [, navigate] = useLocation();
  const id = params?.id ? parseInt(params.id) : null;
  const { data: ticket, isLoading } = useQuery<TicketWithComments>({
    queryKey: [`/api/tickets/${id}`],
    enabled: id != null,
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-[800px] px-4 py-7 sm:px-6 lg:px-8 space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/client/tickets")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to requests
        </Button>

        {isLoading || !ticket ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <TicketHeader ticket={ticket} />
            <CommentsSection ticket={ticket} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

function TicketHeader({ ticket }: { ticket: TicketWithComments }) {
  const meta = STATUS_META[ticket.status] ?? { label: ticket.status, variant: "secondary" as const };
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Opened {format(new Date(ticket.createdAt), "MMM d, yyyy · h:mm a")}
            {ticket.location ? ` · ${ticket.location}` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {ticket.priority === "urgent" && <Badge variant="danger">Urgent</Badge>}
          {ticket.priority === "high" && <Badge variant="warning">High</Badge>}
        </div>
      </div>
      {ticket.description && (
        <p className="text-sm whitespace-pre-wrap mt-4 leading-relaxed">{ticket.description}</p>
      )}
    </div>
  );
}

function CommentsSection({ ticket }: { ticket: TicketWithComments }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tickets/${ticket.id}/comments`, { content: content.trim() });
      return res.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticket.id}`] });
    },
    onError: (err: Error) => toast({ title: "Couldn't send", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-5 border-b">
        <h2 className="font-display text-lg font-semibold">Conversation</h2>
      </div>
      {ticket.comments.length === 0 ? (
        <p className="text-sm text-muted-foreground px-5 py-6 text-center">No replies yet.</p>
      ) : (
        <ul className="divide-y">
          {ticket.comments.map(c => (
            <li key={c.id} className="p-5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="font-medium text-sm">
                  {c.authorName || "Unknown"}
                  {(c.authorRole === "admin" || c.authorRole === "internal") && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">Team</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1">{c.content}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="p-4 border-t space-y-2"
        onSubmit={(e) => { e.preventDefault(); if (content.trim()) addComment.mutate(); }}
      >
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Add a reply, question, or update…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!content.trim() || addComment.isPending}>
            <Send className="h-4 w-4 mr-2" /> Send
          </Button>
        </div>
      </form>
    </div>
  );
}
