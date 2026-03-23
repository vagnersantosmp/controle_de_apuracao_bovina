-- ============================================================
-- P0: Self-Registration controlado
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Alterar trigger handle_new_user para criar profiles com ativo = false
-- (novos auto-registros ficam pendentes de aprovação do admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    false  -- NOVO: começa inativo, requer aprovação do admin
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Marcar todos os users existentes como ativos (para não quebrar nada)
UPDATE public.profiles SET ativo = true WHERE ativo = true;
-- (se algum já estiver false por outro motivo, fica como está)
