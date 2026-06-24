// Shared types + aggregation helpers for analytics. Pure functions, easy to test.

export type AnalyticsEvent = {
  id: string;
  link_id: string;
  created_at: string;
  country: string | null;
  city: string | null;
  region: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  referrer: string | null;
};

export type Bucket = { label: string; value: number };

export function bucketByDay(events: AnalyticsEvent[], days = 14): Bucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ev of events) {
    const key = ev.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}

export function topBy(
  events: AnalyticsEvent[],
  field: keyof AnalyticsEvent,
  fallback = "Unknown",
  limit = 6,
): Bucket[] {
  const counts = new Map<string, number>();
  for (const ev of events) {
    const raw = ev[field] as string | null;
    const key = raw && raw.length ? raw : fallback;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

export function uniqueVisitors(events: { ip_hash: string | null }[]): number {
  const set = new Set<string>();
  for (const ev of events) if (ev.ip_hash) set.add(ev.ip_hash);
  return set.size;
}
