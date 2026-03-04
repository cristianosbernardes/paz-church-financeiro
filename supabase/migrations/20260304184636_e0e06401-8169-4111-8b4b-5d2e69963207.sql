CREATE TABLE public.member_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_roles_select_member" ON public.member_roles
  FOR SELECT TO authenticated
  USING (is_member_of_church(church_id));

CREATE POLICY "member_roles_insert_finance" ON public.member_roles
  FOR INSERT TO authenticated
  WITH CHECK (can_write_finance(church_id));

CREATE POLICY "member_roles_update_finance" ON public.member_roles
  FOR UPDATE TO authenticated
  USING (can_write_finance(church_id))
  WITH CHECK (can_write_finance(church_id));

CREATE POLICY "member_roles_delete_finance" ON public.member_roles
  FOR DELETE TO authenticated
  USING (can_write_finance(church_id));
