import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────
export type Metodologia = 'boi_no_osso' | 'nota_10' | 'embalada';

export interface LojaRow {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
  metodologia: Metodologia[];
  ativa: boolean;
}

export interface LojaCreateInput {
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
  metodologia: Metodologia[];
}

// ─── Queries ──────────────────────────────────────────────────────────
export async function fetchLojas() {
  const { data, error } = await supabase
    .from('lojas')
    .select('*')
    .order('codigo');
  if (error) throw error;
  return (data ?? []) as LojaRow[];
}

export async function fetchLojasAtivas() {
  const { data, error } = await supabase
    .from('lojas')
    .select('id, codigo, nome')
    .eq('ativa', true)
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

// ─── Mutations ────────────────────────────────────────────────────────
export async function createLoja(input: LojaCreateInput) {
  const { error } = await supabase.from('lojas').insert({
    codigo: input.codigo,
    nome: input.nome,
    cidade: input.cidade,
    uf: input.uf.toUpperCase(),
    metodologia: input.metodologia,
  });
  if (error) throw error;
}

export async function updateLoja(id: string, input: LojaCreateInput) {
  const { error } = await supabase.from('lojas').update({
    codigo: input.codigo,
    nome: input.nome,
    cidade: input.cidade,
    uf: input.uf.toUpperCase(),
    metodologia: input.metodologia,
  }).eq('id', id);
  if (error) throw error;
}

export async function toggleLojaAtiva(id: string, ativa: boolean) {
  const { error } = await supabase.from('lojas').update({ ativa }).eq('id', id);
  if (error) throw error;
}

export async function deleteLoja(id: string) {
  const { error } = await supabase.from('lojas').delete().eq('id', id);
  if (error) throw error;
}
