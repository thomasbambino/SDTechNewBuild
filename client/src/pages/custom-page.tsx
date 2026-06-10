import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  content: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CustomPageView() {
  const [location, navigate] = useLocation();
  // Extract slug from /pages/<slug>
  const slug = location.replace(/^\/pages\//, "").split("/")[0];

  const { data: page, isLoading, isError } = useQuery<CustomPage>({
    queryKey: ["/api/pages", slug],
    queryFn: async () => {
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) throw new Error("Page not found");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">This page doesn't exist or has been unpublished.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-8 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-2">{page.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: {new Date(page.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <hr className="mb-8 border-border" />

        <div className="text-foreground text-base leading-relaxed whitespace-pre-wrap">
          {page.content}
        </div>
      </div>
    </div>
  );
}
