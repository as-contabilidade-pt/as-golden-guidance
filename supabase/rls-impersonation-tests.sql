-- Testes RLS por impersonação (mesmas verificações de dados do script Node).
-- Correr no SQL Editor. Tudo termina em ROLLBACK: nada fica gravado.
-- O Storage (download, URL assinada, tipo e tamanho) NÃO é testável por SQL:
-- usar scripts/security-tests.mjs para isso.
BEGIN;

CREATE TEMP TABLE _r (n int, teste text, resultado text) ON COMMIT DROP;
GRANT ALL ON _r TO authenticated;

-- >>> EDITAR <<<  (A e B = clientes de teste com pasta ativa; C = pasta inativa ou repetir A)
SELECT set_config('t.a', '6ac6ab4c-5795-4602-85a0-0b81bf19c1e6', true),
       set_config('t.b', 'fc3353b6-653a-4699-bfb4-df157b3b29a0', true),
       set_config('t.c', '00000000-0000-0000-0000-00000000000c', true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);

-- 1. Isolamento de leitura
INSERT INTO _r SELECT 1, 'A não lê documentos do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.documents WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 1, 'A não lê submissões do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.month_submissions WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 1, 'A não lê pedidos do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.unlock_requests WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 1, 'A não lê perfil do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.profiles WHERE id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 1, 'A não lê ficha do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.client_records WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 1, 'A não lê conversões de extratos', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM public.statement_conversions;
INSERT INTO _r SELECT 4, 'A não vê ficheiros do B (metadados Storage)', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM storage.objects WHERE bucket_id = 'documentos' AND (storage.foldername(name))[1] = current_setting('t.b');

DO $$
DECLARE
  a uuid := current_setting('t.a')::uuid;
  b uuid := current_setting('t.b')::uuid;
  y int := extract(year from now())::int;
  m int := extract(month from now())::int;
  ly int := extract(year from now() - interval '3 months')::int;
  lm int := extract(month from now() - interval '3 months')::int;
  fy int := extract(year from now() + interval '1 month')::int;
  fm int := extract(month from now() + interval '1 month')::int;
  v record; n int;
