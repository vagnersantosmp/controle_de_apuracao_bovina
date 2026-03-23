import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────
export type MetodologiaCorte = 'boi_no_osso' | 'nota_10' | 'embalada';

export interface CorteRow {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  exige_peso_inicial: boolean;
  exige_peso_final: boolean;
  ordem: number;
  ativo: boolean;
  metodologia: MetodologiaCorte;
}

export interface CorteCreateInput {
  codigo: string;
  descricao: string;
  categoria: string;
  exige_peso_inicial: boolean;
  exige_peso_final: boolean;
  ordem: number;
  metodologia: MetodologiaCorte;
}

// ─── Queries ──────────────────────────────────────────────────────────
export async function fetchCortes() {
  const { data, error } = await supabase
    .from('cortes')
    .select('*')
    .order('ordem');
  if (error) throw error;
  return (data ?? []) as CorteRow[];
}

export async function fetchCortesAtivos() {
  const { data, error } = await supabase
    .from('cortes')
    .select('id, descricao, codigo')
    .eq('ativo', true)
    .order('descricao');
  if (error) throw error;
  return data ?? [];
}

// ─── Mutations ────────────────────────────────────────────────────────
export async function createCorte(input: CorteCreateInput) {
  const { error } = await supabase.from('cortes').insert({ ...input, ativo: true });
  if (error) throw error;
}

export async function updateCorteDescricao(id: string, descricao: string) {
  const { error } = await supabase.from('cortes').update({ descricao }).eq('id', id);
  if (error) throw error;
}

export async function toggleCorteAtivo(id: string, ativo: boolean) {
  const { error } = await supabase.from('cortes').update({ ativo }).eq('id', id);
  if (error) throw error;
}

export async function deleteCorte(id: string) {
  const { error } = await supabase.from('cortes').delete().eq('id', id);
  if (error) throw error;
}
