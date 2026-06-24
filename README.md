# LinkLens — See Beyond Every Click

LinkLens is a premium URL shortener with deep, real-time click analytics. Built as a senior-level reference implementation: clean architecture, strict TypeScript, row-level security, and a polished, dark-first UI.

> Stack: **React 19 · TypeScript · TanStack Start (Vite + SSR on the edge) · TanStack Router · TanStack Query · React Hook Form + Zod · Tailwind CSS v4 · Recharts · Supabase (Postgres + Auth + RLS, accessed via Lovable Cloud)**.

---

## Features

- 🔐 Email/password authentication with secure session handling
- ⚡ Edge-rendered redirects (`/r/<code>`) with async, non-blocking analytics ingestion
- 🎯 Custom aliases or collision-safe 7-character codes (base 62, no look-alikes)
- 📊 Per-link analytics: click trend chart, geography, devices, browsers, referrers, recent activity
- 🔢 KPI cards (clicks, unique visitors, top country, top performer)
- 🧷 One-click copy + QR code generation (downloadable PNG)
- 🗂 Search, filter, archive/restore, delete
- 🌒 Dark-first design system in semantic OKLCH tokens — no hardcoded colors
- ♿ Accessible Radix primitives, keyboard-friendly menus, focus rings, alt text
- 📱 Mobile-first responsive layout that scales to tablet and desktop
- 🛡 Row-level security on every table, hashed visitor IPs, no PII stored
- 🧭 SEO basics: per-route titles + OG tags, sitemap, robots.txt

---

## Architecture

### Why Supabase (Lovable Cloud) over a MERN backend?

The brief allows either. After evaluation, the Supabase-backed architecture wins on every axis that matters for this product:

| Concern | MERN (Mongo + Express) | Lovable Cloud (Postgres + Auth) |
|---|---|---|
| Auth | Roll your own (JWT, bcrypt, sessions, reset emails) | Built-in, audited, with managed refresh & reset flows |
| Per-user data isolation | App-layer checks (one mistake = data leak) | DB-enforced via Row Level Security |
| Analytics queries | Aggregations across many docs are awkward in Mongo | Native SQL `GROUP BY`, indexes, fast |
| Indexes for redirect hot-path | Manual setup | First-class, declared in migrations |
| Deploy | Two services to host (API + DB) | One platform, edge-deployed |
| Engineering time-to-quality | Slower | Significantly faster for the same security guarantees |

The shortener's hot path is `SELECT … WHERE short_code = ?` — an indexed Postgres lookup is ideal. Analytics rollups (`GROUP BY country`, `date_trunc`) are why relational won. Mongo would have been a tax, not a benefit.

### Folder layout

```
src/
  components/
    layout/        AppHeader, LinkLensMark
    ui/            Shadcn primitives (Radix-based)
  integrations/
    supabase/      auto-generated clients & types (do not edit)
  lib/
    analytics.ts   Pure aggregation helpers (bucketByDay, topBy, uniqueVisitors)
    format.ts      Number, date, URL formatters
    links.functions.ts   Authenticated server functions (create/update/delete)
    short-code.ts        nanoid alphabet + alias validation
  routes/
    __root.tsx           Root layout, fonts, toaster, auth listener
    index.tsx            Marketing landing
    auth.tsx             Login / signup
    _authenticated/
      route.tsx          Auth gate (SSR off, redirects to /auth)
      dashboard.tsx      Link list, KPIs, create form
      links.$id.tsx      Per-link analytics dashboard
      settings.tsx       Profile + sign-out
    r.$code.tsx          Server route: redirect + tracking
    sitemap[.]xml.ts
```

### Data model

```sql
profiles           (id PK → auth.users.id, email, display_name, avatar_url)
links              (id, user_id, short_code UNIQUE, original_url, title,
                    click_count, is_archived, created_at, updated_at)
analytics_events   (id, link_id FK, created_at, country, city, region,
                    browser, os, device_type, referrer, ip_hash, user_agent)
```

Indexes: `links(short_code)`, `links(user_id)`, `links(created_at DESC)`,
`analytics_events(link_id, created_at DESC)`.

### Security

- **Row Level Security** on every public table. Users can only read/write their own links; analytics events are owner-readable via a join check.
- **Public read of `links` for `anon`** so the `/r/<code>` redirect resolves without a session, but anon CANNOT see `user_id` joins, and they have **no** access to analytics rows.
- **Service-role client** is loaded *inside* the redirect handler only (`await import(...)`) so it never leaks into the client bundle.
- **No PII**: IP addresses are SHA-256 hashed with a project-scoped salt before insert. Only used to derive unique-visitor counts.
- **Input validation** with Zod on every server function. URLs are normalized and protocol-restricted to `http(s)`.
- **Reserved-word alias filter** prevents users from claiming `/r/api`, `/r/auth`, etc.
- **Strict TS** + `eslint --max-warnings 0` in CI.

### Click-tracking flow

1. Visitor hits `/r/<code>`.
2. Server route looks up the link by `short_code` (indexed).
3. If not found or archived → branded 404 HTML.
4. Otherwise: respond `302 Location: <original_url>` immediately (`Cache-Control: no-store`).
5. Asynchronously, the handler parses the user-agent (`ua-parser-js`), extracts geo from Cloudflare headers, hashes the IP, inserts the analytics row, and bumps `click_count`.

The visitor never waits on analytics.

---

## Local development

```bash
bun install
bun run dev
```

The dev server runs at `http://localhost:8080` (or whatever Vite picks). The Lovable Cloud project URL and publishable key are injected via `.env` automatically.

### Environment variables

Client-visible:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Server-only (used by server routes / functions):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (managed by Lovable Cloud, used only by `/r/<code>` for tracking)

---

## Engineering decisions & trade-offs

- **TanStack Start over Next.js**: filesystem routing with first-class typed loaders, server functions and server routes share one paradigm, and the edge runtime is fast enough for the redirect path. Loaders return nothing for queries; reads go through TanStack Query.
- **Server functions for mutations, raw server routes for redirects**: `createServerFn` gives us typed RPC for `createLink`/`deleteLink`/`updateLink` (with auth middleware), while `/r/<code>` must return a raw `Response` so it's a server route.
- **`/r/<code>` prefix instead of bare `/<code>`** avoids namespace collision with future top-level routes (`/about`, `/pricing`) and lets us reserve aliases like `api`, `auth`, `dashboard`.
- **Click count read-modify-write** in the redirect: simpler and fast enough for typical traffic. For high-throughput links this should move to a `SECURITY DEFINER` SQL function (`UPDATE … SET click_count = click_count + 1`) or, better, a queued counter table flushed via cron.
- **Service-role admin client** is restricted to the redirect handler. All user-facing CRUD goes through RLS-respecting authenticated clients.
- **Hashed IP** rather than storing raw IP: unique-visitor analytics without GDPR exposure.
- **Recharts** is good enough for an MVP; long-term I'd swap to `visx` or hand-roll SVG for full visual control.
- **No emails (verification, reset) wired up** in this build — they require provider configuration. The signup flow uses `emailRedirectTo` so it's trivial to enable later.

---

## Roadmap (deliberately deferred for scope)

- Custom branded domains (CNAME + Host-header routing)
- Password-protected and expiring links
- Folders, tags, CSV export
- Public read-only analytics pages
- Team collaboration / RBAC (`user_roles` + `has_role(...)` SECURITY DEFINER pattern, already documented)
- Redis caching of hot short_codes
- Subscription billing (Stripe)
- Audit log table
- Playwright e2e + Vitest unit coverage

---

## License

Built for a take-home assessment. Treat as MIT for evaluation purposes.
