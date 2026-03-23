import { describe, it, expect } from 'vitest';
import {
  calcPerdaKg,
  calcPerdaPercentual,
  calcTotais,
  processApuracoes,
} from '@/lib/calculations';
import type { ApuracaoRow } from '@/services/apuracaoService';
import type { DashboardFilters } from '@/services/apuracaoService';

// ─── Helpers ─────────────────────────────────────────────────────────────

const defaultFilters: DashboardFilters = {
  classe: 'todas',
  lojas: [],
  cortes: [],
  period: 'current_month',
  dateRange: { from: undefined, to: undefined },
};

function makeItem(
  corte_id: string,
  descricao: string,
  pesoInicial: number,
  pesoFinal: number
): ApuracaoRow['itens_apuracao'][0] {
  const perdaKg = +(pesoInicial - pesoFinal).toFixed(3);
  return {
    corte_id,
    peso_inicial: pesoInicial,
    peso_final: pesoFinal,
    perda_kg: perdaKg,
    perda_percentual: pesoInicial > 0 ? +((perdaKg / pesoInicial) * 100).toFixed(2) : 0,
    cortes: { descricao },
  };
}

function makeApuracao(
  overrides: Partial<ApuracaoRow> & { itens_apuracao: ApuracaoRow['itens_apuracao'] }
): ApuracaoRow {
  return {
    id: 'ap-1',
    loja_id: 'loja-1',
    user_id: 'user-1',
    data_apuracao: '2026-03-01T12:00:00Z',
    tipo_apuracao: 'boi_no_osso',
    peso_carcaca: 100,
    sif: null,
    observacoes: null,
    responsavel: 'Teste',
    status: 'finalizada',
    total_peso_inicial: 0,
    total_peso_final: 0,
    total_perda_kg: 0,
    media_perda_percentual: 0,
    lojas: { nome: 'Loja A', codigo: 'L01' },
    ...overrides,
  };
}

// ─── Testes de cálculo de item ────────────────────────────────────────────

describe('calcPerdaKg', () => {
  it('calcula perda kg corretamente', () => {
    expect(calcPerdaKg(100, 85)).toBeCloseTo(15, 2);
  });

  it('retorna 0 quando pesos são iguais', () => {
    expect(calcPerdaKg(50, 50)).toBe(0);
  });

  it('retorna negativo quando peso final maior que inicial', () => {
    expect(calcPerdaKg(80, 85)).toBeCloseTo(-5, 2);
  });
});

describe('calcPerdaPercentual', () => {
  it('calcula percentual corretamente', () => {
    expect(calcPerdaPercentual(100, 90)).toBeCloseTo(10, 1);
  });

  it('retorna 0 quando peso inicial é 0 (evita divisão por zero)', () => {
    expect(calcPerdaPercentual(0, 0)).toBe(0);
  });

  it('retorna 0 quando pesos são iguais', () => {
    expect(calcPerdaPercentual(50, 50)).toBe(0);
  });

  it('retorna percentual correto para perda de 5%', () => {
    expect(calcPerdaPercentual(200, 190)).toBeCloseTo(5, 1);
  });
});

// ─── Testes de totalizadores ──────────────────────────────────────────────

describe('calcTotais', () => {
  it('totaliza corretamente múltiplos itens', () => {
    const itens = [
      { pesoInicial: 100, pesoFinal: 90 },
      { pesoInicial: 50, pesoFinal: 45 },
    ];
    const { pi, pf, pk, mp } = calcTotais(itens);
    expect(pi).toBeCloseTo(150, 2);
    expect(pf).toBeCloseTo(135, 2);
    expect(pk).toBeCloseTo(15, 2);
    expect(mp).toBeCloseTo(10, 1);
  });

  it('retorna zeros para lista vazia', () => {
    const { pi, pf, pk, mp } = calcTotais([]);
    expect(pi).toBe(0);
    expect(pf).toBe(0);
    expect(pk).toBe(0);
    expect(mp).toBe(0);
  });

  it('perda percentual média é ponderada pelo peso total (não média aritmética)', () => {
    // Item 1: 100kg → 90kg = 10% de perda
    // Item 2: 100kg → 50kg = 50% de perda
    // Média ponderada: (10 + 50) / 200 = 30%
    const itens = [
      { pesoInicial: 100, pesoFinal: 90 },
      { pesoInicial: 100, pesoFinal: 50 },
    ];
    const { mp } = calcTotais(itens);
    expect(mp).toBeCloseTo(30, 1);
  });
});

