import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateShortCode, isValidAlias, normalizeUrl } from "./short-code";

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .max(2048, "URL too long")
  .refine((v) => {
    try {
      const u = new URL(normalizeUrl(v));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) URL");

const createInput = z.object({
  url: urlSchema,
  alias: z.string().optional().nullable(),
  title: z.string().max(120).optional().nullable(),
});

export const createLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const original_url = normalizeUrl(data.url);

    let short_code: string;
    if (data.alias && data.alias.trim()) {
      const alias = data.alias.trim();
      if (!isValidAlias(alias)) {
        throw new Error("Alias must be 3-32 chars: letters, numbers, _ or -");
      }
      const { data: existing } = await supabase
        .from("links")
        .select("id")
        .eq("short_code", alias)
        .maybeSingle();
      if (existing) throw new Error("That alias is already taken");
      short_code = alias;
    } else {
      // Retry up to 5 times in the unlikely event of a collision.
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const candidate = generateShortCode();
        const { data: existing } = await supabase
          .from("links")
          .select("id")
          .eq("short_code", candidate)
          .maybeSingle();
        if (!existing) {
          short_code = candidate;
          break;
        }
        if (++attempt > 5) throw new Error("Could not generate a unique code");
      }
    }

    const { data: link, error } = await supabase
      .from("links")
      .insert({
        user_id: userId,
        short_code,
        original_url,
        title: data.title ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return link;
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().max(120).optional().nullable(),
        original_url: urlSchema.optional(),
        is_archived: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, original_url, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (original_url) patch.original_url = normalizeUrl(original_url);
    const { data: link, error } = await context.supabase
      .from("links")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return link;
  });
