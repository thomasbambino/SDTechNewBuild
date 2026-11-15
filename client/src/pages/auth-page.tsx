import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Enter the username your tech gave you."),
  password: z.string().min(1, "Enter your password."),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { data: settings } = useQuery<{ logoPath?: string | null; companyName?: string | null; contactPhone?: string | null; contactEmail?: string | null }>({
    queryKey: ["/api/settings/public"],
  });
  const companyName = settings?.companyName || "SD Tech Pros";

  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/client");
  }, [user, navigate]);

  if (user) return null;

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1fr]">
      {/* Left: the form */}
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-2.5" aria-label={`${companyName} home`}>
            {settings?.logoPath ? (
              <img src={settings.logoPath} alt={companyName} className="h-9 max-w-[180px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal font-display text-lg font-bold text-signal-foreground">SD</span>
                <span className="font-display text-xl font-bold">{companyName}</span>
              </>
            )}
          </a>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /> Back to site</Button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-12">
          <div className="flex flex-col gap-2">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Client portal</p>
            <h1 className="text-4xl">Sign in to see your job.</h1>
            <p className="text-[15px] leading-relaxed text-foreground/75">Photos from the site, invoices, and the Wi-Fi password you can never find.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => loginMutation.mutate(d))} className="flex flex-col gap-4" noValidate>
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl><Input autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="h-12 text-[16px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} autoComplete="current-password" className="h-12 pr-12 text-[16px]" {...field} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {loginMutation.isError && (
                <p className="rounded-md bg-destructive-soft px-3 py-2 text-[13.5px] font-medium text-destructive-soft-foreground" role="alert">
                  That username and password don't match. Check for a typo, or ask your tech to reset it.
                </p>
              )}
              <Button type="submit" size="lg" className="mt-1 w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="flex flex-col gap-2 border-t border-border pt-5 text-[13.5px] leading-relaxed text-muted-foreground">
            <p>
              <strong className="font-semibold text-foreground">No login yet?</strong> Your tech sets one up when a job starts.
              {settings?.contactPhone ? <> Call <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="font-medium text-primary hover:underline">{settings.contactPhone}</a> or </> : " "}
              <a href="/inquiry" onClick={(e) => { e.preventDefault(); navigate("/inquiry"); }} className="font-medium text-primary hover:underline">request a quote</a> to get started.
            </p>
            <p>Forgot your password? Message or call your tech and they'll reset it in a minute.</p>
          </div>
        </div>
      </div>

      {/* Right: what the portal is, shown not told */}
      <aside className="hidden flex-col justify-center gap-8 bg-primary-950 px-12 py-16 text-neutral-100 lg:flex" aria-label="About the portal">
        <div className="flex max-w-md flex-col gap-3">
          <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-signal-300">Your job, documented</p>
          <h2 className="text-4xl text-neutral-50">Every visit leaves photos, not just an invoice.</h2>
          <p className="text-[16px] leading-relaxed text-neutral-300">Progress posts from the site, before-and-after shots, the VLAN map, camera logins and gate codes. All in one place, still there six months from now.</p>
        </div>
        <div className="flex max-w-md flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal font-display text-xs font-bold text-signal-foreground">SD</span>
            <div className="flex flex-col leading-tight"><span className="text-sm font-semibold">Your tech posted an update</span><span className="text-[12.5px] text-neutral-400">From the job site · today</span></div>
          </div>
          <p className="text-[17px] font-semibold leading-snug text-neutral-50">Second-floor cameras online: 38 of 112 done</p>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="aspect-square rounded-lg bg-neutral-800 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(255,255,255,0.04)_10px_20px)]" />)}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-800 px-3 py-2.5">
            <div className="flex flex-col gap-0.5"><span className="text-[12.5px] text-neutral-300">Staff Wi-Fi password</span><span className="font-mono text-sm tracking-[0.2em]">••••••••••</span></div>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-700 px-3 text-sm font-semibold"><Eye className="h-4 w-4" />Reveal</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
