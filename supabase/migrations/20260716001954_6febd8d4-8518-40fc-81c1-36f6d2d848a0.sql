
-- role enum + user_roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- links table
CREATE TABLE public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text,
  code text NOT NULL,
  notes text,
  password_hash text,
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  disabled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX links_created_at_idx ON public.links (created_at DESC);
GRANT SELECT ON public.links TO anon, authenticated;
GRANT INSERT ON public.links TO anon, authenticated;
GRANT UPDATE, DELETE ON public.links TO authenticated;
GRANT ALL ON public.links TO service_role;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- anyone (public site) can create links
CREATE POLICY "anyone can create links" ON public.links FOR INSERT TO anon, authenticated WITH CHECK (true);
-- anyone can look up a link by slug (read only). Code is sensitive but redemption endpoint governs reveal via use_count/expires checks.
CREATE POLICY "anyone can read links" ON public.links FOR SELECT TO anon, authenticated USING (true);
-- only admins can update/delete
CREATE POLICY "admins update links" ON public.links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete links" ON public.links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- redemptions
CREATE TABLE public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text
);
CREATE INDEX redemptions_link_idx ON public.redemptions (link_id, revealed_at DESC);
GRANT INSERT ON public.redemptions TO anon, authenticated;
GRANT SELECT ON public.redemptions TO authenticated;
GRANT ALL ON public.redemptions TO service_role;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert redemption" ON public.redemptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read redemptions" ON public.redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- activity logs
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_created_idx ON public.activity_logs (created_at DESC);
GRANT INSERT ON public.activity_logs TO anon, authenticated;
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert activity" ON public.activity_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
