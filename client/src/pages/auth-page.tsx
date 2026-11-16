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
  username: z.string().min(1, "Enter your username."),
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Left: the form */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-2.5" aria-label={`${companyName} home`}>
            {settings?.logoPath ? (
              <img src={settings.logoPath} alt={companyName} className="h-9 max-w-[180px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background">SD</span>
                <span className="font-display text-xl font-bold">{companyName}</span>
              </>
            )}
          </a>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /> Back to site</Button>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-7 py-12">
          <div className="flex flex-col gap-2">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Client portal</p>
            <h1 className="text-4xl">Sign in</h1>
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
                  Incorrect username or password.
                </p>
              )}
              <Button type="submit" size="lg" className="mt-1 w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="flex flex-col gap-2 border-t border-border pt-5 text-[13.5px] leading-relaxed text-muted-foreground">
            <p>
              <strong className="font-semibold text-foreground">Don't have a login?</strong> Accounts are set up when a project starts.
              {settings?.contactPhone ? <> Call <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`} className="font-medium text-primary hover:underline">{settings.contactPhone}</a> or </> : " "}
              <a href="/inquiry" onClick={(e) => { e.preventDefault(); navigate("/inquiry"); }} className="font-medium text-primary hover:underline">request a quote</a>.
            </p>
            <p>Forgot your password? Contact us and we'll reset it.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
