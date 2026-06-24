
-- Drop the public-callable click increment; redirects will update click_count server-side via service role
DROP FUNCTION IF EXISTS public.increment_link_clicks(UUID);

-- Tighten event insert policies: require that the referenced link exists
DROP POLICY IF EXISTS "events_public_insert" ON public.analytics_events;
DROP POLICY IF EXISTS "events_auth_insert" ON public.analytics_events;

CREATE POLICY "events_public_insert" ON public.analytics_events
  FOR INSERT TO anon
  WITH CHECK (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id));

CREATE POLICY "events_auth_insert" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id));
