-- Reabertura de um mês (pedido de desbloqueio aprovado):
--   * aprovada ANTES do prazo (dia 10 do mês seguinte) -> aberta até ao prazo;
--   * aprovada DEPOIS do prazo -> aberta durante 72 horas úteis.
-- Antes desta correção, um mês já submetido e reaberto dentro do prazo ficava
-- aberto só 72 h úteis na base de dados, enquanto o site o mostrava aberto até
-- ao dia 10 (o cliente via a pasta aberta e recebia "Não tem permissão").
-- Idempotente: pode ser corrido mais do que uma vez.

CREATE OR REPLACE FUNCTION public.month_is_open(p_user_id uuid, p_year integer, p_month integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_lisbon timestamp := now() AT TIME ZONE 'Europe/Lisbon';
  v_cur_year int := extract(year from v_lisbon)::int;
  v_cur_month int := extract(month from v_lisbon)::int;
  v_deadline timestamptz;
  v_submitted_at timestamptz;
  v_unlock_at timestamptz;
  v_unlock_until timestamptz;
BEGIN
  -- Meses futuros nunca estão abertos.
  IF (p_year > v_cur_year) OR (p_year = v_cur_year AND p_month > v_cur_month) THEN
    RETURN false;
  END IF;

  -- É preciso uma ficha de cliente ligada à conta e com a pasta ativa.
  IF NOT EXISTS (
    SELECT 1 FROM public.client_records
    WHERE user_id = p_user_id AND folder_active = true
  ) THEN
    RETURN false;
  END IF;

  -- Prazo: dia 10 do mês seguinte, inclusive (fecha às 00:00 do dia 11, hora de Lisboa).
  IF p_month = 12 THEN
    v_deadline := make_timestamptz(p_year + 1, 1, 11, 0, 0, 0, 'Europe/Lisbon');
  ELSE
    v_deadline := make_timestamptz(p_year, p_month + 1, 11, 0, 0, 0, 'Europe/Lisbon');
  END IF;

  SELECT max(submitted_at) INTO v_submitted_at
  FROM public.month_submissions
  WHERE user_id = p_user_id AND year = p_year AND month = p_month;

  SELECT max(decided_at) INTO v_unlock_at
  FROM public.unlock_requests
  WHERE user_id = p_user_id AND year = p_year AND month = p_month
    AND status = 'aprovado' AND decided_at IS NOT NULL;

  IF v_unlock_at IS NOT NULL THEN
    IF v_unlock_at < v_deadline THEN
      v_unlock_until := v_deadline;
    ELSE
      v_unlock_until := public.add_business_hours_lisbon(v_unlock_at, 72);
    END IF;
  END IF;

  -- Mês submetido: só reabre com uma aprovação posterior à última submissão.
  IF v_submitted_at IS NOT NULL THEN
    RETURN (v_unlock_at IS NOT NULL
            AND v_unlock_at >= v_submitted_at
            AND v_now < v_unlock_until);
  END IF;

  -- Mês não submetido: aberto até ao prazo; depois, só com reabertura ativa.
  IF v_now < v_deadline THEN
    RETURN true;
  END IF;

  RETURN (v_unlock_at IS NOT NULL AND v_now < v_unlock_until);
END;
$function$;
