import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SITE_STRING_REGISTRY, type SiteStringKey } from "@/lib/siteStrings";

export default function SiteTextPage() {
  const { toast } = useToast();
  const { data: overrides = {}, isLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-strings"],
  });

  // Local draft state: the admin can edit several fields before saving.
  // Only dirty rows get sent on Save.
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Seed the draft with current values once the query resolves.
  useEffect(() => {
    if (isLoading) return;
    const seed: Record<string, string> = {};
    for (const key of Object.keys(SITE_STRING_REGISTRY) as SiteStringKey[]) {
      seed[key] = overrides[key] ?? SITE_STRING_REGISTRY[key].default;
    }
    setDraft(seed);
  }, [isLoading, overrides]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, SiteStringKey[]>();
    for (const key of Object.keys(SITE_STRING_REGISTRY) as SiteStringKey[]) {
      const g = SITE_STRING_REGISTRY[key].group;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(key);
    }
    return Array.from(byGroup.entries());
  }, []);

  const dirty = useMemo(() => {
    const changed: Record<string, string> = {};
    for (const key of Object.keys(draft) as SiteStringKey[]) {
      const current = overrides[key] ?? SITE_STRING_REGISTRY[key].default;
      if (draft[key] !== current) changed[key] = draft[key];
    }
    return changed;
  }, [draft, overrides]);

  const dirtyCount = Object.keys(dirty).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/site-strings", dirty);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: `Saved ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}` });
      queryClient.invalidateQueries({ queryKey: ["/api/site-strings"] });
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const resetToDefault = (key: SiteStringKey) => {
    setDraft(d => ({ ...d, [key]: SITE_STRING_REGISTRY[key].default }));
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Text</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Every editable string on the public website lives here. Changes apply instantly after you save — no deploy needed.
              Leave a field matching its default to not override it.
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={dirtyCount === 0 || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : dirtyCount === 0 ? "No changes" : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
          </Button>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6 text-center text-sm text-gray-500">Loading…</CardContent></Card>
        ) : (
          groups.map(([groupName, keys]) => (
            <Card key={groupName}>
              <CardContent className="p-5 space-y-5">
                <h2 className="font-display text-lg font-semibold">{groupName}</h2>
                <div className="space-y-5">
                  {keys.map(key => {
                    const entry = SITE_STRING_REGISTRY[key];
                    const current = draft[key] ?? "";
                    const isDirty = key in dirty;
                    const isDefault = current === entry.default;
                    const InputCmp = entry.multiline ? Textarea : Input;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">
                            {entry.label}
                            {isDirty && <span className="ml-2 text-xs font-normal text-amber-600">Unsaved</span>}
                          </Label>
                          {!isDefault && (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                              onClick={() => resetToDefault(key)}
                            >
                              <RotateCcw className="h-3 w-3" /> Reset
                            </button>
                          )}
                        </div>
                        <InputCmp
                          value={current}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [key]: e.target.value }))}
                          rows={entry.multiline ? 3 : undefined}
                          className={entry.multiline ? "resize-none" : ""}
                        />
                        {entry.help && (
                          <p className="text-xs text-gray-500">{entry.help}</p>
                        )}
                        <p className="text-[11px] text-gray-400 font-mono">{key}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Sticky footer save for long scrolling */}
        <div className="sticky bottom-4 flex justify-end">
          {dirtyCount > 0 && (
            <Button
              size="lg"
              className="shadow-lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Saving…" : `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
