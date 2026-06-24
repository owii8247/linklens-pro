# AI usage report

This project was built with significant AI assistance (Lovable / Claude). This document is an honest account of where AI accelerated the work, where I (the engineer) corrected it, and what I deliberately did not delegate.

## Where AI accelerated delivery

- **Scaffolding.** Initial folder layout, TanStack Start route files, Shadcn primitive wiring, and the auth gate boilerplate were generated quickly and correctly. Without AI this is half a day of paging through docs.
- **Tailwind v4 design system.** Translating the chosen "engineered dark mode" prototype into OKLCH tokens, semantic CSS variables, and shadcn-compatible `@theme inline` mappings was a near-mechanical task that AI did well.
- **Form plumbing.** React Hook Form + Zod resolver + Shadcn components is highly templated — AI produced clean, type-safe versions on the first pass.
- **Recharts area chart with gradient fill** matching the design tokens was painless via AI.
- **Markdown docs.** This file, the README, and inline JSDoc-style comments were drafted by AI then edited.

## Mistakes AI made that I corrected

1. **`SECURITY DEFINER` on a public-callable function.** The first migration exposed an `increment_link_clicks` RPC executable by `anon`. The linter flagged it. The right fix wasn't to silence the warning — it was to recognize that anon shouldn't be writing to `links` at all. I moved the click increment server-side (service role inside the redirect handler) and dropped the function.
2. **Over-broad `WITH CHECK (true)` on the analytics insert policy.** AI's first pass let any anon insert any row into `analytics_events`. I tightened the policy to `EXISTS (SELECT 1 FROM links WHERE id = link_id)` — visitors can record clicks, but only for real links.
3. **Top-level `process.env` reads in shared modules.** AI tried to grab the salt at module scope. On Cloudflare Workers that returns `undefined`. Fixed by reading inside the handler.
4. **`Record<string, unknown>` passed to a typed Supabase update.** TypeScript rejected it because the generated types are strict. I rewrote the patch builder with an explicit narrow type.
5. **Initial draft used `<a href>` for navigation inside the app.** Replaced with TanStack `<Link>` so preloading, type safety, and client-side routing all work.

## Engineering decisions I made myself (not delegated)

- **Schema design and RLS policy shape.** Specifically: who can SELECT vs INSERT on `analytics_events`, the `anon` SELECT policy on `links` for the redirect, and the decision to hash IPs rather than store them.
- **Click-tracking flow** — respond first, track after — and the explicit acknowledgement in the README that the current read-modify-write increment is a known scalability trade-off for an MVP.
- **Route shape** (`/r/<code>` vs bare `/<code>`) to keep the URL space extensible.
- **Service-role isolation**: only the redirect handler loads the admin client, and only via dynamic `await import(...)` so it never lands in the client bundle.

## One technical decision I intentionally did NOT delegate to AI

**Backend choice: Supabase vs MERN.** The brief explicitly invited me to evaluate. I wrote the comparison table in the README myself because the right answer depends on judgment about the product's hot paths (indexed lookup + relational analytics), the engineering cost of re-implementing managed auth + RLS in Express + Mongo, and what a senior reviewer would consider "production-ready." That's a senior-engineer call. AI is good at drafting both sides of the argument; deciding which one to ship is on me.

## How I worked with AI

- Asked for design directions first, picked one, then locked the visual language before any feature code.
- Built schema + RLS in the same migration as `GRANT`s (Lovable Cloud convention) and ran the security linter, treating each warning as a real bug rather than noise.
- Reviewed every generated file before commit; rejected the largest auto-generated dashboard rewrite in favor of a smaller, leaner version.
- Kept the AI on a short leash for security-critical code: every RLS policy and every server function was read line-by-line.
