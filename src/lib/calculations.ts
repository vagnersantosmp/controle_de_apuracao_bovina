import { startOfWeek } from 'date-fns';
import type { ApuracaoRow, DashboardFilters } from '@/services/apuracaoService';

// ─── Types ─────────────────────────────────────────────────────────────
export interface ProcessedApuracao extends ApuracaoRow {
  validItems: ApuracaoRow['itens_apuracao'];
  apPI: number;
  apPF: number;
  apPerda: number;
  apPerdaPct: number;
}

export interface ProcessedData {
  apuracoes: ApuracaoRow[];
  lojasCount: number;
  totalPI: number;
  totalPF: number;
  totalPerdaKg: number;
  mediaPerdaPercentual: number;
  lojaMaiorPerda: { nome: string; perda: number } | null;
  rankingLojas: { nome: string; perda: number }[];
  perdaPorClasse: { name: string; value: number; perdaKg: number }[];
  top10Cortes: { name: string; perda: number; perdaKg: number }[];
  evolucaoPerda: { mes: string; perda: number; apuracoes: number }[];
}

// ─── Item-level helpers ─────────────────────────────────────────────────

/**
 * Calcula a perda em kg de um item de apuração.
 */
export function calcPerdaKg(pesoInicial: number, pesoFinal: number): number {
  return +(pesoInicial - pesoFinal).toFixed(3);
}

/**
 * Calcula a perda percentual relativa ao peso inicial.
 * Retorna 0 quando pesoInicial = 0 para evitar divisão por zero.
 */
export function calcPerdaPercentual(pesoInicial: number, pesoFinal: number): number {
  if (pesoInicial <= 0) return 0;
  return +((calcPerdaKg(pesoInicial, pesoFinal) / pesoInicial) * 100).toFixed(2);
}

// ─── Aggregate helper ───────────────────────────────────────────────────

/**
 * Calcula os totalizadores de uma lista de itens.
 */
export function calcTotais(itens: { pesoInicial: number; pesoFinal: number }[]) {
  const pi = +itens.reduce((s, i) => s + i.pesoInicial, 0).toFixed(3);
  const pf = +itens.reduce((s, i) => s + i.pesoFinal, 0).toFixed(3);
  const pk = calcPerdaKg(pi, pf);
  const mp = pi > 0 ? +((pk / pi) * 100).toFixed(2) : 0;
  return { pi, pf, pk, mp };
}

// ─── Main processing function ───────────────────────────────────────────

/**
 * Função pura que processa as apurações brutas do Supabase e produz os dados
 * necessários para o Dashboard (KPIs, gráficos, ranking, etc.).
 * Não tem dependências do React; pode ser importada e testada diretamente.
 */
export function processApuracoes(rawApuracoes: ApuracaoRow[], filters: DashboardFilters): ProcessedData {
  let totalPI = 0;
  let totalPF = 0;
  let totalPerdaKg = 0;

  const filteredApuracoes = rawApuracoes.map(ap => {
    let validItems = ap.itens_apuracao || [];
    if (filters.cortes.length > 0) {
      validItems = validItems.filter(i => filters.cortes.includes(i.corte_id));
    }

    const apPI = validItems.reduce((acc, item) => acc + Number(item.peso_inicial || 0), 0);
    const apPF = validItems.reduce((acc, item) => acc + Number(item.peso_final || 0), 0);
    const apPerda = apPI - apPF;
    const apPerdaPct = apPI > 0 ? (apPerda / apPI) * 100 : 0;

    totalPI += apPI;
    totalPF += apPF;
    totalPerdaKg += apPerda;

    return { ...ap, validItems, apPI, apPF, apPerda, apPerdaPct };
  }).filter(ap => ap.validItems.length > 0);

  const mediaPerdaPercentual = totalPI > 0 ? (totalPerdaKg / totalPI) * 100 : 0;

  // Ranking por Loja
  const lojaMap = new Map<string, { nome: string; pi: number; perda: number }>();
  filteredApuracoes.forEach(ap => {
    const cod = ap.lojas?.codigo || 'Unknown';
    if (!lojaMap.has(cod)) lojaMap.set(cod, { nome: cod, pi: 0, perda: 0 });
    const entry = lojaMap.get(cod)!;
    entry.pi += ap.apPI;
    entry.perda += ap.apPerda;
  });
  const rankingLojas = Array.from(lojaMap.values()).map(l => ({
    nome: l.nome,
    perda: l.pi > 0 ? (l.perda / l.pi) * 100 : 0
  })).sort((a, b) => b.perda - a.perda);

  const lojaMaiorPerda = rankingLojas.length > 0 ? rankingLojas[0] : null;

  // Perda por Classe
  const classeMap = new Map<string, { pi: number; perda: number }>();
  filteredApuracoes.forEach(ap => {
    const t = ap.tipo_apuracao;
    if (!classeMap.has(t)) classeMap.set(t, { pi: 0, perda: 0 });
    const entry = classeMap.get(t)!;
    entry.pi += ap.apPI;
    entry.perda += ap.apPerda;
  });
  const perdaPorClasse = Array.from(classeMap.entries()).map(([k, v]) => ({
    name: k === 'boi_no_osso' ? 'Boi no Osso' : k === 'nota_10' ? 'Açougue Nota 10' : 'Carne Embalada',
    value: v.pi > 0 ? (v.perda / v.pi) * 100 : 0,
    perdaKg: v.perda
  }));

  // Top 10 Cortes
  const corteMap = new Map<string, { pi: number; perda: number }>();
  filteredApuracoes.forEach(ap => {
    ap.validItems.forEach(i => {
      const cName = i.cortes?.descricao || 'Desconhecido';
      if (!corteMap.has(cName)) corteMap.set(cName, { pi: 0, perda: 0 });
      const entry = corteMap.get(cName)!;
      entry.pi += Number(i.peso_inicial || 0);
      entry.perda += Number(i.perda_kg || 0);
    });
  });
  const top10Cortes = Array.from(corteMap.entries()).map(([k, v]) => ({
    name: k,
    perda: v.pi > 0 ? (v.perda / v.pi) * 100 : 0,
    perdaKg: v.perda
  })).sort((a, b) => b.perda - a.perda).slice(0, 10);

  // Evolução semanal
  const weekMap = new Map<string, { pi: number; perda: number; count: number }>();
  filteredApuracoes.forEach(ap => {
    const d = new Date(ap.data_apuracao);
    const w = startOfWeek(d);
    const key = w.toISOString().split('T')[0];
    if (!weekMap.has(key)) weekMap.set(key, { pi: 0, perda: 0, count: 0 });
    const entry = weekMap.get(key)!;
    entry.pi += ap.apPI;
    entry.perda += ap.apPerda;
    entry.count += 1;
  });
  const evolucaoPerda = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
    const d = new Date(k);
    return {
      mes: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
      perda: v.pi > 0 ? (v.perda / v.pi) * 100 : 0,
      apuracoes: v.count
    };
  });

  const lojasSet = new Set(filteredApuracoes.map(ap => ap.loja_id));

  return {
    apuracoes: rawApuracoes,
    lojasCount: lojasSet.size,
    totalPI,
    totalPF,
    totalPerdaKg,
    mediaPerdaPercentual,
    lojaMaiorPerda,
    rankingLojas,
    perdaPorClasse,
    top10Cortes,
    evolucaoPerda
  };
}
