import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Monogram } from "@/components/ui/monogram";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useSiteStrings } from "@/lib/siteStrings";
import {
  Menu,
  ChevronRight,
  ArrowRight,
  Camera,
  Wifi,
  Monitor,
  Home,
  Shield,
  Lock,
  Briefcase,
  Code,
  BarChart,
  Layout,
  Users,
  Globe,
  Database,
  Zap,
  Settings,
  Smartphone,
  Wrench,
  Clock,
  Eye,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ContentSection {
  id: number;
  type: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  imagePath: string | null;
  imagePathBefore: string | null;
  order: number;
  isActive: boolean;
}

interface PublicSettings {
  companyName?: string | null;
  logoPath?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
}

/** A "Recent work" CMS row, parsed. subtitle = comma-separated tags, first tag is the kind. */
interface Job {
  id: number | string;
  kind: string;
  tags: string[];
  title: string;
  result: string;
  photo: string | null;
  photoBefore: string | null;
}

/* ------------------------------------------------------------------ */
/* Defaults. Used only when the CMS has nothing for a section.         */
/* ------------------------------------------------------------------ */

const ICON_CLASS = "h-6 w-6";
const SERVICE_ICON_MAP: Record<string, React.ReactNode> = {
  wifi: <Wifi className={ICON_CLASS} strokeWidth={1.75} />,
  camera: <Camera className={ICON_CLASS} strokeWidth={1.75} />,
  monitor: <Monitor className={ICON_CLASS} strokeWidth={1.75} />,
  home: <Home className={ICON_CLASS} strokeWidth={1.75} />,
  shield: <Shield className={ICON_CLASS} strokeWidth={1.75} />,
  lock: <Lock className={ICON_CLASS} strokeWidth={1.75} />,
  layout: <Layout className={ICON_CLASS} strokeWidth={1.75} />,
  code: <Code className={ICON_CLASS} strokeWidth={1.75} />,
  briefcase: <Briefcase className={ICON_CLASS} strokeWidth={1.75} />,
  barChart: <BarChart className={ICON_CLASS} strokeWidth={1.75} />,
  globe: <Globe className={ICON_CLASS} strokeWidth={1.75} />,
  database: <Database className={ICON_CLASS} strokeWidth={1.75} />,
  zap: <Zap className={ICON_CLASS} strokeWidth={1.75} />,
  settings: <Settings className={ICON_CLASS} strokeWidth={1.75} />,
  users: <Users className={ICON_CLASS} strokeWidth={1.75} />,
  smartphone: <Smartphone className={ICON_CLASS} strokeWidth={1.75} />,
  wrench: <Wrench className={ICON_CLASS} strokeWidth={1.75} />,
};

const DEFAULT_HERO = {
  title: "Network, camera and IT installs for small businesses in San Diego.",
  subtitle:
    "We install and maintain networks, Wi-Fi, camera systems and computers. Every job is photographed as we go, and you can follow progress in your client portal.",
  cta: "Request a quote",
};

const DEFAULT_JOBS: Job[] = [
  { id: "d1", kind: "Cameras", tags: ["112 cameras", "PoE", "NVR", "3 buildings"], title: "Camera system for a retirement community", result: "112 PoE cameras across three buildings on a single NVR. Staff can review and export footage themselves.", photo: null, photoBefore: null },
  { id: "d2", kind: "Network", tags: ["Firewall", "Switching", "Wi-Fi 6", "Rack"], title: "Full office network stack rebuild", result: "Replaced consumer gear with a rack-mounted firewall, managed switching and Wi-Fi 6, with guest and staff traffic on separate VLANs.", photo: null, photoBefore: null },
  { id: "d3", kind: "Security", tags: ["Incident response", "Cleanup", "Hardening"], title: "Forensics after a hacked work computer", result: "Imaged the drive, identified how and when it was compromised, cleaned the machine and hardened the rest of the office.", photo: null, photoBefore: null },
  { id: "d4", kind: "Wi-Fi", tags: ["WAPs", "Smart locks", "Cameras"], title: "Whole-house Wi-Fi and smart home hardware", result: "Ceiling-mounted access points for full coverage, plus smart locks and cameras on one app.", photo: null, photoBefore: null },
  { id: "d5", kind: "Computers", tags: ["Migration", "Backups", "Email"], title: "New computer migration, no lost files", result: "Files, email and printers moved to the new machine. The old drive was kept as a backup.", photo: null, photoBefore: null },
  { id: "d6", kind: "Consulting", tags: ["Small business", "Planning", "Vendors"], title: "Straight answers on what to buy and what to skip", result: "A written plan covering what to fix first, what can wait, and what to buy.", photo: null, photoBefore: null },
];

const DEFAULT_SERVICES = [
  { id: "s1", icon: "wifi", title: "Networks & Wi-Fi", lines: ["Firewalls, switching and rack builds", "Wi-Fi 6 access points", "Separate guest and staff networks"] },
  { id: "s2", icon: "camera", title: "Camera systems", lines: ["Dome, bullet and PTZ cameras over PoE", "NVR setup with remote viewing", "Single buildings to 100+ camera sites"] },
  { id: "s3", icon: "monitor", title: "Small-business IT", lines: ["Computer setup, migration and backups", "Email and printer support", "Security incident response"] },
  { id: "s4", icon: "home", title: "Smart home & low voltage", lines: ["Smart locks, doorbells and hubs", "Whole-house Wi-Fi and wired drops", "Clean, labelled cable runs"] },
];

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function parseJob(row: ContentSection): Job {
  const tags = (row.subtitle ?? "")
    .split(/[,·|]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    id: row.id,
    kind: tags[0] ?? "Job",
    tags: tags.slice(1),
    title: row.title ?? "",
    result: row.content ?? "",
    photo: row.imagePath,
    photoBefore: row.imagePathBefore ?? null,
  };
}

/** Equipment-label tag. `accent` is the blue one, used once per card for the job kind. */
function Tag({ children, accent = false, className = "" }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center whitespace-nowrap rounded border px-2 font-display text-[11.5px] font-semibold uppercase tracking-[0.1em] ${
        accent ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-input text-foreground/80"
      } ${className}`}
    >
      {children}
    </span>
  );
}

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}

/**
 * A photo slot. With a src it is the photo; without one it is a quiet
 * textured panel that names the job kind, so the page never looks broken
 * while photos are still being added in the content editor.
 */
function PhotoSlot({ src, alt, fallback, className = "" }: { src: string | null; alt: string; fallback: string; className?: string }) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={`block h-full w-full object-cover ${className}`} />;
  }
  return (
    <div
      aria-hidden="true"
      className={`flex h-full w-full items-end bg-muted bg-[repeating-linear-gradient(135deg,transparent_0_10px,hsl(var(--foreground)/0.05)_10px_20px)] p-3 ${className}`}
    >
      <span className="font-display text-2xl font-bold uppercase tracking-tight text-foreground/30">{fallback}</span>
    </div>
  );
}

/**
 * Job card photo. If the job has both a `photo` (after) and a `photoBefore`,
 * render a small segmented control over the image to toggle. Otherwise render
 * the single photo or the hatched fallback.
 */
function JobPhoto({ job }: { job: Job }) {
  const hasBoth = !!job.photo && !!job.photoBefore;
  const [mode, setMode] = useState<"after" | "before">("after");
  const src = hasBoth ? (mode === "after" ? job.photo : job.photoBefore) : job.photo;
  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      <PhotoSlot src={src} alt={job.title} fallback={job.kind} />
      {hasBoth && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-black/70 backdrop-blur p-0.5 text-[12px] font-semibold text-white shadow-lg"
          role="group"
          aria-label="Compare before and after"
        >
          <button
            type="button"
            onClick={() => setMode("before")}
            className={`px-3 py-1 rounded-full transition-colors ${mode === "before" ? "bg-white text-foreground" : "text-white/80 hover:text-white"}`}
          >
            Before
          </button>
          <button
            type="button"
            onClick={() => setMode("after")}
            className={`px-3 py-1 rounded-full transition-colors ${mode === "after" ? "bg-white text-foreground" : "text-white/80 hover:text-white"}`}
          >
            After
          </button>
        </div>
      )}
    </div>
  );
}

function LogoMark({
  companyName,
  logoPath,
  light = false,
  mono = false,
  size = "md",
}: {
  companyName: string;
  logoPath?: string | null;
  /** On dark backgrounds: flatten logo to a white silhouette. */
  light?: boolean;
  /** On light backgrounds: flatten logo to a solid black silhouette (strips color). */
  mono?: boolean;
  size?: "sm" | "md";
}) {
  const imgClass = size === "sm" ? "h-7 max-w-[140px] object-contain" : "h-9 max-w-[180px] object-contain";
  const boxClass = size === "sm" ? "h-7 w-7 rounded-md text-[13px]" : "h-9 w-9 rounded-lg text-lg";
  const nameClass = size === "sm" ? "font-display text-base font-bold" : "font-display text-xl font-bold";
  if (logoPath) {
    const filter = light ? "brightness-0 invert" : mono ? "brightness-0" : "";
    return <img src={logoPath} alt={companyName} className={`${imgClass} ${filter}`} />;
  }
  const initials = companyName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex items-center justify-center bg-foreground font-display font-bold text-background ${boxClass}`}>{initials}</span>
      <span className="flex flex-col leading-none">
        <span className={nameClass}>{companyName}</span>
        {size === "md" && (
          <span className="hidden font-display text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">San Diego</span>
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PublicHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const txt = useSiteStrings();

  const { data: settings } = useQuery<PublicSettings>({ queryKey: ["/api/settings/public"] });
  const { data: heroContent = [], isLoading: heroLoading } = useQuery<ContentSection[]>({ queryKey: ["/api/content/hero"] });
  const { data: jobContent = [] } = useQuery<ContentSection[]>({ queryKey: ["/api/content/job"] });
  const { data: serviceContent = [] } = useQuery<ContentSection[]>({ queryKey: ["/api/content/service"] });
  const { data: aboutContent = [] } = useQuery<ContentSection[]>({ queryKey: ["/api/content/about"] });
  const { data: testimonialContent = [] } = useQuery<ContentSection[]>({ queryKey: ["/api/content/testimonial"] });

  const companyName = settings?.companyName || "SD Tech Pros";
  const hero = {
    title: heroContent[0]?.title || txt("hero_default_title"),
    subtitle: heroContent[0]?.subtitle || txt("hero_default_subtitle"),
    cta: heroContent[0]?.content || txt("hero_default_cta"),
    image: heroContent[0]?.imagePath ?? null,
  };

  const jobs: Job[] = jobContent.length ? jobContent.filter((j) => j.isActive !== false).map(parseJob) : DEFAULT_JOBS;
  const featuredJob = jobs.find((j) => j.photo) ?? null;

  const serviceDefaults = [
    { id: "s1", icon: "wifi", title: txt("default_service_1"), lines: ["Firewalls, switching and rack builds", "Wi-Fi 6 access points", "Separate guest and staff networks"] },
    { id: "s2", icon: "camera", title: txt("default_service_2"), lines: ["Dome, bullet and PTZ cameras over PoE", "NVR setup with remote viewing", "Single buildings to 100+ camera sites"] },
    { id: "s3", icon: "monitor", title: txt("default_service_3"), lines: ["Computer setup, migration and backups", "Email and printer support", "Security incident response"] },
    { id: "s4", icon: "home", title: txt("default_service_4"), lines: ["Smart locks, doorbells and hubs", "Whole-house Wi-Fi and wired drops", "Clean, labelled cable runs"] },
  ];
  const services = serviceContent.length
    ? serviceContent.map((s) => ({
        id: s.id,
        icon: s.imagePath?.startsWith("icon:") ? s.imagePath.slice(5) : "briefcase",
        title: s.title ?? "",
        subtitle: s.subtitle ?? "",
        lines: (s.content ?? "").split(/\n+/).map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean),
      }))
    : serviceDefaults.map(d => ({ ...d, subtitle: "" }));

  const about = aboutContent[0] ?? null;

  const testimonialHasHeader = testimonialContent.length > 0 && !testimonialContent[0].content;
  const testimonialTitle = (testimonialHasHeader && testimonialContent[0].title) || txt("testimonials_default_title");
  const testimonials = testimonialHasHeader ? testimonialContent.slice(1) : testimonialContent;

  const contact = {
    email: settings?.contactEmail || null,
    phone: settings?.contactPhone || null,
    address: settings?.contactAddress || null,
  };

  const navLinks = [
    { name: txt("nav_recent_work"), id: "work" },
    { name: txt("nav_services"), id: "services" },
    { name: txt("nav_how_it_works"), id: "how" },
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const portalHref = user ? (user.role === "admin" ? "/admin" : "/client") : "/auth";
  const portalLabel = user ? txt("nav_portal_authenticated") : txt("nav_portal_guest");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href="#top" onClick={(e) => { e.preventDefault(); scrollToSection("top"); }} className="flex items-center" aria-label={`${companyName} home`}>
            <LogoMark companyName={companyName} logoPath={settings?.logoPath} />
          </a>

          <nav className="ml-auto hidden items-center gap-6 md:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => { e.preventDefault(); scrollToSection(link.id); }}
                className="text-[15px] font-medium text-foreground/75 hover:text-foreground"
              >
                {link.name}
              </a>
            ))}
            <Button variant="outline" size="sm" onClick={() => navigate(portalHref)}>{portalLabel}</Button>
            <Button size="sm" onClick={() => navigate("/inquiry")}>{txt("nav_cta_button")}</Button>
          </nav>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <Button size="sm" onClick={() => navigate("/inquiry")}>{txt("nav_cta_button")}</Button>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={txt("nav_menu_title")}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader className="text-left">
                  <SheetTitle className="font-display text-2xl">{txt("nav_menu_title")}</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(e) => { e.preventDefault(); scrollToSection(link.id); }}
                      className="flex min-h-[44px] items-center rounded-md px-2 text-lg font-medium hover:bg-accent"
                    >
                      {link.name}
                      <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                    </a>
                  ))}
                  <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                    <Button variant="outline" onClick={() => { setIsMenuOpen(false); navigate(portalHref); }}>{portalLabel}</Button>
                    <Button onClick={() => { setIsMenuOpen(false); navigate("/inquiry"); }}>{txt("nav_mobile_cta")}</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="top" className="scroll-mt-16">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="flex flex-col gap-6">
            <Eyebrow>{txt("hero_eyebrow")}</Eyebrow>
            {heroLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-4/5" />
                <Skeleton className="mt-4 h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <h1 className="text-[2.75rem] leading-[1] sm:text-6xl lg:text-[4.5rem]">{hero.title}</h1>
                <p className="max-w-xl text-lg leading-relaxed text-foreground/75">{hero.subtitle}</p>
              </>
            )}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/inquiry")}>
                {hero.cta}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => scrollToSection("work")}>{txt("hero_secondary_button")}</Button>
            </div>
          </div>

          {/* Hero visual: the latest job with a photo, else the hero image, else a portal preview */}
          {featuredJob || hero.image ? (
            <article className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <Tag accent>{featuredJob ? featuredJob.kind : txt("recent_work_card_fallback")}</Tag>
                {featuredJob?.tags.slice(0, 2).map((t) => <Tag key={t}>{t}</Tag>)}
                <span className="ml-auto text-[12.5px] font-medium text-muted-foreground">{txt("recent_work_card_label")}</span>
              </div>
              <div className="aspect-[4/3] bg-muted">
                <PhotoSlot src={featuredJob?.photo ?? hero.image} alt={featuredJob?.title ?? hero.title} fallback="" />
              </div>
              <div className="flex flex-col gap-1.5 px-4 py-4">
                <p className="text-[17px] font-semibold leading-snug">{featuredJob?.title ?? hero.title}</p>
                {featuredJob?.result && <p className="text-[13.5px] text-muted-foreground">{featuredJob.result}</p>}
              </div>
            </article>
          ) : (
            <PortalPreview />
          )}
        </section>

        {/* Recent work */}
        <section id="work" className="scroll-mt-16 border-t border-border bg-card/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 py-16 sm:px-6 md:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <Eyebrow>{txt("recent_work_eyebrow")}</Eyebrow>
                <h2 className="text-4xl sm:text-5xl">{txt("recent_work_heading")}</h2>
                <p className="text-[16.5px] leading-relaxed text-foreground/75">{txt("recent_work_subtitle")}</p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <article key={job.id} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                  <JobPhoto job={job} />
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <div className="flex flex-wrap gap-1.5">
                      <Tag accent>{job.kind}</Tag>
                      {job.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
                    </div>
                    <h3 className="text-xl font-semibold leading-tight">{job.title}</h3>
                    <p className="flex-1 text-[14.5px] leading-relaxed text-foreground/75">{job.result}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-16 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-9 px-4 py-16 sm:px-6 md:py-20">
            <div className="flex max-w-2xl flex-col gap-3">
              <Eyebrow>{txt("services_eyebrow")}</Eyebrow>
              <h2 className="text-4xl sm:text-5xl">{txt("services_heading")}</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => (
                <div key={service.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    {SERVICE_ICON_MAP[service.icon] ?? SERVICE_ICON_MAP.briefcase}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold leading-tight">{service.title}</h3>
                    {service.subtitle && (
                      <p className="text-[13.5px] text-muted-foreground leading-snug">{service.subtitle}</p>
                    )}
                  </div>
                  {service.lines.length > 1 ? (
                    <ul className="flex flex-col gap-1.5 pl-[18px] text-[14.5px] leading-snug text-foreground/75 marker:text-muted-foreground" style={{ listStyle: "disc" }}>
                      {service.lines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  ) : (
                    <p className="text-[14.5px] leading-relaxed text-foreground/75">{service.lines[0]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How a job works */}
        <section id="how" className="scroll-mt-16 border-t border-border bg-card/60">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-2">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-3">
                <Eyebrow>{txt("process_eyebrow")}</Eyebrow>
                <h2 className="text-4xl sm:text-5xl">{txt("process_heading")}</h2>
              </div>
              <ol className="flex flex-col gap-6">
                <Step n={1} title={txt("step_1_title")}>{txt("step_1_body")}</Step>
                <Step n={2} title={txt("step_2_title")}>{txt("step_2_body")}</Step>
                <Step n={3} title={txt("step_3_title")}>{txt("step_3_body")}</Step>
              </ol>
            </div>
            <PortalPreview />
          </div>
        </section>

        {/* About, only when the CMS has it */}
        {about && (about.title || about.content) && (
          <section id="about" className="scroll-mt-16 border-t border-border">
            <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.2fr_1fr]">
              <div className="flex flex-col gap-4">
                <Eyebrow>{txt("about_eyebrow")}</Eyebrow>
                <h2 className="text-4xl sm:text-5xl">{about.title || `${txt("about_heading_prefix")} ${companyName}`}</h2>
                {about.subtitle && <p className="text-lg leading-relaxed text-foreground/80">{about.subtitle}</p>}
                {about.content && <p className="whitespace-pre-line text-[16px] leading-relaxed text-foreground/75">{about.content}</p>}
              </div>
              {about.imagePath && (
                <div className="overflow-hidden rounded-xl border border-border shadow-md">
                  <img src={about.imagePath} alt={about.title || companyName} className="block w-full object-cover" />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Testimonials, only when there are some */}
        {testimonials.length > 0 && (
          <section id="testimonials" className="scroll-mt-16 border-t border-border bg-card/60">
            <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-16 sm:px-6">
              <Eyebrow>{testimonialTitle}</Eyebrow>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((t) => (
                  <blockquote key={t.id} className="flex flex-col gap-4 rounded-xl border border-border bg-background p-6">
                    <p className="text-[17px] leading-relaxed">"{t.content}"</p>
                    <footer className="flex items-center gap-3">
                      <Monogram name={t.title || ""} className="h-9 w-9 text-xs" />
                      <div className="text-[13.5px]">
                        <p className="font-semibold">{t.title}</p>
                        {t.subtitle && <p className="text-muted-foreground">{t.subtitle}</p>}
                      </div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Quote band */}
        <section id="quote" className="scroll-mt-16 bg-primary-950 text-neutral-100">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-7 px-4 py-16 sm:px-6 md:py-20">
            <div className="flex max-w-xl flex-col gap-3">
              <h2 className="text-4xl text-neutral-50 sm:text-5xl">{txt("quote_heading")}</h2>
              <p className="text-[17px] leading-relaxed text-neutral-300">
                {txt("quote_subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/inquiry")}>{txt("quote_cta_button")}</Button>
              {contact.phone && (
                <Button asChild variant="outline" size="lg" className="border-neutral-700 bg-transparent text-neutral-100 hover:bg-neutral-100/10 hover:text-neutral-50">
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>{txt("quote_phone_prefix")} {contact.phone}</a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-7 gap-y-3 px-4 py-7 text-[13.5px] text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <LogoMark companyName={companyName} logoPath={settings?.logoPath} size="sm" mono />
          </span>
          {contact.address && <span>{contact.address}</span>}
          {contact.phone && <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-foreground">{contact.phone}</a>}
          {contact.email && <a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email}</a>}
          <nav className="ml-auto flex flex-wrap gap-5" aria-label="Footer">
            <a href={portalHref} onClick={(e) => { e.preventDefault(); navigate(portalHref); }} className="font-medium text-primary hover:underline">{portalLabel}</a>
            <a href="/pages/privacy" onClick={(e) => { e.preventDefault(); navigate("/pages/privacy"); }} className="font-medium text-primary hover:underline">{txt("footer_privacy_link")}</a>
            <a href="/pages/terms" onClick={(e) => { e.preventDefault(); navigate("/pages/terms"); }} className="font-medium text-primary hover:underline">{txt("footer_terms_link")}</a>
          </nav>
          <span className="w-full text-[12.5px] sm:w-auto sm:ml-auto">&copy; {new Date().getFullYear()} {companyName}</span>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components used above                                           */
/* ------------------------------------------------------------------ */

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-lg font-bold text-background">{n}</span>
      <div className="flex flex-col gap-1">
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="text-[14.5px] leading-relaxed text-foreground/75">{children}</p>
      </div>
    </li>
  );
}

/** A static mock of what a client sees in the portal: a photo update and a pinned note. */
function PortalPreview() {
  const txt = useSiteStrings();
  const photos = [
    { src: txt("portal_photo_1"), alt: txt("portal_photo_label_1") },
    { src: txt("portal_photo_2"), alt: txt("portal_photo_label_2") },
    { src: txt("portal_photo_3"), alt: txt("portal_photo_label_3") },
  ];
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4 shadow-lg" aria-label="Example of a client portal update">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft font-display text-xs font-bold text-primary-soft-foreground">SD</span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{txt("portal_update_label")}</span>
          <span className="text-[12.5px] text-muted-foreground">{txt("portal_timestamp")}</span>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground"><Clock className="h-3 w-3" />{txt("portal_status")}</span>
      </div>
      <p className="text-[17px] font-semibold leading-snug">{txt("portal_title")}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <div key={i} className="aspect-square overflow-hidden rounded-lg">
            <PhotoSlot src={p.src || null} alt={p.alt} fallback="" className="!p-2 text-[11px]" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-border pt-3.5">
        <Eyebrow className="text-[11.5px]">{txt("portal_pinned_note")}</Eyebrow>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] font-medium text-foreground/80">{txt("portal_password_label")}</span>
            <span className="font-mono text-sm tracking-[0.2em]">••••••••••</span>
          </div>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-semibold"><Eye className="h-4 w-4" />{txt("portal_reveal_button")}</span>
        </div>
      </div>
    </div>
  );
}
