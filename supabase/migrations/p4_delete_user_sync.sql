-- Sincronização de Exclusão: public.profiles -> auth.users
-- Quando o Admin exclui o perfil pelo sistema, essa trigger destrói a identidade de acesso.

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
RETURNS trigger AS $$
BEGIN
  -- Remove fisicamente o usuário do sistema de autenticação
  DELETE FROM auth.users WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a trigger se já existir para evitar duplicidade
DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;

-- Cria a trigger para rodar logo APÓS o perfil ser deletado na tabela pública
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_deleted_user();
