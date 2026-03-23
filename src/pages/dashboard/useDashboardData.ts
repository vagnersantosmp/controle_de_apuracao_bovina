import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboardData, type DashboardFilters, type FilterPeriod } from '@/services/apuracaoService';
import { AppUser } from '@/contexts/AuthContext';
import type { ProcessedData } from '@/lib/calculations';

// Re-export for consumers that import from this file
export type { DashboardFilters, FilterPeriod, ProcessedData };

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useDashboardData(user: AppUser | null | undefined) {
  const [filters, setFilters] = useState<DashboardFilters>({
    classe: 'todas',
    lojas: [],
    cortes: [],
    period: 'current_month',
    dateRange: { from: undefined, to: undefined }
  });

  // Guard: don't fetch if custom period is incomplete
  const isCustomIncomplete = filters.period === 'custom' && (!filters.dateRange.from || !filters.dateRange.to);

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['dashboard-rpc', user?.id, filters],
    queryFn: () => fetchDashboardData(user!, filters),
    enabled: !!user && !isCustomIncomplete,
  });

  return { data: (data ?? null) as ProcessedData | null, loading, filters, setFilters, refetch };
}
