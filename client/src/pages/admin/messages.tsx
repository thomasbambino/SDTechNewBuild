import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  clientId: number;
  senderUserId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ClientThread {
  clientId: number;
  unreadCount: number;
  latestMessage: Message | null;
  client: { id: number; name: string; email: string | null } | null;
}

export default function AdminMessagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: threads = [], isLoading: threadsLoading } = useQuery<ClientThread[]>({
    queryKey: ["/api/messages/clients"],
    refetchInterval: 15000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedClientId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?clientId=${selectedClientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      // Immediately clear unread count and thread badges after fetching
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/clients"] });
      return data;
    },
    enabled: !!selectedClientId,
    refetchInterval: 10000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { content, clientId: selectedClientId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/clients"] });
      setNewMessage("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !selectedClientId) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select first thread
  useEffect(() => {
    if (threads.length > 0 && !selectedClientId) setSelectedClientId(threads[0].clientId);
  }, [threads]);

  const selectedClient = threads.find(t => t.clientId === selectedClientId)?.client;
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <AppLayout>
      <div className="flex h-full min-h-0">
        {/* Thread list */}
        <div className="w-72 border-r flex flex-col flex-shrink-0">
          <div className="px-4 py-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Messages</h2>
              {totalUnread > 0 && <Badge className="bg-primary text-primary-foreground text-xs">{totalUnread}</Badge>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="p-4 text-sm text-gray-400">Loading…</div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No messages yet</p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.clientId}
                  onClick={() => setSelectedClientId(thread.clientId)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${selectedClientId === thread.clientId ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900 truncate">{thread.client?.name ?? `Client #${thread.clientId}`}</span>
                    {thread.unreadCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs ml-2 flex-shrink-0">{thread.unreadCount}</Badge>
                    )}
                  </div>
                  {thread.latestMessage && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{thread.latestMessage.content}</p>
                  )}
                  {thread.latestMessage && (
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(thread.latestMessage.createdAt), "MMM d, h:mm a")}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedClientId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-3 border-b flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {(selectedClient?.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedClient?.name ?? `Client #${selectedClientId}`}</p>
                  {selectedClient?.email && <p className="text-xs text-gray-400">{selectedClient.email}</p>}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                {messagesLoading ? (
                  <div className="text-center text-sm text-gray-400 py-8">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-8">No messages yet. Send the first one.</div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderUserId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                          {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{selectedClient?.name ?? "Client"}</p>}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? "opacity-60 text-right" : "text-muted-foreground"}`}>
                            {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-6 py-4 border-t flex-shrink-0">
                <div className="flex gap-3 items-end">
                  <Textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Reply… (Enter to send)"
                    className="resize-none flex-1 min-h-[60px] max-h-32"
                    rows={2}
                  />
                  <Button onClick={handleSend} disabled={sendMutation.isPending || !newMessage.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
