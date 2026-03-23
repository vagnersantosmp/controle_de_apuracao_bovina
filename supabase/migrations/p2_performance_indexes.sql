-- ============================================================
-- P2.1: Performance
-- Criando índices compostos e FKs para otimizar os RPCs do dashboard
-- ============================================================

-- Índice na tabela itens_apuracao referenciando a FK principal
CREATE INDEX IF NOT EXISTS idx_itens_apuracao_apuracao_id ON public.itens_apuracao (apuracao_id);

-- Índice composto na tabela apuracoes combinando data (que é filtrada via RANGE) e loja
CREATE INDEX IF NOT EXISTS idx_apuracoes_data_loja ON public.apuracoes (data_apuracao, loja_id);

-- (Opcional, porém bom) Índice simples em tipo_apuracao pois também costuma ser filtrado
CREATE INDEX IF NOT EXISTS idx_apuracoes_tipo ON public.apuracoes (tipo_apuracao);
