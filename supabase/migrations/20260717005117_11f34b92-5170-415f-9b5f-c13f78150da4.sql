
-- Allow users to manage their own links
CREATE POLICY "users update own links" ON public.links FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "users delete own links" ON public.links FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Users read own redemptions for their links
CREATE POLICY "users read own link redemptions" ON public.redemptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.links l WHERE l.id = redemptions.link_id AND l.created_by = auth.uid()));
