import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ExternalLink, MapPin, Monitor, Smartphone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { bucketByDay, topBy, uniqueVisitors, type AnalyticsEvent } from "@/lib/analytics";
import { formatNumber, formatRelative, shortDomain } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/links/$id")({
  head: () => ({ meta: [{ title: "Analytics · LinkLens" }] }),
  component: LinkDetail,
  notFoundComponent: () => (
    <div className="grid place-items-center py-24 text-center">
      <p className="text-sm text-muted-foreground">Link not found or you don't have access.</p>
    </div>
  ),
});

type LinkRow = {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  click_count: number;
  created_at: string;
};

function LinkDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  const linkQuery = useQuery({
    queryKey: ["link", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id,short_code,original_url,title,click_count,created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as LinkRow;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["events", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("id,link_id,created_at,country,city,region,browser,os,device_type,referrer,ip_hash")
        .eq("link_id", id)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as (AnalyticsEvent & { ip_hash: string | null })[];
    },
  });

  const events = eventsQuery.data ?? [];

  const trend = useMemo(() => bucketByDay(events, 14), [events]);
  const countries = useMemo(() => topBy(events, "country", "Unknown"), [events]);
  const devices = useMemo(() => topBy(events, "device_type", "Desktop"), [events]);
  const browsers = useMemo(() => topBy(events, "browser", "Unknown"), [events]);
  const referrers = useMemo(() => topBy(events, "referrer", "Direct"), [events]);
  const uniques = useMemo(() => uniqueVisitors(events), [events]);

  if (linkQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!linkQuery.data) return null;
  const link = linkQuery.data;
  const fullUrl = `${typeof window === "undefined" ? "" : window.location.origin}/r/${link.short_code}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <button
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Link analytics
          </p>
          <h1 className="mt-2 truncate font-mono text-2xl font-semibold tracking-tight">
            /r/{link.short_code}
          </h1>
          <a
            href={link.original_url}
            target="_blank"
            rel="noopener"
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{link.original_url}</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          Created {formatRelative(link.created_at)}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total clicks" value={formatNumber(link.click_count)} />
        <Stat label="Unique visitors" value={formatNumber(uniques)} />
        <Stat
          label="Top country"
          value={countries[0]?.label ?? "—"}
          hint={countries[0] ? `${countries[0].value} clicks` : "No data yet"}
        />
        <Stat
          label="Top referrer"
          value={referrers[0]?.label ?? "Direct"}
          hint={referrers[0] ? `${referrers[0].value} clicks` : ""}
        />
      </section>

      <section className="rounded-xl border border-border bg-card/40 p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-sm font-medium">Click trend</p>
            <p className="text-xs text-muted-foreground">Last 14 days</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {formatNumber(events.length)} tracked events
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.14 184)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.78 0.14 184)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 5%)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tickFormatter={(v: string) => v.slice(5)}
                stroke="oklch(0.58 0.01 240)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.58 0.01 240)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.185 0 0)",
                  border: "1px solid oklch(1 0 0 / 10%)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "oklch(0.93 0.005 240)" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="oklch(0.78 0.14 184)"
                strokeWidth={2}
                fill="url(#brandGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="Geography" icon={MapPin} buckets={countries} emptyHint="No visitors yet" />
        <BreakdownCard
          title="Devices"
          icon={Smartphone}
          buckets={devices}
          emptyHint="No device data yet"
        />
        <BreakdownCard title="Browsers" icon={Monitor} buckets={browsers} emptyHint="No browser data yet" />
        <BreakdownCard title="Referrers" icon={ExternalLink} buckets={referrers} emptyHint="No referrer data yet" />
      </div>

      <section className="rounded-xl border border-border bg-card/40">
        <div className="border-b border-border p-4">
          <p className="text-sm font-medium">Recent activity</p>
          <p className="text-xs text-muted-foreground">The latest 20 events for this link</p>
        </div>
        {events.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No clicks yet. Share{" "}
            <span className="font-mono text-foreground">{fullUrl}</span> to start tracking.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.slice(0, 20).map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                  <span className="truncate">
                    {ev.country ?? "Unknown"} · {ev.device_type ?? "—"} · {ev.browser ?? "—"}
                  </span>
                </div>
                <span className="truncate font-mono text-muted-foreground">
                  {ev.referrer ? shortDomain(ev.referrer) : "direct"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 truncate font-mono text-xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BreakdownCard({
  title,
  icon: Icon,
  buckets,
  emptyHint,
}: {
  title: string;
  icon: typeof MapPin;
  buckets: { label: string; value: number }[];
  emptyHint: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {buckets.length === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {buckets.map((b) => (
            <li key={b.label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="truncate">{b.label}</span>
                <span className="font-mono text-muted-foreground">{b.value}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-brand"
                  style={{ width: `${(b.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
