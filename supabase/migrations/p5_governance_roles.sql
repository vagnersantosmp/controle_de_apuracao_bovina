-- ============================================================
-- P5: Governança de Dados — Ajuste de Permissões por Perfil
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── 1. APURACOES: Gestor pode DELETAR ────────────────────────
DROP POLICY IF EXISTS "Admin delete apuracoes" ON public.apuracoes;

CREATE POLICY "Admin and Gestor delete apuracoes" ON public.apuracoes
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor')
);

-- ── 2. APURACOES: Prevenção pode ATUALIZAR (não deletar) ─────
DROP POLICY IF EXISTS "Update apuracoes" ON public.apuracoes;

CREATE POLICY "Update apuracoes" ON public.apuracoes
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'prevencao')
  OR (public.has_role(auth.uid(), 'loja') AND loja_id = public.get_user_loja_id(auth.uid()) AND auth.uid() = user_id)
);

-- ── 3. ITENS_APURACAO: Prevenção pode ATUALIZAR itens ────────
DROP POLICY IF EXISTS "Update itens_apuracao" ON public.itens_apuracao;

CREATE POLICY "Update itens_apuracao" ON public.itens_apuracao
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apuracoes a WHERE a.id = apuracao_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'gestor')
      OR public.has_role(auth.uid(), 'prevencao')
      OR (public.has_role(auth.uid(), 'loja') AND a.user_id = auth.uid())
    )
  )
);

-- ── 4. ITENS_APURACAO: Prevenção pode DELETAR itens da apuração ─
DROP POLICY IF EXISTS "Admin delete itens_apuracao" ON public.itens_apuracao;

CREATE POLICY "Admin delete itens_apuracao" ON public.itens_apuracao
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

-- ── 5. CHAMADOS: Prevenção pode RESPONDER (inserir mensagens) ─
-- Verificar como a tabela chamados está estruturada para respostas
-- (Se existir tabela chamado_mensagens separada, incluir abaixo)
-- Por ora, garantimos que Prevenção pode UPDATE em chamados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='chamados') THEN
    EXECUTE '
      DROP POLICY IF EXISTS "Responder chamados" ON public.chamados;
      CREATE POLICY "Responder chamados" ON public.chamados
      FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), ''admin'')
        OR public.has_role(auth.uid(), ''gestor'')
        OR public.has_role(auth.uid(), ''prevencao'')
      )
    ';
  END IF;
END $$;
