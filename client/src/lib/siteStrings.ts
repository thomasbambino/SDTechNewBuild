import { useQuery } from "@tanstack/react-query";

// Every editable string the UI uses. Add new entries here; the admin
// Site Text editor auto-renders inputs for everything in the registry.
//
// Keep keys snake_case, lowercase, and grouped by section so the admin
// page can render them in the order they appear on-screen.
export interface SiteStringEntry {
  default: string;
  label: string;      // What the admin sees above the input
  help?: string;      // Optional caption under the input
  group: string;      // Section heading in the admin editor
  multiline?: boolean;
  /** When "image", the admin editor renders an upload widget instead of a text input. */
  kind?: "text" | "image";
}

export const SITE_STRING_REGISTRY: Record<string, SiteStringEntry> = {
  // ─────────────────────── Navigation ───────────────────────
  nav_recent_work: { default: "Recent work", label: "Nav: Recent work", group: "Navigation" },
  nav_services: { default: "Services", label: "Nav: Services", group: "Navigation" },
  nav_how_it_works: { default: "How it works", label: "Nav: How it works", group: "Navigation" },
  nav_portal_authenticated: { default: "Go to dashboard", label: "Nav: Portal link (logged in)", group: "Navigation" },
  nav_portal_guest: { default: "Client login", label: "Nav: Portal link (guest)", group: "Navigation" },
  nav_cta_button: { default: "Get a quote", label: "Nav: Primary button", group: "Navigation" },
  nav_menu_title: { default: "Menu", label: "Mobile menu heading", group: "Navigation" },
  nav_mobile_cta: { default: "Request a quote", label: "Mobile menu button", group: "Navigation" },

  // ─────────────────────── Hero ───────────────────────
  hero_eyebrow: { default: "Networks · Cameras · IT · San Diego County", label: "Hero eyebrow", help: "The small tag above the big headline", group: "Hero" },
  hero_default_title: { default: "Network, camera and IT installs for small businesses in San Diego.", label: "Hero headline fallback", help: "Shown when no CMS hero row exists", group: "Hero", multiline: true },
  hero_default_subtitle: { default: "We install and maintain networks, Wi-Fi, camera systems and computers. Every job is photographed as we go, and you can follow progress in your client portal.", label: "Hero subheadline fallback", group: "Hero", multiline: true },
  hero_default_cta: { default: "Request a quote", label: "Hero CTA fallback", group: "Hero" },
  hero_secondary_button: { default: "See recent work", label: "Hero secondary button", group: "Hero" },

  // ─────────────────────── Recent work ───────────────────────
  recent_work_eyebrow: { default: "Recent work", label: "Recent work: eyebrow", group: "Recent work" },
  recent_work_heading: { default: "Recent jobs", label: "Recent work: heading", group: "Recent work" },
  recent_work_subtitle: { default: "Photos from the job site.", label: "Recent work: subtitle", group: "Recent work" },
  recent_work_card_label: { default: "From the client portal", label: "Recent work: card label", group: "Recent work" },
  recent_work_card_fallback: { default: "Recent job", label: "Recent work: card title fallback", group: "Recent work" },

  // ─────────────────────── Services ───────────────────────
  services_eyebrow: { default: "Services", label: "Services: eyebrow", group: "Services" },
  services_heading: { default: "What we do", label: "Services: heading", group: "Services" },
  default_service_1: { default: "Networks & Wi-Fi", label: "Service fallback #1", help: "Only used when no CMS service rows exist", group: "Services" },
  default_service_2: { default: "Camera systems", label: "Service fallback #2", group: "Services" },
  default_service_3: { default: "Small-business IT", label: "Service fallback #3", group: "Services" },
  default_service_4: { default: "Smart home & low voltage", label: "Service fallback #4", group: "Services" },

  // ─────────────────────── How it works ───────────────────────
  process_eyebrow: { default: "Process", label: "How it works: eyebrow", group: "How it works" },
  process_heading: { default: "How it works", label: "How it works: heading", group: "How it works" },
  step_1_title: { default: "Walkthrough and quote", label: "Step 1 title", group: "How it works" },
  step_1_body: { default: "We come out, look at the space, and send a written quote.", label: "Step 1 body", group: "How it works", multiline: true },
  step_2_title: { default: "Install", label: "Step 2 title", group: "How it works" },
  step_2_body: { default: "We do the work and post photo updates to your portal as we go.", label: "Step 2 body", group: "How it works", multiline: true },
  step_3_title: { default: "Handoff", label: "Step 3 title", group: "How it works" },
  step_3_body: { default: "Passwords, network details and logins go in your portal so you can find them later.", label: "Step 3 body", group: "How it works", multiline: true },

  // ─────────────────────── About ───────────────────────
  about_eyebrow: { default: "Who you're calling", label: "About: eyebrow", group: "About" },
  about_heading_prefix: { default: "About", label: "About: heading prefix", help: "Followed by the company name when the CMS about row is empty", group: "About" },

  // ─────────────────────── Testimonials ───────────────────────
  testimonials_default_title: { default: "What clients say", label: "Testimonials: title fallback", group: "Testimonials" },

  // ─────────────────────── Quote CTA band ───────────────────────
  quote_heading: { default: "Need a quote?", label: "Quote CTA: heading", group: "Quote CTA" },
  quote_subtitle: { default: "Tell us what you need and we'll get back to you within one business day.", label: "Quote CTA: subtitle", group: "Quote CTA", multiline: true },
  quote_cta_button: { default: "Request a quote", label: "Quote CTA: button", group: "Quote CTA" },
  quote_phone_prefix: { default: "Call", label: "Quote CTA: phone button prefix", help: "Followed by your phone number", group: "Quote CTA" },

  // ─────────────────────── Portal preview mock ───────────────────────
  portal_update_label: { default: "New update", label: "Portal preview: new update badge", group: "Portal preview" },
  portal_timestamp: { default: "Today", label: "Portal preview: timestamp", group: "Portal preview" },
  portal_status: { default: "In progress", label: "Portal preview: status", group: "Portal preview" },
  portal_title: { default: "Second-floor cameras online: 38 of 112 done", label: "Portal preview: post title", group: "Portal preview" },
  portal_pinned_note: { default: "Important note · pinned", label: "Portal preview: pinned note label", group: "Portal preview" },
  portal_password_label: { default: "Staff Wi-Fi password", label: "Portal preview: password label", group: "Portal preview" },
  portal_reveal_button: { default: "Reveal", label: "Portal preview: reveal button", group: "Portal preview" },
  portal_photo_1: { default: "", label: "Portal preview: photo 1", help: "Upload a real photo to replace the hatched placeholder.", group: "Portal preview", kind: "image" },
  portal_photo_2: { default: "", label: "Portal preview: photo 2", group: "Portal preview", kind: "image" },
  portal_photo_3: { default: "", label: "Portal preview: photo 3", group: "Portal preview", kind: "image" },
  portal_photo_label_1: { default: "Hallway run", label: "Portal preview: photo caption 1", group: "Portal preview" },
  portal_photo_label_2: { default: "Dome, lobby", label: "Portal preview: photo caption 2", group: "Portal preview" },
  portal_photo_label_3: { default: "NVR view", label: "Portal preview: photo caption 3", group: "Portal preview" },

  // ─────────────────────── Footer ───────────────────────
  footer_privacy_link: { default: "Privacy", label: "Footer: privacy link", group: "Footer" },
  footer_terms_link: { default: "Terms", label: "Footer: terms link", group: "Footer" },
};

export type SiteStringKey = keyof typeof SITE_STRING_REGISTRY;

// Hook: returns a `t(key)` function. Overrides come from /api/site-strings;
// fallback is the default in the registry so nothing ever renders blank.
export function useSiteStrings() {
  const { data: overrides = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-strings"],
  });
  const t = (key: SiteStringKey): string => {
    const override = overrides[key];
    if (typeof override === "string" && override.length > 0) return override;
    return SITE_STRING_REGISTRY[key]?.default ?? "";
  };
  return t;
}

// Convenience for components that want them as plain strings inline.
export function getDefault(key: SiteStringKey): string {
  return SITE_STRING_REGISTRY[key]?.default ?? "";
}
