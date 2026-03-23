-- ============================================================
-- P3.1: Filtering by Multiple Stores and Cuts
-- Changing RPC parameters to accept arrays of UUIDs
-- ============================================================

-- Drop the old functions so PostgREST doesn't get confused by overloading
DROP FUNCTION IF EXISTS public.get_ranking_lojas(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_top_cortes(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_perda_por_classe(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_evolucao_perda(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_kpis_dashboard(DATE, DATE, UUID, UUID);

-- 1. get_ranking_lojas
CREATE OR REPLACE FUNCTION public.get_ranking_lojas(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_ids  UUID[] DEFAULT NULL,
  p_corte_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  loja_codigo  TEXT,
  loja_nome    TEXT,
  peso_inicial NUMERIC,
  perda_kg     NUMERIC,
  perda_pct    NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    l.codigo AS loja_codigo,
    l.nome AS loja_nome,
    SUM(i.peso_inicial) AS peso_inicial,
    SUM(i.perda_kg) AS perda_kg,
    CASE WHEN SUM(i.peso_inicial) > 0
      THEN ROUND((SUM(i.perda_kg) / SUM(i.peso_inicial)) * 100, 2)
      ELSE 0 END AS perda_pct
  FROM itens_apuracao i
  JOIN apuracoes a ON a.id = i.apuracao_id
  JOIN lojas l ON l.id = a.loja_id
  WHERE
    (p_data_ini IS NULL OR a.data_apuracao >= p_data_ini)
    AND (p_data_fim IS NULL OR a.data_apuracao <= p_data_fim)
    AND (p_loja_ids  IS NULL OR array_length(p_loja_ids, 1) IS NULL OR a.loja_id = ANY(p_loja_ids))
    AND (p_corte_ids IS NULL OR array_length(p_corte_ids, 1) IS NULL OR i.corte_id = ANY(p_corte_ids))
    AND i.peso_inicial > 0
    -- ENFORCEMENT DE SEGURANÇA:
    AND (
      NOT public.has_role(auth.uid(), 'loja') 
      OR a.loja_id = public.get_user_loja_id(auth.uid())
    )
  GROUP BY l.id, l.codigo, l.nome
  ORDER BY perda_pct DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_ranking_lojas TO authenticated;


-- 2. get_top_cortes
CREATE OR REPLACE FUNCTION public.get_top_cortes(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_ids  UUID[] DEFAULT NULL,
  p_corte_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  corte_descricao TEXT,
  peso_inicial    NUMERIC,
  perda_kg        NUMERIC,
  perda_pct       NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    i.corte_descricao,
    SUM(i.peso_inicial) AS peso_inicial,
    SUM(i.perda_kg) AS perda_kg,
    CASE WHEN SUM(i.peso_inicial) > 0
      THEN ROUND((SUM(i.perda_kg) / SUM(i.peso_inicial)) * 100, 2)
      ELSE 0 END AS perda_pct
  FROM itens_apuracao i
  JOIN apuracoes a ON a.id = i.apuracao_id
  WHERE
    (p_data_ini IS NULL OR a.data_apuracao >= p_data_ini)
    AND (p_data_fim IS NULL OR a.data_apuracao <= p_data_fim)
    AND (p_loja_ids  IS NULL OR array_length(p_loja_ids, 1) IS NULL OR a.loja_id = ANY(p_loja_ids))
    AND (p_corte_ids IS NULL OR array_length(p_corte_ids, 1) IS NULL OR i.corte_id = ANY(p_corte_ids))
    AND i.peso_inicial > 0
    -- ENFORCEMENT DE SEGURANÇA:
    AND (
      NOT public.has_role(auth.uid(), 'loja') 
      OR a.loja_id = public.get_user_loja_id(auth.uid())
    )
  GROUP BY i.corte_descricao
  ORDER BY perda_pct DESC
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_cortes TO authenticated;


-- 3. get_perda_por_classe
CREATE OR REPLACE FUNCTION public.get_perda_por_classe(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_ids  UUID[] DEFAULT NULL,
  p_corte_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  tipo_apuracao TEXT,
  peso_inicial  NUMERIC,
  perda_kg      NUMERIC,
  perda_pct     NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.tipo_apuracao::TEXT,
    SUM(i.peso_inicial) AS peso_inicial,
    SUM(i.perda_kg) AS perda_kg,
    CASE WHEN SUM(i.peso_inicial) > 0
      THEN ROUND((SUM(i.perda_kg) / SUM(i.peso_inicial)) * 100, 2)
      ELSE 0 END AS perda_pct
  FROM itens_apuracao i
  JOIN apuracoes a ON a.id = i.apuracao_id
  WHERE
    (p_data_ini IS NULL OR a.data_apuracao >= p_data_ini)
    AND (p_data_fim IS NULL OR a.data_apuracao <= p_data_fim)
    AND (p_loja_ids  IS NULL OR array_length(p_loja_ids, 1) IS NULL OR a.loja_id = ANY(p_loja_ids))
    AND (p_corte_ids IS NULL OR array_length(p_corte_ids, 1) IS NULL OR i.corte_id = ANY(p_corte_ids))
    AND i.peso_inicial > 0
    -- ENFORCEMENT DE SEGURANÇA:
    AND (
      NOT public.has_role(auth.uid(), 'loja') 
      OR a.loja_id = public.get_user_loja_id(auth.uid())
    )
  GROUP BY a.tipo_apuracao;
$$;
GRANT EXECUTE ON FUNCTION public.get_perda_por_classe TO authenticated;


-- 4. get_evolucao_perda
CREATE OR REPLACE FUNCTION public.get_evolucao_perda(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_ids  UUID[] DEFAULT NULL,
  p_corte_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  semana          DATE,
  peso_inicial    NUMERIC,
  perda_kg        NUMERIC,
  perda_pct       NUMERIC,
  total_apuracoes BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    date_trunc('week', a.data_apuracao)::DATE AS semana,
    SUM(i.peso_inicial) AS peso_inicial,
    SUM(i.perda_kg) AS perda_kg,
    CASE WHEN SUM(i.peso_inicial) > 0
      THEN ROUND((SUM(i.perda_kg) / SUM(i.peso_inicial)) * 100, 2)
      ELSE 0 END AS perda_pct,
    COUNT(DISTINCT a.id) AS total_apuracoes
  FROM itens_apuracao i
  JOIN apuracoes a ON a.id = i.apuracao_id
  WHERE
    (p_data_ini IS NULL OR a.data_apuracao >= p_data_ini)
    AND (p_data_fim IS NULL OR a.data_apuracao <= p_data_fim)
    AND (p_loja_ids  IS NULL OR array_length(p_loja_ids, 1) IS NULL OR a.loja_id = ANY(p_loja_ids))
    AND (p_corte_ids IS NULL OR array_length(p_corte_ids, 1) IS NULL OR i.corte_id = ANY(p_corte_ids))
    AND i.peso_inicial > 0
    -- ENFORCEMENT DE SEGURANÇA:
    AND (
      NOT public.has_role(auth.uid(), 'loja') 
      OR a.loja_id = public.get_user_loja_id(auth.uid())
    )
  GROUP BY semana
  ORDER BY semana;
$$;
GRANT EXECUTE ON FUNCTION public.get_evolucao_perda TO authenticated;


-- 5. get_kpis_dashboard
CREATE OR REPLACE FUNCTION public.get_kpis_dashboard(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_ids  UUID[] DEFAULT NULL,
  p_corte_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  total_apuracoes  BIGINT,
  lojas_count      BIGINT,
  total_pi         NUMERIC,
  total_pf         NUMERIC,
  total_perda_kg   NUMERIC,
  media_perda_pct  NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(DISTINCT a.id) AS total_apuracoes,
    COUNT(DISTINCT a.loja_id) AS lojas_count,
    SUM(i.peso_inicial) AS total_pi,
    SUM(i.peso_final) AS total_pf,
    SUM(i.perda_kg) AS total_perda_kg,
    CASE WHEN SUM(i.peso_inicial) > 0
      THEN ROUND((SUM(i.perda_kg) / SUM(i.peso_inicial)) * 100, 2)
      ELSE 0 END AS media_perda_pct
  FROM itens_apuracao i
  JOIN apuracoes a ON a.id = i.apuracao_id
  WHERE
    (p_data_ini IS NULL OR a.data_apuracao >= p_data_ini)
    AND (p_data_fim IS NULL OR a.data_apuracao <= p_data_fim)
    AND (p_loja_ids  IS NULL OR array_length(p_loja_ids, 1) IS NULL OR a.loja_id = ANY(p_loja_ids))
    AND (p_corte_ids IS NULL OR array_length(p_corte_ids, 1) IS NULL OR i.corte_id = ANY(p_corte_ids))
    AND i.peso_inicial > 0
    -- ENFORCEMENT DE SEGURANÇA:
    AND (
      NOT public.has_role(auth.uid(), 'loja') 
      OR a.loja_id = public.get_user_loja_id(auth.uid())
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_kpis_dashboard TO authenticated;
