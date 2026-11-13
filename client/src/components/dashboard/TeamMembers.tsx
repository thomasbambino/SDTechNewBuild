import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Member {
  id: number;
  name: string;
  email: string;
  username: string;
  status: string;
  isPrimary: boolean;
}

interface TeamMembersProps {
  clientId: number;
  canManage: boolean;
}

export default function TeamMembers({ clientId, canManage }: TeamMembersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [credential, setCredential] = useState<{ username: string; tempPassword: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: [`/api/clients/${clientId}/members`],
    enabled: !isNaN(clientId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/members`] });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/members`, {
        name: form.name.trim(),
        email: form.email.trim(),
      });
      return res.json() as Promise<{ username: string; tempPassword: string; userId: number }>;
    },
    onSuccess: (data) => {
      invalidate();
      setAddOpen(false);
      setCredential({ username: data.username, tempPassword: data.tempPassword, name: form.name.trim() });
      setForm({ name: "", email: "" });
    },
    onError: (err: Error) => toast({ title: "Couldn't add member", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/members/${userId}`);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Team member removed" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: "Remove failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>
            Everyone here can log in and see this account's projects, notes, and invoices.
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No team members yet.</p>
        ) : (
          <div className="divide-y border rounded-md">
            {members.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                  {m.name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    {m.isPrimary && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <ShieldCheck className="h-3 w-3" /> Primary
                      </Badge>
                    )}
                    {m.status === "disabled" && (
                      <Badge variant="destructive" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> <span className="truncate">{m.email}</span>
                  </div>
                </div>
                {canManage && !m.isPrimary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(m)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={o => { if (!o) setAddOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Give them a name and email. We'll generate a login and show you the password once so you can pass it along.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Email</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !form.name.trim() || !form.email.trim()}
            >
              {addMutation.isPending ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credential reveal */}
      <Dialog open={!!credential} onOpenChange={o => { if (!o) setCredential(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login created for {credential?.name}</DialogTitle>
            <DialogDescription>
              Copy these now — the password won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div><span className="text-gray-500">Username: </span><strong>{credential?.username}</strong></div>
            <div><span className="text-gray-500">Password: </span><strong className="font-mono">{credential?.tempPassword}</strong></div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (credential) navigator.clipboard?.writeText(`Username: ${credential.username}\nPassword: ${credential.tempPassword}`);
                toast({ title: "Copied to clipboard" });
              }}
            >
              Copy
            </Button>
            <Button onClick={() => setCredential(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be disabled and lose access to this account. You can re-add them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (deleteTarget) removeMutation.mutate(deleteTarget.id); }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
