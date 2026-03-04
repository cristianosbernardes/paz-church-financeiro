-- RLS policies for arquivos-de-entrada bucket
CREATE POLICY "Members can view entrada files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'arquivos-de-entrada' AND (storage.foldername(name))[1] IN (
  SELECT get_user_church_ids(auth.uid())::text
));

CREATE POLICY "Finance can upload entrada files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arquivos-de-entrada' AND (storage.foldername(name))[1] IN (
  SELECT c.id::text FROM memberships m JOIN churches c ON c.id = m.church_id
  WHERE m.user_id = auth.uid() AND m.role IN ('ADMIN', 'TESOURARIA')
));

CREATE POLICY "Finance can delete entrada files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arquivos-de-entrada' AND (storage.foldername(name))[1] IN (
  SELECT c.id::text FROM memberships m JOIN churches c ON c.id = m.church_id
  WHERE m.user_id = auth.uid() AND m.role IN ('ADMIN', 'TESOURARIA')
));

-- RLS policies for arquivos-de-saida bucket
CREATE POLICY "Members can view saida files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'arquivos-de-saida' AND (storage.foldername(name))[1] IN (
  SELECT get_user_church_ids(auth.uid())::text
));

CREATE POLICY "Finance can upload saida files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arquivos-de-saida' AND (storage.foldername(name))[1] IN (
  SELECT c.id::text FROM memberships m JOIN churches c ON c.id = m.church_id
  WHERE m.user_id = auth.uid() AND m.role IN ('ADMIN', 'TESOURARIA')
));

CREATE POLICY "Finance can delete saida files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arquivos-de-saida' AND (storage.foldername(name))[1] IN (
  SELECT c.id::text FROM memberships m JOIN churches c ON c.id = m.church_id
  WHERE m.user_id = auth.uid() AND m.role IN ('ADMIN', 'TESOURARIA')
));