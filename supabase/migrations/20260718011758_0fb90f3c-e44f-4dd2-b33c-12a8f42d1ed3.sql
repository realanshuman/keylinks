
-- Analytics columns on redemptions
ALTER TABLE public.redemptions
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS device text;

-- Views table
CREATE TABLE IF NOT EXISTS public.link_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  country text,
  referrer text,
  device text,
  ip text,
  user_agent text
);

GRANT SELECT ON public.link_views TO authenticated;
GRANT INSERT ON public.link_views TO anon, authenticated;
GRANT ALL ON public.link_views TO service_role;

ALTER TABLE public.link_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert view"
  ON public.link_views FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins read views"
  ON public.link_views FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "owners read own link views"
  ON public.link_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.links l
    WHERE l.id = link_views.link_id AND l.created_by = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_link_views_link_id_viewed_at
  ON public.link_views(link_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_redemptions_link_id_revealed_at
  ON public.redemptions(link_id, revealed_at DESC);

-- Slug format constraint (only enforced for new/updated rows going forward)
ALTER TABLE public.links
  ADD CONSTRAINT links_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$')
  NOT VALID;

-- Reserve system slugs. Trigger blocks these on insert/update.
CREATE OR REPLACE FUNCTION public.check_slug_reserved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug = ANY (ARRAY[
    'admin','dashboard','auth','api','r','login','signup','sign-in','sign-up',
    'about','pricing','terms','privacy','contact','settings','account','help',
    'docs','app','www','mail','root','static','assets','public'
  ]) THEN
    RAISE EXCEPTION 'reserved_slug';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_links_reserved_slug ON public.links;
CREATE TRIGGER trg_links_reserved_slug
  BEFORE INSERT OR UPDATE OF slug ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.check_slug_reserved();

-- Updated redeem_link with analytics metadata
CREATE OR REPLACE FUNCTION public.redeem_link(
  _slug text,
  _password_hash text,
  _country text DEFAULT NULL,
  _referrer text DEFAULT NULL,
  _device text DEFAULT NULL
)
RETURNS TABLE(code text, remaining_uses integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.links%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.links WHERE slug = _slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid'; END IF;
  IF l.disabled THEN RAISE EXCEPTION 'disabled'; END IF;
  IF l.expires_at IS NOT NULL AND l.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF l.max_uses IS NOT NULL AND l.use_count >= l.max_uses THEN RAISE EXCEPTION 'used'; END IF;
  IF l.password_hash IS NOT NULL AND (l.password_hash IS DISTINCT FROM _password_hash) THEN
    RAISE EXCEPTION 'wrong_password';
  END IF;

  UPDATE public.links SET use_count = use_count + 1 WHERE id = l.id;
  INSERT INTO public.redemptions(link_id, country, referrer, device)
    VALUES (l.id, _country, _referrer, _device);
  INSERT INTO public.activity_logs(action, link_id) VALUES ('redeemed', l.id);

  RETURN QUERY
    SELECT l.code,
           CASE WHEN l.max_uses IS NULL THEN NULL ELSE l.max_uses - (l.use_count + 1) END;
END;
$$;
