import { createFileRoute } from "@tanstack/react-router";
import { UAParser } from "ua-parser-js";
import { createHash } from "node:crypto";

// /r/$code — server-side redirect that records an analytics event.
// Uses the service-role client (loaded inside the handler) to bypass RLS for the click insert.

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const code = params.code;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: link } = await supabaseAdmin
          .from("links")
          .select("id,original_url,is_archived")
          .eq("short_code", code)
          .maybeSingle();

        if (!link || link.is_archived) {
          return new Response(renderNotFound(code), {
            status: 404,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }

        // Fire-and-forget analytics — never delay the redirect.
        void recordEvent({ linkId: link.id, request }).catch((err) => {
          console.error("[LinkLens] tracking error", err);
        });

        return new Response(null, {
          status: 302,
          headers: {
            Location: link.original_url,
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});

async function recordEvent({ linkId, request }: { linkId: string; request: Request }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const ua = request.headers.get("user-agent") ?? "";
  const referrer = request.headers.get("referer") ?? null;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const country = request.headers.get("cf-ipcountry") ?? null;
  const city = request.headers.get("cf-ipcity") ?? null;
  const region = request.headers.get("cf-region") ?? null;

  const parsed = ua ? UAParser(ua) : null;
  const browser = parsed?.browser.name ?? null;
  const os = parsed?.os.name ?? null;
  const deviceType =
    parsed?.device.type ??
    (ua.toLowerCase().includes("mobile") ? "mobile" : "desktop");

  // Hash IP so we can count unique visitors without storing PII.
  const ipHash = ip
    ? createHash("sha256")
        .update(ip + "::" + (process.env.SUPABASE_PROJECT_ID ?? "salt"))
        .digest("hex")
        .slice(0, 32)
    : null;

  await supabaseAdmin.from("analytics_events").insert({
    link_id: linkId,
    country,
    city,
    region,
    browser,
    os,
    device_type: deviceType,
    referrer,
    ip_hash: ipHash,
    user_agent: ua.slice(0, 500),
  });

  // Increment click_count. Read-modify-write is acceptable for typical short-link
  // traffic; for high-write tables we'd switch to a SECURITY DEFINER SQL function
  // doing UPDATE … SET click_count = click_count + 1.
  const { data: current } = await supabaseAdmin
    .from("links")
    .select("click_count")
    .eq("id", linkId)
    .maybeSingle();
  await supabaseAdmin
    .from("links")
    .update({ click_count: (current?.click_count ?? 0) + 1 })
    .eq("id", linkId);
}

function renderNotFound(code: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Link not found · LinkLens</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e5e5e5;display:grid;place-items:center;min-height:100vh;margin:0}
    .c{text-align:center;max-width:32rem;padding:2rem}
    h1{font-size:2rem;margin:0 0 .5rem;letter-spacing:-0.02em}
    p{color:#9ca3af;margin:0 0 1.5rem;font-size:.875rem}
    code{font-family:ui-monospace,monospace;background:#1f1f1f;padding:.125rem .375rem;border-radius:.25rem}
    a{display:inline-block;background:#14b8a6;color:#0a0a0a;padding:.5rem 1rem;border-radius:.5rem;text-decoration:none;font-weight:600;font-size:.875rem}
    </style></head><body><div class="c">
    <p style="color:#14b8a6;font-family:ui-monospace,monospace;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase">Link not found</p>
    <h1>We can't find <code>/r/${escapeHtml(code)}</code></h1>
    <p>This short link may have been deleted, archived, or never existed.</p>
    <a href="/">Back to LinkLens</a>
    </div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
