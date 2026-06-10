import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Send } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: number;
  clientId: number;
  senderUserId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function ClientMessagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/messages", { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Your conversation with the SD Tech Pros team</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {isLoading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-1">Send a message below to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderUserId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                    {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">SD Tech Pros</p>}
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

        <div className="px-6 py-4 border-t bg-background flex-shrink-0">
          <div className="flex gap-3 items-end">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              className="resize-none flex-1 min-h-[60px] max-h-32"
              rows={2}
            />
            <Button onClick={handleSend} disabled={sendMutation.isPending || !newMessage.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
