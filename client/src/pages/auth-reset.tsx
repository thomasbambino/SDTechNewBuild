import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AuthResetPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (password !== confirm) throw new Error("Passwords don't match");
      await apiRequest("POST", "/api/auth/reset-password", { token, newPassword: password });
    },
    onSuccess: () => { setDone(true); setError(null); },
    onError: (err: Error) => setError(err.message),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <AlertTriangle className="h-10 w-10 text-warning" />
            <h1 className="font-display text-2xl font-semibold">Invalid reset link</h1>
            <p className="text-sm text-muted-foreground">
              This link is missing its token. Request a new one from the forgot-password page.
            </p>
            <Button onClick={() => navigate("/auth/forgot")}>Request a new link</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6">
            {done ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <h1 className="font-display text-2xl font-semibold">Password updated</h1>
                <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
                <Button onClick={() => navigate("/auth")}>Go to sign in</Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (password.length >= 8) mutation.mutate(); }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
                  <p className="text-sm text-muted-foreground">
                    Pick something you'll remember — at least 8 characters.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending || password.length < 8 || password !== confirm}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {mutation.isPending ? "Updating…" : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
