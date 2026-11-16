import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, Package } from "lucide-react";

interface Plan {
  id: number;
  clientId: number;
  planId: number;
  status: string;
  startedAt: string;
  plan: {
    id: number;
    name: string;
    description: string | null;
    monthlyPrice: number;
    includedHours: number | null;
    features: string | null;
  };
}

export default function ClientPlanPage() {
  const { data: plan, isLoading } = useQuery<Plan | null>({ queryKey: ["/api/my/plan"] });

  const features: string[] = (() => {
    if (!plan?.plan.features) return [];
    try {
      const parsed = JSON.parse(plan.plan.features);
      return Array.isArray(parsed) ? parsed.filter(s => typeof s === "string") : [];
    } catch { return []; }
  })();

  return (
    <AppLayout>
      <div className="mx-auto max-w-[800px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div>
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Account</p>
          <h1 className="text-3xl sm:text-4xl">Your service plan</h1>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : !plan ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-display text-xl font-semibold">No active plan</p>
            <p className="text-sm text-muted-foreground mt-1">
              Not on a managed-services plan yet. Ask us about one if you'd like predictable monthly support instead of per-visit billing.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="px-6 py-5 border-b">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">{plan.plan.name}</h2>
                  {plan.plan.description && (
                    <p className="text-sm text-muted-foreground mt-1">{plan.plan.description}</p>
                  )}
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
            <div className="px-6 py-5 grid sm:grid-cols-3 gap-5">
              <Stat label="Monthly" value={formatCurrency(plan.plan.monthlyPrice)} />
              {plan.plan.includedHours != null && (
                <Stat label="Included hours" value={`${plan.plan.includedHours}/mo`} />
              )}
              <Stat label="Active since" value={format(new Date(plan.startedAt), "MMM yyyy")} />
            </div>
            {features.length > 0 && (
              <div className="px-6 py-5 border-t">
                <p className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">What's included</p>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="font-semibold text-xl mt-0.5">{value}</p>
    </div>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
