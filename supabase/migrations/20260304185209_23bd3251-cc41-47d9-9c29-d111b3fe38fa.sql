-- Add member_id to transactions (nullable FK)
ALTER TABLE public.transactions ADD COLUMN member_id uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Add conversion_date to members
ALTER TABLE public.members ADD COLUMN conversion_date date;

-- Create member_relatives table
CREATE TABLE public.member_relatives (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relative_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  relative_name text,
  relationship text DEFAULT 'Parente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.member_relatives ENABLE ROW LEVEL SECURITY;

-- RLS: access through the member's church
CREATE POLICY "relatives_select" ON public.member_relatives
  FOR SELECT TO authenticated
  USING (member_id IN (
    SELECT m.id FROM public.members m
    WHERE m.church_id IN (SELECT get_user_church_ids(auth.uid()))
  ));

CREATE POLICY "relatives_insert" ON public.member_relatives
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (
    SELECT m.id FROM public.members m
    WHERE can_write_finance(m.church_id)
  ));

CREATE POLICY "relatives_update" ON public.member_relatives
  FOR UPDATE TO authenticated
  USING (member_id IN (
    SELECT m.id FROM public.members m
    WHERE can_write_finance(m.church_id)
  ));

CREATE POLICY "relatives_delete" ON public.member_relatives
  FOR DELETE TO authenticated
  USING (member_id IN (
    SELECT m.id FROM public.members m
    WHERE can_write_finance(m.church_id)
  ));