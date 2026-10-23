-- Testes RLS por impersonação. Correr no editor SQL da base de dados de produção.
-- Substituir os dois UUIDs por dois clientes de TESTE. Tudo corre numa transação
-- terminada com ROLLBACK: nada fica gravado.
BEGIN;

CREATE TEMP TABLE _r (teste text, resultado text) ON COMMIT DROP;
GRANT ALL ON _r TO authenticated;

-- >>> EDITAR <<<
SELECT set_config('t.a', '00000000-0000-0000-0000-00000000000a', true),
       set_config('t.b', '00000000-0000-0000-0000-00000000000b', true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);

INSERT INTO _r SELECT 'A não lê documentos do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.documents WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 'A não lê submissões do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.month_submissions WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 'A não lê perfil do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.profiles WHERE id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 'A não lê ficha do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.client_records WHERE user_id = current_setting('t.b')::uuid;
INSERT INTO _r SELECT 'A não lê conversões de extratos', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.statement_conversions;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.user_roles(user_id, role) VALUES (current_setting('t.a')::uuid, 'admin');
    INSERT INTO _r VALUES ('A não se torna admin', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES ('A não se torna admin', 'PASS'); END;

  BEGIN
    INSERT INTO public.month_submissions(user_id, year, month, declaration_accepted)
    VALUES (current_setting('t.b')::uuid, 2020, 1, true);
    INSERT INTO _r VALUES ('A não submete mês do B', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES ('A não submete mês do B', 'PASS'); END;

  BEGIN
    INSERT INTO public.unlock_requests(user_id, nif, year, month, reason, declaration_accepted, status)
    VALUES (current_setting('t.a')::uuid, '0', 2020, 1, 't', true, 'aprovado');
    INSERT INTO _r VALUES ('A não auto-aprova desbloqueio', 'FAIL');
  EXCEPTION WHEN others THEN INSERT INTO _r VALUES ('A não auto-aprova desbloqueio', 'PASS'); END;
END $$;

WITH u AS (UPDATE public.profiles SET full_name = 'hack' WHERE id = current_setting('t.b')::uuid RETURNING 1)
INSERT INTO _r SELECT 'A não altera perfil do B', CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM u;

RESET ROLE;
SELECT * FROM _r ORDER BY teste;
ROLLBACK;
