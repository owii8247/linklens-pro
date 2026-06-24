import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · LinkLens" }] }),
  component: Settings,
});

function Settings() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setEmail(userData.user.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userData.user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
    })();
  }, []);

  async function save() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", userData.user.id);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and how you appear on LinkLens.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Profile
        </h2>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
          <p className="text-xs text-muted-foreground">
            Email changes are not yet supported in this build.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="display">Display name</Label>
          <Input
            id="display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={loading} className="bg-brand text-brand-foreground hover:brightness-110">
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Session
        </h2>
        <p className="text-sm text-muted-foreground">
          Signing out clears your local session on this device.
        </p>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
