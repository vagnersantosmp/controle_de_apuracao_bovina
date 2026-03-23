import { describe, it, expect, vi } from 'vitest';
import { fetchDashboardData } from '@/services/apuracaoService';
import type { DashboardFilters } from '@/services/apuracaoService';
import type { AppUser } from '@/contexts/AuthContext';

// Mock the whole Supabase client module
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      rpc: vi.fn((rpcName) => {
        // Return dummy data based on the RPC name to verify mapping
        switch(rpcName) {
          case 'get_kpis_dashboard':
            return Promise.resolve({ data: [{ total_apuracoes: 10, lojas_count: 5, total_pi: 1000, total_pf: 900, total_perda_kg: 100, media_perda_pct: 10 }], error: null });
          case 'get_ranking_lojas':
            return Promise.resolve({ data: [{ loja_codigo: '01', loja_nome: 'Loja Teste', peso_inicial: 500, perda_kg: 50, perda_pct: 10 }], error: null });
          case 'get_top_cortes':
            return Promise.resolve({ data: [{ corte_descricao: 'Picanha', peso_inicial: 100, perda_kg: 20, perda_pct: 20 }], error: null });
          case 'get_perda_por_classe':
            return Promise.resolve({ data: [{ tipo_apuracao: 'nota_10', peso_inicial: 300, perda_kg: 15, perda_pct: 5 }], error: null });
          case 'get_evolucao_perda':
            return Promise.resolve({ data: [{ semana: '2026-03-01T00:00:00Z', peso_inicial: 1000, perda_kg: 100, perda_pct: 10, total_apuracoes: 10 }], error: null });
          default:
            return Promise.resolve({ data: [], error: null });
        }
      })
    }
  };
});

describe('apuracaoService integration tests (mocked)', () => {
  it('fetchDashboardData successfully maps snake_case RPC responses to camelCase', async () => {
    const defaultFilters: DashboardFilters = { classe: 'todas', lojas: [], cortes: [], period: 'current_month', dateRange: { from: undefined, to: undefined } };
    const mockUser: AppUser = { id: 'u1', nome: 'Test', email: 't@t.com', perfil: 'admin', lojaId: null, ativo: true };
    
    const result = await fetchDashboardData(mockUser, defaultFilters);
    
    // Check KPIs
    expect(result.lojasCount).toBe(5);
    expect(result.totalPI).toBe(1000);
    expect(result.totalPF).toBe(900);
    expect(result.totalPerdaKg).toBe(100);
    expect(result.mediaPerdaPercentual).toBe(10);
    
    // Check apuracoes array length (needs to be equal to total_apuracoes to avoid crash)
    expect(result.apuracoes).toHaveLength(10);
    
    // Check Ranking
    expect(result.rankingLojas).toHaveLength(1);
    expect(result.rankingLojas[0].nome).toBe('Loja Teste');
    expect(result.rankingLojas[0].perda).toBe(10);
    expect(result.lojaMaiorPerda?.nome).toBe('Loja Teste');

    // Check Cortes
    expect(result.top10Cortes).toHaveLength(1);
    expect(result.top10Cortes[0].name).toBe('Picanha');
    expect(result.top10Cortes[0].perda).toBe(20);

    // Check Classe (Label mapping test)
    expect(result.perdaPorClasse).toHaveLength(1);
    expect(result.perdaPorClasse[0].name).toBe('Açougue Nota 10'); // 'nota_10' mapped
    
    // Check Evolucao
    expect(result.evolucaoPerda).toHaveLength(1);
    expect(result.evolucaoPerda[0].mes).toBe('01/03'); // UTC/Local specific, but mapped!
    expect(result.evolucaoPerda[0].perda).toBe(10);
  });
});
