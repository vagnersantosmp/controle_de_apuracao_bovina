import { supabase } from '@/integrations/supabase/client';
import type { AppUser } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, format } from 'date-fns';

// ─── Filter Types ────────────────────────────────────────────────────────
export type FilterPeriod = 'last_week' | 'current_month' | 'custom';

export interface DashboardFilters {
  classe: string;
  lojas: string[];
  cortes: string[];
  period: FilterPeriod;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

// ─── Types for raw fetching (HistoricoPage, DetalheApuracaoPage) ─────────
export interface ApuracaoItemRow {
  peso_inicial: number;
  peso_final: number;
  perda_kg: number;
  perda_percentual: number;
  corte_id: string;
  cortes: { descricao: string } | null;
}

export interface ApuracaoRow {
  id: string;
  loja_id: string;
  user_id: string;
  data_apuracao: string;
  tipo_apuracao: string;
  peso_carcaca: number;
  sif: string | null;
  observacoes: string | null;
  responsavel: string;
  status: string;
  total_peso_inicial: number;
  total_peso_final: number;
  total_perda_kg: number;
  media_perda_percentual: number;
  lojas: { nome: string; codigo: string } | null;
  itens_apuracao: ApuracaoItemRow[];
}

export interface ApuracaoCreateInput {
  loja_id: string;
  user_id: string;
  data_apuracao: string;
  tipo_apuracao: string;
  peso_carcaca: number;
  sif: string | null;
  observacoes: string | null;
  responsavel: string;
  status: string;
  total_peso_inicial: number;
  total_peso_final: number;
  total_perda_kg: number;
  media_perda_percentual: number;
}

export interface ItemApuracaoInput {
  apuracao_id: string;
  corte_id: string;
  corte_codigo: string;
  corte_descricao: string;
  peso_inicial: number;
  peso_final: number;
  perda_kg: number;
  perda_percentual: number;
}

// ─── Date Range Helper ───────────────────────────────────────────────────
function buildDateRange(filters: DashboardFilters): { start: string; end: string } | null {
  const now = new Date();
  if (filters.period === 'current_month') {
    return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
  }
  if (filters.period === 'last_week') {
    const lastWk = subWeeks(now, 1);
    return { start: startOfWeek(lastWk).toISOString(), end: endOfWeek(lastWk).toISOString() };
  }
  if (filters.period === 'custom' && filters.dateRange.from && filters.dateRange.to) {
    return { start: filters.dateRange.from.toISOString(), end: filters.dateRange.to.toISOString() };
  }
  return null;
}

// ─── RPC Params helper ───────────────────────────────────────────────────
function buildRpcParams(user: AppUser, filters: DashboardFilters) {
  const range = buildDateRange(filters);
  const lojaIds = user.perfil === 'loja' && user.lojaId
    ? [user.lojaId]
    : filters.lojas.length > 0 ? filters.lojas : null;
  const corteIds = filters.cortes.length > 0 ? filters.cortes : null;

  return {
    p_data_ini: range ? range.start.split('T')[0] : null,
    p_data_fim: range ? range.end.split('T')[0] : null,
    p_loja_ids: lojaIds,
    p_corte_ids: corteIds,
  };
}

// ─── Server-side dashboard query (uses RPCs) ─────────────────────────────

interface RpcKpiRow {
  total_apuracoes: number | null;
  lojas_count: number | null;
  total_pi: number | null;
  total_pf: number | null;
  total_perda_kg: number | null;
  media_perda_pct: number | null;
}

interface RpcRankingRow {
  loja_codigo: string | null;
  loja_nome: string | null;
  peso_inicial: number | null;
  perda_kg: number | null;
  perda_pct: number | null;
}

interface RpcCorteRow {
  corte_descricao: string | null;
  peso_inicial: number | null;
  perda_kg: number | null;
  perda_pct: number | null;
}

interface RpcClasseRow {
  tipo_apuracao: string | null;
  peso_inicial: number | null;
  perda_kg: number | null;
  perda_pct: number | null;
}

interface RpcEvolucaoRow {
  semana: string | null;
  peso_inicial: number | null;
  perda_kg: number | null;
  perda_pct: number | null;
  total_apuracoes: number | null;
}

export async function fetchDashboardData(user: AppUser, filters: DashboardFilters) {
  const params = buildRpcParams(user, filters);

  // Fetch all 5 RPCs in parallel
  const [kpisRes, rankingRes, cortesRes, classeRes, evolucaoRes] = await Promise.all([
    supabase.rpc('get_kpis_dashboard', params),
    supabase.rpc('get_ranking_lojas', params),
    supabase.rpc('get_top_cortes', params),
    supabase.rpc('get_perda_por_classe', params),
    supabase.rpc('get_evolucao_perda', params),
  ]);

  // Surface any errors
  for (const res of [kpisRes, rankingRes, cortesRes, classeRes, evolucaoRes]) {
    if (res.error) throw res.error;
  }

  const kpi = (kpisRes.data as RpcKpiRow[])?.[0] ?? {} as Partial<RpcKpiRow>;
  const rankingLojas = (rankingRes.data as RpcRankingRow[] ?? []).map((r) => ({
    nome: r.loja_nome ?? r.loja_codigo ?? 'Desconhecida',
    perda: Number(r.perda_pct ?? 0),
    perdaKg: Number(r.perda_kg ?? 0),
  }));

  const top10Cortes = (cortesRes.data as RpcCorteRow[] ?? []).map((r) => ({
    name: r.corte_descricao ?? 'Desconhecido',
    perda: Number(r.perda_pct ?? 0),
    perdaKg: Number(r.perda_kg ?? 0),
  }));

  const CLASSE_LABELS: Record<string, string> = {
    boi_no_osso: 'Boi no Osso',
    nota_10: 'Açougue Nota 10',
    embalada: 'Carne Embalada',
  };
  const perdaPorClasse = (classeRes.data as RpcClasseRow[] ?? []).map((r) => ({
    name: CLASSE_LABELS[r.tipo_apuracao || ''] ?? r.tipo_apuracao ?? 'Outro',
    value: Number(r.perda_pct ?? 0),
    perdaKg: Number(r.perda_kg ?? 0),
  }));

  const evolucaoPerda = (evolucaoRes.data as RpcEvolucaoRow[] ?? []).map((r) => {
    const d = r.semana ? new Date(r.semana) : new Date();
    // Use modulo fix to ensure accurate UTC display if needed, but local fallback
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return {
      mes: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      perda: Number(r.perda_pct ?? 0),
      apuracoes: Number(r.total_apuracoes ?? 0),
    };
  });

  const totalApuracoes = Number(kpi.total_apuracoes ?? 0);

  return {
    // Provide a dummy array of correct length so DashboardKPIs' apuracoes.length works
    apuracoes: Array.from({ length: totalApuracoes }) as unknown[],
    lojasCount: Number(kpi.lojas_count ?? 0),
    totalPI: Number(kpi.total_pi ?? 0),
    totalPF: Number(kpi.total_pf ?? 0),
    totalPerdaKg: Number(kpi.total_perda_kg ?? 0),
    mediaPerdaPercentual: Number(kpi.media_perda_pct ?? 0),
    lojaMaiorPerda: rankingLojas.length > 0 ? rankingLojas[0] : null,
    rankingLojas,
    perdaPorClasse,
    top10Cortes,
    evolucaoPerda,
  };
}


// ─── Legacy query (still used by PresentationsPage) ──────────────────────
export async function fetchApuracoes(user: AppUser, filters: DashboardFilters) {
  const range = buildDateRange(filters);

  let query = supabase
    .from('apuracoes')
    .select(`
      *,
      lojas(nome, codigo),
      itens_apuracao (
        peso_inicial,
        peso_final,
        perda_kg,
        perda_percentual,
        corte_id,
        cortes ( descricao )
      )
    `)
    .neq('status', 'rascunho')
    .order('data_apuracao', { ascending: false });

  if (range) {
    query = query.gte('data_apuracao', range.start).lte('data_apuracao', range.end);
  }
  if (filters.classe !== 'todas') {
    query = query.eq('tipo_apuracao', filters.classe);
  }
  if (user.perfil === 'loja' && user.lojaId) {
    query = query.eq('loja_id', user.lojaId);
  } else if (filters.lojas.length > 0) {
    query = query.in('loja_id', filters.lojas);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ApuracaoRow[];
}

export async function createApuracao(input: ApuracaoCreateInput) {
  const { data, error } = await supabase
    .from('apuracoes')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function createItensApuracao(itens: ItemApuracaoInput[]) {
  if (itens.length === 0) return;
  const { error } = await supabase.from('itens_apuracao').insert(itens);
  if (error) throw error;
}
