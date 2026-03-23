import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────
export type AppRole = 'admin' | 'loja' | 'gestor' | 'prevencao';

export interface UserRow {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  loja_id: string | null;
  ativo: boolean;
  role: AppRole;
  loja_nome: string;
}

// ─── Queries ──────────────────────────────────────────────────────────
export async function fetchUsers() {
  const [profilesRes, rolesRes, lojasRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('user_roles').select('*'),
    supabase.from('lojas').select('id, nome').eq('ativa', true),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const rolesMap = new Map<string, AppRole>();
  (rolesRes.data ?? []).forEach((r: { user_id: string; role: AppRole }) => rolesMap.set(r.user_id, r.role));

  const lojasMap = new Map<string, string>();
  (lojasRes.data ?? []).forEach((l: { id: string; nome: string }) => lojasMap.set(l.id, l.nome));

  const users: UserRow[] = (profilesRes.data ?? []).map((p: { id: string; user_id: string; nome: string; email: string; loja_id: string | null; ativo: boolean }) => ({
    id: p.id,
    user_id: p.user_id,
    nome: p.nome,
    email: p.email,
    loja_id: p.loja_id,
    ativo: p.ativo,
    role: rolesMap.get(p.user_id) ?? 'loja',
    loja_nome: p.loja_id ? lojasMap.get(p.loja_id) ?? '—' : '—',
  }));

  return { users, lojas: lojasRes.data ?? [] };
}

// ─── Mutations ────────────────────────────────────────────────────────
export async function toggleUserAtivo(profileId: string, ativo: boolean) {
  const { error } = await supabase.from('profiles').update({ ativo }).eq('id', profileId);
  if (error) throw error;
}

export async function deleteUser(userId: string) {
  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function updateUserProfile(userId: string, nome: string, lojaId: string | null) {
  const { error } = await supabase.from('profiles').update({ nome, loja_id: lojaId }).eq('user_id', userId);
  if (error) throw error;
}

export async function upsertUserRole(userId: string, role: AppRole) {
  const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role });
  if (error) throw error;
}

export async function invokeCreateUser(body: { nome: string; email: string; password: string; perfil: AppRole; loja_id: string | null }) {
  const { data, error } = await supabase.functions.invoke('create-user', { body });
  if (error || data?.error) {
    const msg = data?.error || error?.message || 'Erro ao criar usuário';
    throw new Error(msg);
  }
  return data;
}

export async function invokeUpdateUser(body: { user_id: string; email?: string; password?: string }) {
  const { error } = await supabase.functions.invoke('update-user', { body });
  if (error) throw error;
}
