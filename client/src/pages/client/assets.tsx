import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Server, Router, Camera, Video, Shield, Wifi, Zap, HardDrive } from "lucide-react";

export interface Asset {
  id: number;
  category: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  firmware: string | null;
  location: string | null;
  installedAt: string | null;
  warrantyExpiresAt: string | null;
  notes: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  switch: "Switches",
  router: "Routers",
  ap: "Access points",
  camera: "Cameras",
  nvr: "Recorders",
  firewall: "Firewalls",
  server: "Servers",
  ups: "UPS / Power",
  other: "Other",
};

const CATEGORY_ICON: Record<string, any> = {
  switch: Router,
  router: Router,
  ap: Wifi,
  camera: Camera,
  nvr: Video,
  firewall: Shield,
  server: Server,
  ups: Zap,
  other: HardDrive,
};

export default function ClientAssetsPage() {
  const { data: assets, isLoading } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });

  const grouped: Record<string, Asset[]> = {};
  for (const a of assets || []) {
    const key = a.category || "other";
    (grouped[key] ||= []).push(a);
  }
  const categories = Object.keys(grouped).sort();

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1100px] px-4 py-7 sm:px-6 lg:px-8 space-y-6">
        <div>
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Equipment</p>
          <h1 className="text-3xl sm:text-4xl">Your inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">What's installed on your network, with warranty and model details.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !assets || assets.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <HardDrive className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-display text-xl font-semibold">No equipment logged yet</p>
            <p className="text-sm text-muted-foreground mt-1">We'll fill this in as we install and document gear at your site.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map(cat => {
              const Icon = CATEGORY_ICON[cat] || HardDrive;
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {CATEGORY_LABELS[cat] || cat} <span className="text-foreground/50">· {grouped[cat].length}</span>
                    </h2>
                  </div>
                  <div className="rounded-lg border divide-y bg-card">
                    {grouped[cat].map(a => <AssetRow key={a.id} asset={a} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AssetRow({ asset }: { asset: Asset }) {
  const warrantyBadge = warrantyStatus(asset.warrantyExpiresAt);
  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{asset.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[asset.manufacturer, asset.model].filter(Boolean).join(" · ")}
            {asset.location ? ` · ${asset.location}` : ""}
          </p>
        </div>
        {warrantyBadge && <Badge variant={warrantyBadge.variant}>{warrantyBadge.label}</Badge>}
      </div>
      {(asset.serialNumber || asset.firmware || asset.installedAt) && (
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {asset.serialNumber && <Field label="Serial" value={asset.serialNumber} mono />}
          {asset.firmware && <Field label="Firmware" value={asset.firmware} mono />}
          {asset.installedAt && <Field label="Installed" value={format(new Date(asset.installedAt), "MMM yyyy")} />}
          {asset.warrantyExpiresAt && <Field label="Warranty" value={format(new Date(asset.warrantyExpiresAt), "MMM yyyy")} />}
        </dl>
      )}
      {asset.notes && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{asset.notes}</p>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`${mono ? "font-mono" : ""} text-foreground`}>{value}</dd>
    </div>
  );
}

function warrantyStatus(expiresAt: string | null): { label: string; variant: "success" | "warning" | "danger" | "secondary" } | null {
  if (!expiresAt) return null;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return { label: "Out of warranty", variant: "danger" };
  if (days < 60) return { label: `Warranty: ${days}d left`, variant: "warning" };
  return { label: "Under warranty", variant: "success" };
}