// ─── Testes de processApuracoes ───────────────────────────────────────────

describe('processApuracoes', () => {
  it('retorna zeros para lista vazia', () => {
    const result = processApuracoes([], defaultFilters);
    expect(result.totalPI).toBe(0);
    expect(result.totalPF).toBe(0);
    expect(result.totalPerdaKg).toBe(0);
    expect(result.mediaPerdaPercentual).toBe(0);
    expect(result.lojaMaiorPerda).toBeNull();
    expect(result.rankingLojas).toHaveLength(0);
    expect(result.top10Cortes).toHaveLength(0);
  });

  it('calcula totais corretamente para uma apuração', () => {
    const ap = makeApuracao({
      itens_apuracao: [
        makeItem('c1', 'Alcatra', 100, 90),
        makeItem('c2', 'Contra Filé', 50, 45),
      ],
    });
    const result = processApuracoes([ap], defaultFilters);
    expect(result.totalPI).toBeCloseTo(150, 2);
    expect(result.totalPF).toBeCloseTo(135, 2);
    expect(result.totalPerdaKg).toBeCloseTo(15, 2);
    expect(result.mediaPerdaPercentual).toBeCloseTo(10, 1);
  });

  it('conta lojas únicas corretamente', () => {
    const ap1 = makeApuracao({ id: 'ap-1', loja_id: 'loja-1', itens_apuracao: [makeItem('c1', 'Alcatra', 100, 90)] });
    const ap2 = makeApuracao({ id: 'ap-2', loja_id: 'loja-2', lojas: { nome: 'Loja B', codigo: 'L02' }, itens_apuracao: [makeItem('c1', 'Alcatra', 80, 72)] });
    const ap3 = makeApuracao({ id: 'ap-3', loja_id: 'loja-1', itens_apuracao: [makeItem('c1', 'Alcatra', 60, 54)] }); // mesma loja
    const result = processApuracoes([ap1, ap2, ap3], defaultFilters);
    expect(result.lojasCount).toBe(2);
  });

  it('rankingLojas é ordenado pela maior perda percentual', () => {
    const ap1 = makeApuracao({
      id: 'ap-1', loja_id: 'loja-1',
      lojas: { nome: 'Loja A', codigo: 'L01' },
      itens_apuracao: [makeItem('c1', 'Alcatra', 100, 95)], // 5% perda
    });
    const ap2 = makeApuracao({
      id: 'ap-2', loja_id: 'loja-2',
      lojas: { nome: 'Loja B', codigo: 'L02' },
      itens_apuracao: [makeItem('c1', 'Alcatra', 100, 80)], // 20% perda
    });
    const result = processApuracoes([ap1, ap2], defaultFilters);
    expect(result.rankingLojas[0].nome).toBe('L02');
    expect(result.rankingLojas[1].nome).toBe('L01');
    expect(result.lojaMaiorPerda?.nome).toBe('L02');
  });

  it('top10Cortes retorna no máximo 10 itens', () => {
    // 12 cortes diferentes
    const itens = Array.from({ length: 12 }, (_, i) =>
      makeItem(`c${i}`, `Corte ${i}`, 100, 100 - (i + 1) * 2)
    );
    const ap = makeApuracao({ itens_apuracao: itens });
    const result = processApuracoes([ap], defaultFilters);
    expect(result.top10Cortes.length).toBeLessThanOrEqual(10);
  });

  it('top10Cortes é ordenado pela maior perda', () => {
    const itens = [
      makeItem('c1', 'Alcatra', 100, 95),      // 5%
      makeItem('c2', 'Picanha', 100, 70),       // 30%
      makeItem('c3', 'Contra Filé', 100, 88),   // 12%
    ];
    const ap = makeApuracao({ itens_apuracao: itens });
    const result = processApuracoes([ap], defaultFilters);
    expect(result.top10Cortes[0].name).toBe('Picanha');
    expect(result.top10Cortes[1].name).toBe('Contra Filé');
    expect(result.top10Cortes[2].name).toBe('Alcatra');
  });

  it('perdaPorClasse agrupa corretamente por tipo_apuracao', () => {
    const ap1 = makeApuracao({ id: 'ap-1', tipo_apuracao: 'boi_no_osso', itens_apuracao: [makeItem('c1', 'Alcatra', 100, 90)] });
    const ap2 = makeApuracao({ id: 'ap-2', tipo_apuracao: 'nota_10', itens_apuracao: [makeItem('c2', 'Picanha', 100, 80)] });
    const ap3 = makeApuracao({ id: 'ap-3', tipo_apuracao: 'boi_no_osso', itens_apuracao: [makeItem('c3', 'Coxão Mole', 100, 92)] });
    const result = processApuracoes([ap1, ap2, ap3], defaultFilters);
    const classes = result.perdaPorClasse.map(c => c.name);
    expect(classes).toContain('Boi no Osso');
    expect(classes).toContain('Açougue Nota 10');
    expect(classes).not.toContain('boi_no_osso'); // Deve ser o nome amigável
    expect(result.perdaPorClasse).toHaveLength(2);
  });

  it('filtragem por corte funciona corretamente', () => {
    const ap = makeApuracao({
      itens_apuracao: [
        makeItem('c1', 'Alcatra', 100, 90),
        makeItem('c2', 'Picanha', 100, 80),
      ],
    });
    // Filtra apenas o corte c1
    const result = processApuracoes([ap], { ...defaultFilters, cortes: ['c1'] });
    expect(result.totalPI).toBeCloseTo(100, 2);
    expect(result.top10Cortes[0].name).toBe('Alcatra');
    expect(result.top10Cortes).toHaveLength(1);
  });

  it('apuração sem itens é excluída do processamento', () => {
    const apSemItens = makeApuracao({ id: 'ap-vazia', itens_apuracao: [] });
    const apComItens = makeApuracao({ id: 'ap-dados', itens_apuracao: [makeItem('c1', 'Alcatra', 100, 90)] });
    const result = processApuracoes([apSemItens, apComItens], defaultFilters);
    expect(result.totalPI).toBeCloseTo(100, 2);
    expect(result.lojasCount).toBe(1);
  });
});

