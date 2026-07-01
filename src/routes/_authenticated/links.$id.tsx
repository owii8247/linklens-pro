import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { ArrowLeft, ExternalLink, MapPin, Monitor, Smartphone } from "lucide-react";

import { getLinkAnalytics } from "@/lib/links.functions";
import { bucketByDay, topBy, uniqueVisitors, type AnalyticsEvent, type Bucket } from "@/lib/analytics";
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
  const fetchAnalytics = useServerFn(getLinkAnalytics);

  const analyticsQuery = useQuery({
    queryKey: ["link-analytics", id],
    queryFn: async () => fetchAnalytics({ data: { id } }),
    retry: 1,
  });

  const events = (analyticsQuery.data?.events ?? []) as (AnalyticsEvent & { ip_hash: string | null })[];

  const trend = useMemo(() => bucketByDay(events, 14), [events]);
  const countries = useMemo(() => topBy(events, "country", "Unknown"), [events]);
  const devices = useMemo(() => topBy(events, "device_type", "Desktop"), [events]);
  const browsers = useMemo(() => topBy(events, "browser", "Unknown"), [events]);
  const referrers = useMemo(() => topBy(events, "referrer", "Direct"), [events]);
  const uniques = useMemo(() => uniqueVisitors(events), [events]);

  if (analyticsQuery.isLoading) {
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

  if (!analyticsQuery.data?.link) return null;
  const link = analyticsQuery.data.link as LinkRow;
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
        <TrendChart buckets={trend} />
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

function TrendChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.value));
  return (
    <div className="h-64 w-full rounded-lg border border-border bg-background/50 p-4">
      <div
        className="grid h-full items-end gap-1.5"
        style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
        aria-label="Click trend chart"
      >
        {buckets.map((bucket) => {
          const height = Math.max(6, (bucket.value / max) * 100);
          return (
            <div key={bucket.label} className="flex h-full min-w-0 flex-col justify-end gap-2">
              <div
                className="min-h-1 rounded-t-sm bg-brand/75 transition-colors hover:bg-brand"
                style={{ height: `${height}%` }}
                title={`${bucket.label}: ${bucket.value} clicks`}
              />
              <span className="truncate text-center font-mono text-[10px] text-muted-foreground">
                {bucket.label.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
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