BEGIN
  -- 2
  BEGIN
    INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path)
    VALUES (b, y, m, 'outros_documentos', 990, '__teste__x', '__teste__x.pdf', b || '/__teste__x.pdf');
    INSERT INTO _r VALUES (2, 'A não insere documento do B', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (2, 'A não insere documento do B', 'PASS'); END;

  -- 5
  BEGIN
    INSERT INTO public.user_roles(user_id, role) VALUES (a, 'admin');
    INSERT INTO _r VALUES (5, 'A não se torna admin', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (5, 'A não se torna admin', 'PASS'); END;

  -- 6
  BEGIN
    UPDATE public.profiles SET nif = '999999990', email = '__teste__@x.pt', full_name = '__teste__' WHERE id = a;
    SELECT count(*) INTO n FROM public.profiles WHERE id = a AND (nif = '999999990' OR email = '__teste__@x.pt' OR full_name = '__teste__');
    INSERT INTO _r VALUES (6, 'A não altera nif/email/nome', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (6, 'A não altera nif/email/nome', 'PASS'); END;
  WITH u AS (UPDATE public.profiles SET full_name = 'hack' WHERE id = b RETURNING 1)
  INSERT INTO _r SELECT 6, 'A não altera perfil do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM u;

  -- 10
  SELECT count(*) INTO n FROM public.audit_log;
  INSERT INTO _r VALUES (10, 'A não lê audit_log', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END);
  BEGIN
    INSERT INTO public.audit_log(table_name, action) VALUES ('__teste__', 'INSERT');
    INSERT INTO _r VALUES (10, 'A não escreve audit_log', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (10, 'A não escreve audit_log', 'PASS'); END;

  -- 11 + 15
  BEGIN
    INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path, late, late_submitted_at, created_at)
    VALUES (a, y, m, 'outros_documentos', 991, '__teste__ok', '__teste__ok.pdf', a || '/__teste__ok.pdf', true, '2000-01-01', '2000-01-01')
    RETURNING created_at, late_submitted_at INTO v;
    INSERT INTO _r VALUES (11, 'A insere no mês aberto', 'PASS');
    INSERT INTO _r VALUES (15, 'Datas forjadas corrigidas', CASE WHEN v.created_at > '2001-01-01' AND coalesce(v.late_submitted_at, now()) > '2001-01-01' THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN
    INSERT INTO _r VALUES (11, 'A insere no mês aberto', 'FAIL (' || SQLERRM || ')');
  END;

  -- 12
  BEGIN
    INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path)
    VALUES (a, ly, lm, 'outros_documentos', 992, '__teste__l', '__teste__l.pdf', a || '/__teste__l.pdf');
    INSERT INTO _r VALUES (12, 'Mês bloqueado recusado', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (12, 'Mês bloqueado recusado', 'PASS'); END;

  -- 13
  BEGIN
    INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path)
    VALUES (a, fy, fm, 'outros_documentos', 993, '__teste__f', '__teste__f.pdf', a || '/__teste__f.pdf');
    INSERT INTO _r VALUES (13, 'Mês futuro recusado', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (13, 'Mês futuro recusado', 'PASS'); END;

  -- 16 + 17
  BEGIN
    INSERT INTO public.month_submissions(user_id, year, month, declaration_accepted, submitted_at, document_count, nif, company_name)
    VALUES (a, y, m, true, '2000-01-01', 9999, '999999990', '__teste__falsa')
    RETURNING submitted_at, document_count, nif, company_name INTO v;
    INSERT INTO _r VALUES (16, 'Submissão: data/contagem reais', CASE WHEN v.submitted_at > '2001-01-01' AND v.document_count <> 9999 THEN 'PASS' ELSE 'FAIL' END);
    INSERT INTO _r VALUES (17, 'Submissão: nif/empresa reais', CASE WHEN v.nif IS DISTINCT FROM '999999990' AND v.company_name IS DISTINCT FROM '__teste__falsa' THEN 'PASS' ELSE 'FAIL' END);

    -- 18
    BEGIN
      INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path)
      VALUES (a, y, m, 'outros_documentos', 994, '__teste__s', '__teste__s.pdf', a || '/__teste__s.pdf');
      INSERT INTO _r VALUES (18, 'Mês submetido recusa inserir', 'FAIL');
    EXCEPTION WHEN others THEN INSERT INTO _r VALUES (18, 'Mês submetido recusa inserir', 'PASS'); END;
    BEGIN
      DELETE FROM public.documents WHERE user_id = a AND year = y AND month = m;
      GET DIAGNOSTICS n = ROW_COUNT;
      INSERT INTO _r VALUES (18, 'Mês submetido recusa apagar', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END);
    EXCEPTION WHEN others THEN INSERT INTO _r VALUES (18, 'Mês submetido recusa apagar', 'PASS'); END;
  EXCEPTION WHEN others THEN
    INSERT INTO _r VALUES (16, 'Submissão do mês aberto', 'FAIL (' || SQLERRM || ')');
  END;

  -- 20
  BEGIN
    UPDATE public.month_submissions SET document_count = 1 WHERE user_id = a;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _r VALUES (20, 'A não altera submissões', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (20, 'A não altera submissões', 'PASS'); END;
  BEGIN
    DELETE FROM public.month_submissions WHERE user_id = a;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO _r VALUES (20, 'A não apaga submissões', CASE WHEN n = 0 THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (20, 'A não apaga submissões', 'PASS'); END;

  -- 21 (bloquear com erro OU forçar 'pendente' e nif real contam como PASS)
  BEGIN
    INSERT INTO public.unlock_requests(user_id, nif, year, month, reason, declaration_accepted, status)
    VALUES (a, '999999990', 2020, 1, '__teste__', true, 'aprovado')
    RETURNING status, nif INTO v;
    INSERT INTO _r VALUES (21, 'Desbloqueio nasce pendente', CASE WHEN v.status <> 'aprovado' THEN 'PASS' ELSE 'FAIL' END);
    INSERT INTO _r VALUES (21, 'Desbloqueio com nif real', CASE WHEN v.nif <> '999999990' THEN 'PASS' ELSE 'FAIL' END);
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (21, 'Desbloqueio nasce pendente', 'PASS'); END;
END $$;

-- 22. Conta C (pasta inativa)
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.c'), 'role', 'authenticated')::text, true);
DO $$
DECLARE c uuid := current_setting('t.c')::uuid;
  y int := extract(year from now())::int; m int := extract(month from now())::int;
BEGIN
  IF c = '00000000-0000-0000-0000-00000000000c' THEN
    INSERT INTO _r VALUES (22, 'Conta inativa', 'SKIP (sem UUID de C)'); RETURN;
  END IF;
  BEGIN
    INSERT INTO public.documents(user_id, year, month, category, seq, label, original_name, storage_path)
    VALUES (c, y, m, 'outros_documentos', 995, '__teste__c', '__teste__c.pdf', c || '/__teste__c.pdf');
    INSERT INTO _r VALUES (22, 'Conta inativa não envia', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (22, 'Conta inativa não envia', 'PASS'); END;
  BEGIN
    INSERT INTO public.month_submissions(user_id, year, month, declaration_accepted) VALUES (c, y, m, true);
    INSERT INTO _r VALUES (22, 'Conta inativa não submete', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES (22, 'Conta inativa não submete', 'PASS'); END;
END $$;

RESET ROLE;
SELECT n AS "#", teste, resultado FROM _r ORDER BY n, teste;
ROLLBACK;