// ─── Testes dos Schemas Zod ───────────────────────────────────────────────

describe('novaApuracaoSchema', () => {
  it('rejeita quando loja_id está vazio', async () => {
    const { novaApuracaoSchema } = await import('@/lib/schemas');
    const result = novaApuracaoSchema.safeParse({
      loja_id: '',
      data_apuracao: '2026-03-01',
      tipo_apuracao: 'boi_no_osso',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Selecione a loja.');
    }
  });

  it('rejeita metodologia inválida', async () => {
    const { novaApuracaoSchema } = await import('@/lib/schemas');
    const result = novaApuracaoSchema.safeParse({
      loja_id: 'uuid-loja',
      data_apuracao: '2026-03-01',
      tipo_apuracao: 'metodologia_invalida',
    });
    expect(result.success).toBe(false);
  });

  it('aceita dados válidos', async () => {
    const { novaApuracaoSchema } = await import('@/lib/schemas');
    const result = novaApuracaoSchema.safeParse({
      loja_id: 'uuid-loja',
      data_apuracao: '2026-03-01',
      tipo_apuracao: 'nota_10',
      peso_carcaca: 250.5,
    });
    expect(result.success).toBe(true);
  });
});

describe('lojaSchema', () => {
  it('rejeita UF com tamanho diferente de 2', async () => {
    const { lojaSchema } = await import('@/lib/schemas');
    const result = lojaSchema.safeParse({
      codigo: '01',
      nome: 'Loja Teste',
      cidade: 'Curitiba',
      uf: 'PRR', // 3 letras
      metodologia: ['boi_no_osso'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const ufError = result.error.issues.find(i => i.path.includes('uf'));
      expect(ufError?.message).toBe('UF deve ter exatamente 2 letras.');
    }
  });

  it('rejeita metodologia vazia', async () => {
    const { lojaSchema } = await import('@/lib/schemas');
    const result = lojaSchema.safeParse({
      codigo: '01',
      nome: 'Loja Teste',
      cidade: 'Curitiba',
      uf: 'PR',
      metodologia: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const metError = result.error.issues.find(i => i.path.includes('metodologia'));
      expect(metError?.message).toBe('Selecione ao menos uma metodologia.');
    }
  });

  it('aceita dados válidos', async () => {
    const { lojaSchema } = await import('@/lib/schemas');
    const result = lojaSchema.safeParse({
      codigo: '01',
      nome: 'Loja Centro',
      cidade: 'Curitiba',
      uf: 'PR',
      metodologia: ['boi_no_osso', 'nota_10'],
    });
    expect(result.success).toBe(true);
  });
});
