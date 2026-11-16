import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: number;
  name: string;
  description: string | null;
  monthlyPrice: number;
  includedHours: number | null;
  features: string | null;
  isActive: boolean;
}

interface ClientPlan {
  id: number;
  status: string;
  startedAt: string;
  plan: Plan;
}

export default function PlanPanel({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = useQuery<ClientPlan | null>({ queryKey: [`/api/clients/${clientId}/plan`] });
  const { data: available = [] } = useQuery<Plan[]>({ queryKey: ["/api/service-plans"] });

  const assign = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/plan`, { planId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/plan`] });
      toast({ title: "Plan assigned" });
    },
    onError: (err: Error) => toast({ title: "Couldn't assign", description: err.message, variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/clients/${clientId}/plan`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/plan`] });
      toast({ title: "Plan cancelled" });
    },
    onError: (err: Error) => toast({ title: "Cancel failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>;

  return (
    <div className="space-y-4">
      {plan ? (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-lg">{plan.plan.name}</p>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                ${plan.plan.monthlyPrice}/mo
                {plan.plan.includedHours != null && ` · ${plan.plan.includedHours}h included`}
                {plan.startedAt && ` · Since ${format(new Date(plan.startedAt), "MMM yyyy")}`}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { if (confirm("Cancel this plan?")) cancel.mutate(); }}>Cancel plan</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
          No active plan on this client. Assign one below if they're on a managed-services agreement.
        </div>
      )}

      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No plans defined yet. <Link href="/admin/service-plans"><a className="underline">Create one</a></Link>.
        </p>
      ) : (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Assign {plan ? "new" : "a"} plan</p>
            <Select onValueChange={v => assign.mutate(parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Pick a plan…" /></SelectTrigger>
              <SelectContent>
                {available.filter(p => p.isActive).map(p => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} · ${p.monthlyPrice}/mo</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
