import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkLensMark } from "@/components/layout/LinkLensMark";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in · LinkLens" },
      { name: "description", content: "Sign in or create your LinkLens account." },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type Credentials = z.infer<typeof credentials>;

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);

  const form = useForm<Credentials>({
    resolver: zodResolver(credentials),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Credentials) {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created — welcome to LinkLens.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <LinkLensMark />
          <span className="font-semibold tracking-tight">LinkLens</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to manage your links and analytics."
                : "Start shortening and measuring in seconds."}
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-brand text-brand-foreground hover:brightness-110">
              {loading ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                New here?{" "}
                <button
                  className="font-medium text-brand hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have one?{" "}
                <button
                  className="font-medium text-brand hover:underline"
                  onClick={() => setMode("login")}
                >
                  Sign in instead
                </button>
              </>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
