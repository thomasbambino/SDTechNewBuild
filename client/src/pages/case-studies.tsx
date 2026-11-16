import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface CaseStudy {
  id: number;
  title: string;
  summary: string | null;
  imagePaths: string | null;
  clientName: string;
  projectName: string;
  createdAt: string;
}

interface PublicSettings {
  companyName?: string | null;
  logoPath?: string | null;
}

export default function CaseStudiesPage() {
  const { data: settings } = useQuery<PublicSettings>({ queryKey: ["/api/settings/public"] });
  const { data: studies = [], isLoading } = useQuery<CaseStudy[]>({ queryKey: ["/api/case-studies"] });
  const companyName = settings?.companyName || "SD Tech Pros";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {settings?.logoPath ? (
              <img src={settings.logoPath} alt={companyName} className="h-8 object-contain dark:brightness-0 dark:invert" />
            ) : (
              <span className="font-display text-lg font-bold">{companyName}</span>
            )}
          </Link>
          <nav className="flex items-center gap-4" aria-label="Primary">
            <Link href="/"><a className="text-sm text-muted-foreground hover:text-foreground">Home</a></Link>
            <Link href="/inquiry"><Button size="sm">Get in touch</Button></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Our work</p>
          <h1 className="text-4xl sm:text-5xl font-bold mt-2 leading-[1.1]">Case studies</h1>
          <p className="text-lg text-muted-foreground mt-4">
            Real projects, real outcomes — networks, cameras, and IT environments we've designed, deployed, and now maintain across San Diego County.
          </p>
        </div>

        <div className="mt-12">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-72 w-full" />)}
            </div>
          ) : studies.length === 0 ? (
            <div className="rounded-lg border border-dashed p-16 text-center">
              <p className="text-lg text-muted-foreground">Case studies coming soon.</p>
              <p className="text-sm text-muted-foreground mt-2">
                In the meantime, <Link href="/inquiry"><a className="underline">get in touch</a></Link> to talk about your project.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {studies.map(s => <StudyCard key={s.id} study={s} />)}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-10 mt-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {companyName}</p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/"><a className="hover:text-foreground">Home</a></Link>
            <Link href="/inquiry"><a className="hover:text-foreground">Contact</a></Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function StudyCard({ study }: { study: CaseStudy }) {
  const images: string[] = (() => {
    if (!study.imagePaths) return [];
    try { const p = JSON.parse(study.imagePaths); return Array.isArray(p) ? p.filter(s => typeof s === "string") : []; }
    catch { return []; }
  })();
  const hero = images[0];

  return (
    <article className="rounded-xl border bg-card overflow-hidden flex flex-col">
      {hero && (
        <div className="aspect-[16/10] bg-muted">
          <img src={hero} alt={study.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {study.clientName}
        </p>
        <h2 className="font-display text-xl font-semibold mt-1">{study.title}</h2>
        {study.summary && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-4">{study.summary}</p>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground">{format(new Date(study.createdAt), "MMM yyyy")}</p>
          {images.length > 1 && <p className="text-xs text-muted-foreground">+{images.length - 1} photos</p>}
        </div>
      </div>
    </article>
  );
}
