
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- LINKS
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_links_user_id ON public.links(user_id);
CREATE INDEX idx_links_short_code ON public.links(short_code);
CREATE INDEX idx_links_created_at ON public.links(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links TO authenticated;
GRANT SELECT ON public.links TO anon;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
-- Owners can manage their links
CREATE POLICY "links_owner_select" ON public.links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "links_owner_insert" ON public.links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "links_owner_update" ON public.links FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "links_owner_delete" ON public.links FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Public read-by-short-code so /:shortCode redirects work for anyone
CREATE POLICY "links_public_read" ON public.links FOR SELECT TO anon USING (true);

-- ANALYTICS EVENTS
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  country TEXT,
  city TEXT,
  region TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  referrer TEXT,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE INDEX idx_events_link_id ON public.analytics_events(link_id);
CREATE INDEX idx_events_link_created ON public.analytics_events(link_id, created_at DESC);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
-- Link owners can read analytics for their links
CREATE POLICY "events_owner_select" ON public.analytics_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = link_id AND l.user_id = auth.uid()));
-- Anyone (visitor) can insert an event for any link (tracking from the redirect)
CREATE POLICY "events_public_insert" ON public.analytics_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "events_auth_insert" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (true);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_links_updated_at BEFORE UPDATE ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic click increment (used by the redirect handler)
CREATE OR REPLACE FUNCTION public.increment_link_clicks(p_link_id UUID)
RETURNS VOID AS $$
  UPDATE public.links SET click_count = click_count + 1 WHERE id = p_link_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.increment_link_clicks(UUID) TO anon, authenticated;
