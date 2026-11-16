// Cache the /api/settings/public response in localStorage so a page refresh
// renders with the previous logo / company name / theme instantly, without
// a flash of the generic defaults. The inline bootstrap script in index.html
// reads the same key to set <html class="dark"> / document.title / favicon
// before React mounts.

import type { QueryClient } from "@tanstack/react-query";

const KEY = "publicSettings";
export const PUBLIC_SETTINGS_QUERY_KEY = "/api/settings/public";

export interface CachedPublicSettings {
  companyName?: string;
  logoPath?: string | null;
  favicon?: string | null;
  siteTitle?: string | null;
  theme?: "light" | "dark";
  primaryColor?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
}

export function readCachedPublicSettings(): CachedPublicSettings | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedPublicSettings(value: CachedPublicSettings | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // quota exceeded / disabled — ignore
  }
}

/**
 * Subscribes the query cache so every successful response for
 * /api/settings/public gets mirrored to localStorage. Called once at app
 * startup; unsubscribes aren't necessary because it lives for the page.
 */
export function syncPublicSettingsCache(queryClient: QueryClient): void {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated") return;
    const key = event.query.queryKey?.[0];
    if (key !== PUBLIC_SETTINGS_QUERY_KEY) return;
    const data = event.query.state.data as CachedPublicSettings | undefined;
    if (data && typeof data === "object") writeCachedPublicSettings(data);
  });
}
