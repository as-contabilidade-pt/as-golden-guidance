CREATE POLICY "Users resubmit after approved unlock" ON public.month_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.unlock_requests u WHERE u.user_id = auth.uid() AND u.year = month_submissions.year AND u.month = month_submissions.month AND u.status = 'aprovado'))
WITH CHECK (user_id = auth.uid() AND declaration_accepted = true);
CREATE POLICY "Users close own approved unlock" ON public.unlock_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'aprovado')
WITH CHECK (user_id = auth.uid() AND status = 'fechado');
GRANT UPDATE ON public.month_submissions TO authenticated;
GRANT UPDATE ON public.unlock_requests TO authenticated;