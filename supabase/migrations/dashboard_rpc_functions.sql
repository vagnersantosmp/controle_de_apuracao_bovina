-- ============================================================
-- FUNÇÕES RPC PARA DASHBOARD — Gestão Açougue
-- Execute no Supabase: Database → SQL Editor → New Query
-- Cole todo o conteúdo e clique em Run (Ctrl+Enter)
-- ============================================================

-- 1. get_ranking_lojas — ranking de lojas por % de perda
CREATE OR REPLACE FUNCTION public.get_ranking_lojas(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_id   UUID  DEFAULT NULL,
  p_corte_id  UUID  DEFAULT NULL
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
    l.codigo AS loja_nome,
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
    AND (p_loja_id  IS NULL OR a.loja_id = p_loja_id)
    AND (p_corte_id IS NULL OR i.corte_id = p_corte_id)
    AND i.peso_inicial > 0
  GROUP BY l.id, l.codigo
  ORDER BY perda_pct DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_ranking_lojas TO authenticated;


-- 2. get_top_cortes — top 10 cortes com maior % de perda
CREATE OR REPLACE FUNCTION public.get_top_cortes(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_id   UUID  DEFAULT NULL,
  p_corte_id  UUID  DEFAULT NULL
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
    AND (p_loja_id  IS NULL OR a.loja_id = p_loja_id)
    AND (p_corte_id IS NULL OR i.corte_id = p_corte_id)
    AND i.peso_inicial > 0
  GROUP BY i.corte_descricao
  ORDER BY perda_pct DESC
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_cortes TO authenticated;


-- 3. get_perda_por_classe — perda agrupada por tipo (boi_no_osso, nota_10, embalada)
CREATE OR REPLACE FUNCTION public.get_perda_por_classe(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_id   UUID  DEFAULT NULL,
  p_corte_id  UUID  DEFAULT NULL
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
    AND (p_loja_id  IS NULL OR a.loja_id = p_loja_id)
    AND (p_corte_id IS NULL OR i.corte_id = p_corte_id)
    AND i.peso_inicial > 0
  GROUP BY a.tipo_apuracao;
$$;
GRANT EXECUTE ON FUNCTION public.get_perda_por_classe TO authenticated;


-- 4. get_evolucao_perda — evolução semanal da % de perda
CREATE OR REPLACE FUNCTION public.get_evolucao_perda(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_id   UUID  DEFAULT NULL,
  p_corte_id  UUID  DEFAULT NULL
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
    AND (p_loja_id  IS NULL OR a.loja_id = p_loja_id)
    AND (p_corte_id IS NULL OR i.corte_id = p_corte_id)
    AND i.peso_inicial > 0
  GROUP BY semana
  ORDER BY semana;
$$;
GRANT EXECUTE ON FUNCTION public.get_evolucao_perda TO authenticated;


-- 5. get_kpis_dashboard — KPIs consolidados em uma única chamada
CREATE OR REPLACE FUNCTION public.get_kpis_dashboard(
  p_data_ini  DATE  DEFAULT NULL,
  p_data_fim  DATE  DEFAULT NULL,
  p_loja_id   UUID  DEFAULT NULL,
  p_corte_id  UUID  DEFAULT NULL
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
    AND (p_loja_id  IS NULL OR a.loja_id = p_loja_id)
    AND (p_corte_id IS NULL OR i.corte_id = p_corte_id)
    AND i.peso_inicial > 0;
$$;
GRANT EXECUTE ON FUNCTION public.get_kpis_dashboard TO authenticated;
