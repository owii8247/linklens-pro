import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Globe2, QrCode, Sparkles, Zap } from "lucide-react";
import { LinkLensMark } from "@/components/layout/LinkLensMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LinkLens — See Beyond Every Click" },
      {
        name: "description",
        content:
          "The premium URL shortener for teams who care about analytics. Custom aliases, QR codes, and real-time click insights.",
      },
      { property: "og:title", content: "LinkLens — See Beyond Every Click" },
      {
        property: "og:description",
        content:
          "Premium URL shortener with real-time click analytics, custom aliases, and QR codes.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <LinkLensMark />
            <span className="font-semibold tracking-tight">LinkLens</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-brand-foreground transition-all hover:brightness-110"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 pt-16 pb-20 text-center md:pt-24 md:pb-28">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            <span className="text-muted-foreground">
              Real-time analytics · Country · Device · Referrer
            </span>
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-7xl">
            See beyond <span className="text-muted-foreground">every click.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground md:text-lg">
            LinkLens is the premium URL shortener for teams who measure what matters.
            Custom aliases, QR codes, and analytics that go deeper than clicks.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-all hover:brightness-110"
            >
              Start free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            No credit card · Free forever tier
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="rounded-3xl border border-border bg-card p-2">
          <div className="rounded-2xl bg-background p-6 md:p-10">
            <div className="grid gap-6 md:grid-cols-3">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-xl border border-border bg-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {k.label}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tracking-tight">
                    {k.value}
                  </p>
                  <p className="mt-1 text-xs text-brand">{k.delta}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-7">
              <div className="md:col-span-5 rounded-xl border border-border bg-card p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium">Click trend</p>
                    <p className="text-xs text-muted-foreground">Last 14 days</p>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">12,842 clicks</p>
                </div>
                <div className="mt-4 flex h-32 items-end gap-1">
                  {[20, 40, 32, 55, 42, 60, 48, 75, 62, 85, 70, 92, 80, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm bg-brand/20"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-5">
                <p className="text-sm font-medium">Top referrers</p>
                <ul className="mt-4 space-y-3">
                  {referrers.map((r) => (
                    <li key={r.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>{r.label}</span>
                        <span className="font-mono text-muted-foreground">{r.value}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-brand" style={{ width: `${r.pct}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl border-t border-border px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-brand">Features</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Engineered for measurement.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="grid size-10 place-items-center rounded-lg bg-brand/10 ring-1 ring-brand/30 text-brand">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="rounded-3xl border border-border bg-card p-10 text-center md:p-16">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Ship a link. Learn from it.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Create your first shortened link in under ten seconds.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:brightness-110"
          >
            Create your first link
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LinkLensMark />
            <span>LinkLens · See Beyond Every Click</span>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} LinkLens
          </p>
        </div>
      </footer>
    </div>
  );
}

const kpis = [
  { label: "Total clicks", value: "12,842", delta: "+14% this month" },
  { label: "Unique visitors", value: "8,102", delta: "+2.4% week" },
  { label: "Top country", value: "United States", delta: "42% of traffic" },
];

const referrers = [
  { label: "x.com", value: "2,419", pct: 65 },
  { label: "LinkedIn", value: "1,802", pct: 48 },
  { label: "Direct", value: "1,210", pct: 32 },
  { label: "GitHub", value: "640", pct: 18 },
];

const features = [
  {
    icon: BarChart3,
    title: "Deep analytics",
    body: "Track every click down to country, city, device, OS, browser and referrer — in real time.",
  },
  {
    icon: QrCode,
    title: "Instant QR codes",
    body: "Every link comes with a high-resolution QR ready to drop into print, slides, or merch.",
  },
  {
    icon: Globe2,
    title: "Custom aliases",
    body: "Pick a memorable slug or generate a collision-safe 7-character code automatically.",
  },
  {
    icon: Zap,
    title: "Edge-fast redirects",
    body: "Redirects run at the edge so your audience reaches the destination without a perceptible delay.",
  },
  {
    icon: Sparkles,
    title: "Beautiful dashboard",
    body: "A minimalist, dark-first UI inspired by the tools you already love using every day.",
  },
  {
    icon: BarChart3,
    title: "Secure by default",
    body: "Row-level security ensures only you can see your links and their analytics.",
  },
];
