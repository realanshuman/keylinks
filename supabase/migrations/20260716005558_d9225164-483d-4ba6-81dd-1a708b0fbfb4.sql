
CREATE OR REPLACE FUNCTION public.redeem_link(_slug text, _password_hash text)
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
  INSERT INTO public.redemptions(link_id) VALUES (l.id);
  INSERT INTO public.activity_logs(action, link_id) VALUES ('redeemed', l.id);

  RETURN QUERY
    SELECT l.code,
           CASE WHEN l.max_uses IS NULL THEN NULL ELSE l.max_uses - (l.use_count + 1) END;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_link(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_link(text, text) TO anon, authenticated;
