import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const inquirySchema = z.object({
  name: z.string().min(2, "Enter your name."),
  business: z.string().optional(),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().optional(),
  services: z.array(z.string()).min(1, "Pick at least one."),
  budget: z.string().optional(),
  urgency: z.string().optional(),
  address: z.string().optional(),
  message: z.string().min(10, "Add a few details about the job."),
});

type InquiryFormValues = z.infer<typeof inquirySchema>;

const DEFAULT_SERVICES = [
  { id: "network", label: "Network / Wi-Fi" },
  { id: "cameras", label: "Cameras" },
  { id: "it", label: "Computers / IT help" },
  { id: "security", label: "Hacked or security worry" },
  { id: "smart-home", label: "Smart home" },
  { id: "consulting", label: "Consulting / planning" },
];

const BUDGETS = [
  { value: "not_sure", label: "Not sure yet, tell me" },
  { value: "under_2500", label: "Under $2,500" },
  { value: "2500_10000", label: "$2,500 to $10,000" },
  { value: "10000_50000", label: "$10,000 to $50,000" },
  { value: "over_50000", label: "Over $50,000" },
];

const URGENCY = [
  { value: "down_now", label: "Something is down now" },
  { value: "this_month", label: "This month" },
  { value: "few_months", label: "Next few months" },
  { value: "planning", label: "Just planning" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InquiryForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: settings } = useQuery<{ logoPath?: string | null; companyName?: string | null; contactEmail?: string | null; contactPhone?: string | null }>({
    queryKey: ["/api/settings/public"],
  });
  const { data: cmsServices = [] } = useQuery<{ id: number; title: string | null }[]>({ queryKey: ["/api/content/service"] });

  const companyName = settings?.companyName || "SD Tech Pros";
  const phone = settings?.contactPhone || null;
  const services = [
    ...(cmsServices.length > 0
      ? cmsServices.filter(s => s.title).map(s => ({ id: s.title!.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label: s.title! }))
      : DEFAULT_SERVICES),
    { id: "other", label: "Something else" },
  ];

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", business: "", email: "", phone: "", services: [], budget: "not_sure", urgency: "this_month", address: "", message: "" },
  });

  const submit = useMutation({
    mutationFn: async (data: InquiryFormValues) => {
      const labelFor = (id: string) => services.find(s => s.id === id)?.label ?? id;
      const lines = [
        `Needs: ${data.services.map(labelFor).join(", ")}`,
        `Urgency: ${URGENCY.find(u => u.value === data.urgency)?.label ?? "not given"}`,
        `Budget: ${BUDGETS.find(b => b.value === data.budget)?.label ?? "not given"}`,
        data.business ? `Business: ${data.business}` : null,
        "",
        data.message,
      ].filter(l => l !== null);
      const res = await apiRequest("POST", "/api/inquiries", {
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        address: data.address || "",
        message: lines.join("\n"),
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (error) => {
      toast({ title: "That didn't send", description: error instanceof Error ? error.message : "Try again, or call us.", variant: "destructive" });
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="flex items-center gap-2.5" aria-label={`${companyName} home`}>
            {settings?.logoPath ? (
              <img src={settings.logoPath} alt={companyName} className="h-9 max-w-[180px] object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background">SD</span>
                <span className="hidden font-display text-xl font-bold sm:inline">{companyName}</span>
              </>
            )}
          </a>
          <nav className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /> Back to site</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>Client login</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:py-14">
        {/* Left: why and what happens next */}
        <div className="flex flex-col gap-7 lg:max-w-md">
          <div className="flex flex-col gap-3">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Contact</p>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] lg:leading-none">Request a quote</h1>
            <p className="text-[17px] leading-relaxed text-foreground/75">
              Fill this out and we'll get back to you within one business day.
              {phone && <> If something is down right now, call <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-primary hover:underline">{phone}</a>.</>}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <p className="font-display text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">What happens next</p>
            <ol className="flex flex-col gap-3.5">
              <Step n={1}>We reply within one business day.</Step>
              <Step n={2}>We schedule a walkthrough of the site.</Step>
              <Step n={3}>You get a written quote.</Step>
            </ol>
          </div>

        </div>

        {/* Right: the form or the confirmation */}
        {submitted ? (
          <div className="flex flex-col items-center gap-5 self-start rounded-xl border border-border bg-card px-6 py-12 text-center shadow-md">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
              <Check className="h-8 w-8" strokeWidth={2.5} />
            </span>
            <div className="flex max-w-md flex-col gap-2">
              <h2 className="text-3xl">Request sent</h2>
              <p className="text-[15px] leading-relaxed text-foreground/75">
                We'll get back to you within one business day{phone ? `. If it's urgent, call ${phone}.` : "."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              <Button variant="outline" onClick={() => navigate("/")}>Back to site</Button>
              <Button variant="ghost" onClick={() => setSubmitted(false)}>Send another</Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => submit.mutate(d))} className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 shadow-md sm:p-7" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your name</FormLabel>
                    <FormControl><Input placeholder="First and last" autoComplete="name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="business" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input placeholder="Harbor View Senior Living" autoComplete="organization" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="you@company.com" autoComplete="email" inputMode="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl><Input type="tel" placeholder="(619) 555-0100" autoComplete="tel" inputMode="tel" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="services" render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you need? Pick all that apply.</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2 pt-1" role="group" aria-label="Services">
                      {services.map(s => {
                        const on = field.value.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => field.onChange(on ? field.value.filter(v => v !== s.id) : [...field.value, s.id])}
                            className={`inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold transition-colors ${
                              on ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-input bg-background text-foreground/80 hover:bg-accent"
                            }`}
                          >
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={form.control} name="urgency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>How urgent</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{URGENCY.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="budget" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rough budget</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{BUDGETS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Site address <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="Street, city, ZIP" autoComplete="street-address" {...field} /></FormControl>
                  <FormDescription>Helps us confirm you're in our service area.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>What's going on?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      className="resize-y text-[15px] leading-relaxed"
                      placeholder="Tell us about the site and what you need done."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="max-w-xs text-[13px] leading-snug text-muted-foreground">We'll only use this to contact you about your request.</p>
                <Button type="submit" size="lg" disabled={submit.isPending} className="w-full sm:w-auto">
                  {submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send request"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-[13px] text-muted-foreground sm:px-6">
          <span>&copy; {new Date().getFullYear()} {companyName}</span>
          {settings?.contactEmail && <a href={`mailto:${settings.contactEmail}`} className="hover:text-foreground">{settings.contactEmail}</a>}
          {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-foreground">{phone}</a>}
        </div>
      </footer>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-sm font-bold text-background">{n}</span>
      <p className="pt-0.5 text-[14.5px] leading-relaxed text-foreground/80">{children}</p>
    </li>
  );
}
