import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Circle, Plus, Trash2, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export interface TaskRow {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  completedAt: string | null;
  completedBy: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskListProps {
  tasks: TaskRow[];
  projectId: number;          // For new-task POSTs
  canEdit: boolean;           // Admin true; client false
  /** Query keys to invalidate when the list mutates. */
  refreshKeys: readonly string[];
  /** When true, hide completed items behind a toggle (good for client-facing views). */
  collapseCompleted?: boolean;
  emptyMessage?: string;
}

export default function TaskList({
  tasks,
  projectId,
  canEdit,
  refreshKeys,
  collapseCompleted = false,
  emptyMessage = "Nothing on the list yet.",
}: TaskListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(!collapseCompleted);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; description: string }>({ title: "", description: "" });

  const invalidate = () => refreshKeys.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));

  const open = tasks.filter(t => !t.completedAt);
  const done = tasks.filter(t => t.completedAt);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/tasks`, { title: newTitle.trim() });
      return res.json();
    },
    onSuccess: () => { setNewTitle(""); invalidate(); },
    onError: (err: Error) => toast({ title: "Couldn't add", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, unknown> }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, patch);
      return res.json();
    },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/tasks/${id}`); },
    onSuccess: invalidate,
    onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
  });

  const toggle = (task: TaskRow) => {
    if (!canEdit) return;
    updateMutation.mutate({ id: task.id, patch: { completed: !task.completedAt } });
  };

  const startEdit = (task: TaskRow) => {
    setEditingId(task.id);
    setEditDraft({ title: task.title, description: task.description ?? "" });
  };

  const saveEdit = () => {
    if (editingId == null) return;
    updateMutation.mutate({
      id: editingId,
      patch: { title: editDraft.title.trim(), description: editDraft.description.trim() || null },
    });
    setEditingId(null);
  };

  const renderTask = (task: TaskRow) => {
    const isEditing = editingId === task.id;
    const complete = !!task.completedAt;
    return (
      <li key={task.id} className={cn("group flex items-start gap-3 py-2.5", isEditing && "flex-col items-stretch gap-2")}>
        {!isEditing && (
          <button
            type="button"
            onClick={() => toggle(task)}
            disabled={!canEdit}
            className={cn(
              "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
              complete
                ? "border-primary bg-primary text-primary-foreground"
                : canEdit
                  ? "border-input hover:border-primary"
                  : "border-input cursor-default",
            )}
            aria-label={complete ? "Mark as not done" : "Mark as done"}
          >
            {complete ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 opacity-0" />}
          </button>
        )}
        {isEditing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editDraft.title}
              onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Task title"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && editDraft.title.trim()) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  setEditingId(null);
                }
              }}
            />
            <Textarea
              value={editDraft.description}
              onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Details (optional)"
              rows={2}
              className="resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} disabled={!editDraft.title.trim()}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex-1 min-w-0 text-left cursor-text disabled:cursor-default"
            onClick={() => canEdit && startEdit(task)}
            disabled={!canEdit}
            aria-label={canEdit ? `Edit task: ${task.title}` : task.title}
          >
            <p className={cn("text-sm", complete && "line-through text-muted-foreground")}>{task.title}</p>
            {task.description && (
              <p className={cn("text-xs mt-0.5 whitespace-pre-wrap", complete ? "text-muted-foreground/70" : "text-muted-foreground")}>
                {task.description}
              </p>
            )}
            {complete && task.completedAt && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Done {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
              </p>
            )}
          </button>
        )}
        {canEdit && !isEditing && (
          <div className="flex gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => startEdit(task)}
              className="h-8 w-8 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
              aria-label="Edit task"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete task "${task.title}"?`)) deleteMutation.mutate(task.id); }}
              className="h-8 w-8 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground"
              aria-label="Delete task"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) createMutation.mutate(); }}
          className="flex gap-2"
        >
          <Input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a task… (e.g. Mount NVR in rack)"
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={!newTitle.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
      ) : (
        <>
          {open.length > 0 && (
            <ul className="divide-y">
              {open.map(renderTask)}
            </ul>
          )}

          {done.length > 0 && (
            <div className="pt-1">
              {collapseCompleted ? (
                <button
                  type="button"
                  onClick={() => setShowCompleted(v => !v)}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showCompleted ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {showCompleted ? "Hide" : "Show"} completed ({done.length})
                </button>
              ) : (
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-1">
                  Completed ({done.length})
                </p>
              )}
              {(!collapseCompleted || showCompleted) && (
                <ul className="divide-y">
                  {done.map(renderTask)}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
