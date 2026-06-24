import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, LayoutDashboard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LinkLensMark } from "./LinkLensMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initial = (email ?? "?").slice(0, 1).toUpperCase();

  const nav: { label: string; to: string }[] = [
    { label: "Links", to: "/dashboard" },
    { label: "Settings", to: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LinkLensMark />
            <span className="font-semibold tracking-tight text-foreground">LinkLens</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active =
                item.to === "/dashboard"
                  ? pathname === "/dashboard" || pathname.startsWith("/links")
                  : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Account menu"
              className="grid size-9 place-items-center rounded-full bg-card ring-1 ring-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {initial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{email}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard" })}>
              <LayoutDashboard className="size-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex justify-around border-t border-border bg-background/80 px-2 py-1 md:hidden">
        {nav.map((item) => {
          const active =
            item.to === "/dashboard"
              ? pathname === "/dashboard" || pathname.startsWith("/links")
              : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium " +
                (active ? "text-foreground" : "text-muted-foreground")
              }
            >
              {item.label}
            </Link>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-xs text-muted-foreground"
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
