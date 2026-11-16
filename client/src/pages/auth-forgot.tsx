import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AuthForgotPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim().toLowerCase() });
    },
    // Success message is identical whether or not the email exists — the
    // server intentionally returns 200 either way to avoid enumeration.
    onSuccess: () => setSent(true),
    onError: (err: Error) => toast({ title: "Something went wrong", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/auth")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to sign in
        </Button>

        <Card>
          <CardContent className="p-6">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <h1 className="font-display text-2xl font-semibold">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong className="text-foreground">{email}</strong>, we sent a password-reset link. It's good for 60 minutes.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Didn't get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="font-medium text-primary hover:underline"
                  >
                    try a different email
                  </button>.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email.trim()) mutation.mutate(); }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-display text-2xl font-semibold">Forgot your password?</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll send a link to set a new one.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={mutation.isPending || !email.trim()}>
                  <Mail className="h-4 w-4 mr-2" />
                  {mutation.isPending ? "Sending…" : "Email me a reset link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
