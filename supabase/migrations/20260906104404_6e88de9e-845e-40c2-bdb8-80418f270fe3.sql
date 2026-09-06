
CREATE POLICY "Clientes leem os seus documentos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Clientes enviam os seus documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Clientes apagam os seus documentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
