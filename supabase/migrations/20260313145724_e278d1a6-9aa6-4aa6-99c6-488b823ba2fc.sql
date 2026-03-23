
-- Enum para perfis de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'loja', 'gestor', 'prevencao');

-- Enum para status de apuração
CREATE TYPE public.status_apuracao AS ENUM ('rascunho', 'finalizada', 'revisada');

-- Enum para categoria de corte
CREATE TYPE public.categoria_corte AS ENUM ('dianteiro', 'traseiro', 'subproduto');

-- Enum para tipo de apuração
CREATE TYPE public.tipo_apuracao AS ENUM ('dianteiro', 'traseiro');

-- =====================
-- Tabela de Lojas
-- =====================
CREATE TABLE public.lojas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;

-- =====================
-- Tabela de Perfis (profiles)
-- =====================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  loja_id UUID REFERENCES public.lojas(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- Tabela de Roles (separada, conforme boas práticas)
-- =====================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================
-- Função para verificar role (security definer, evita recursão)
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_loja_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =====================
-- Catálogo de Cortes
-- =====================
CREATE TABLE public.cortes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  categoria categoria_corte NOT NULL,
  exige_peso_inicial BOOLEAN NOT NULL DEFAULT true,
  exige_peso_final BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cortes ENABLE ROW LEVEL SECURITY;

-- =====================
-- Apurações (cabeçalho)
-- =====================
CREATE TABLE public.apuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  data_apuracao DATE NOT NULL,
  tipo_apuracao tipo_apuracao NOT NULL,
  peso_carcaca NUMERIC(10,3) NOT NULL DEFAULT 0,
  sif TEXT,
  observacoes TEXT,
  responsavel TEXT NOT NULL,
  status status_apuracao NOT NULL DEFAULT 'rascunho',
  total_peso_inicial NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_peso_final NUMERIC(10,3) NOT NULL DEFAULT 0,
  total_perda_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  media_perda_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.apuracoes ENABLE ROW LEVEL SECURITY;

-- =====================
-- Itens da Apuração
-- =====================
CREATE TABLE public.itens_apuracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apuracao_id UUID NOT NULL REFERENCES public.apuracoes(id) ON DELETE CASCADE,
  corte_id UUID NOT NULL REFERENCES public.cortes(id),
  corte_codigo TEXT NOT NULL,
  corte_descricao TEXT NOT NULL,
  peso_inicial NUMERIC(10,3) NOT NULL DEFAULT 0,
  peso_final NUMERIC(10,3) NOT NULL DEFAULT 0,
  perda_kg NUMERIC(10,3) NOT NULL DEFAULT 0,
  perda_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.itens_apuracao ENABLE ROW LEVEL SECURITY;

-- =====================
-- Trigger para updated_at
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lojas_updated_at BEFORE UPDATE ON public.lojas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cortes_updated_at BEFORE UPDATE ON public.cortes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_apuracoes_updated_at BEFORE UPDATE ON public.apuracoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- Trigger para criar profile automaticamente no signup
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- RLS POLICIES
-- =====================

-- LOJAS
CREATE POLICY "Authenticated can view lojas" ON public.lojas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert lojas" ON public.lojas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update lojas" ON public.lojas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete lojas" ON public.lojas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "Admin can delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can manage roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CORTES
CREATE POLICY "Authenticated can view cortes" ON public.cortes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert cortes" ON public.cortes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update cortes" ON public.cortes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete cortes" ON public.cortes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- APURACOES
CREATE POLICY "View apuracoes" ON public.apuracoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'prevencao')
    OR (public.has_role(auth.uid(), 'loja') AND loja_id = public.get_user_loja_id(auth.uid()))
  );
CREATE POLICY "Insert apuracoes" ON public.apuracoes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'loja') AND loja_id = public.get_user_loja_id(auth.uid()))
    )
  );
CREATE POLICY "Update apuracoes" ON public.apuracoes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'loja') AND loja_id = public.get_user_loja_id(auth.uid()) AND auth.uid() = user_id)
  );
CREATE POLICY "Admin delete apuracoes" ON public.apuracoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ITENS_APURACAO
CREATE POLICY "View itens_apuracao" ON public.itens_apuracao FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apuracoes a WHERE a.id = apuracao_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'gestor')
        OR public.has_role(auth.uid(), 'prevencao')
        OR (public.has_role(auth.uid(), 'loja') AND a.loja_id = public.get_user_loja_id(auth.uid()))
      )
    )
  );
CREATE POLICY "Insert itens_apuracao" ON public.itens_apuracao FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.apuracoes a WHERE a.id = apuracao_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Update itens_apuracao" ON public.itens_apuracao FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.apuracoes a WHERE a.id = apuracao_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin delete itens_apuracao" ON public.itens_apuracao FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- Inserir catálogo de cortes padrão
-- =====================
INSERT INTO public.cortes (codigo, descricao, categoria, exige_peso_inicial, exige_peso_final, ordem) VALUES
  ('1066', 'C.BOV.ACEM R. P/KG', 'dianteiro', true, true, 1),
  ('1084', 'C.BOV.MUSCULO DIANT. RESF.P/KG', 'dianteiro', true, true, 2),
  ('1073', 'C.BOV.PA RESF. P/KG', 'dianteiro', true, true, 3),
  ('1080', 'C.BOV.PEITO RESF.P/KG', 'dianteiro', true, true, 4),
  ('1395', 'C.BOV.MOIDA P/KG', 'subproduto', false, true, 5),
  ('1481', 'OSSO KG', 'subproduto', true, false, 6),
  ('780', 'C.BOV.ALCATRA C/MAMINHA RESF. P/KG', 'traseiro', true, true, 7),
  ('842', 'C.BOV.CAPA DE FILE RESF.P/KG', 'traseiro', true, true, 8),
  ('847', 'C.BOV.CHA DENTRO RESF. P/KG', 'traseiro', true, true, 9),
  ('863', 'C.BOV.CONTRA FILE RESF.P/KG', 'traseiro', true, true, 10),
  ('896', 'C.BOV.FILE MIGNON RESF.P/KG', 'traseiro', true, true, 11),
  ('906', 'C.BOV.LAGARTO PLANO RESF P/KG', 'traseiro', true, true, 12),
  ('908', 'C.BOV.LAGARTO RED. RESF.P/KG', 'traseiro', true, true, 13),
  ('911', 'C.BOV.MUSCULO TRAS RESF.P/KG', 'traseiro', true, true, 14),
  ('925', 'C.BOV.PATINHO RESF.P/KG', 'traseiro', true, true, 15),
  ('930', 'C.BOV.PICANHA RESF.P/KG', 'traseiro', true, true, 16);
