import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardFilters } from './useDashboardData';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface Props {
  filters: DashboardFilters;
  loading: boolean;
}

interface RawRow {
  peso_inicial: number | null;
  peso_final: number | null;
  perda_kg: number | null;
  perda_percentual: number | null;
  corte_descricao: string | null;
  apuracoes: {
    data_apuracao: string | null;
    tipo_apuracao: string | null;
    status: string | null;
    loja_id: string | null;
    lojas: { nome: string | null } | null;
  } | null;
}

async function fetchRecentRows(filters: DashboardFilters) {
  const now = new Date();
  let dateStart: string | null = null;
  let dateEnd: string | null = null;

  if (filters.period === 'current_month') {
    dateStart = startOfMonth(now).toISOString();
    dateEnd   = endOfMonth(now).toISOString();
  } else if (filters.period === 'last_week') {
    const lw = subWeeks(now, 1);
    dateStart = startOfWeek(lw).toISOString();
    dateEnd   = endOfWeek(lw).toISOString();
  } else if (filters.period === 'custom' && filters.dateRange.from && filters.dateRange.to) {
    dateStart = filters.dateRange.from.toISOString();
    dateEnd   = filters.dateRange.to.toISOString();
  }

  let q = supabase
    .from('itens_apuracao')
    .select(`
      peso_inicial, peso_final, perda_kg, perda_percentual,
      corte_descricao,
      apuracoes!inner ( data_apuracao, tipo_apuracao, status, loja_id,
        lojas ( nome )
      )
    `)
    .neq('apuracoes.status', 'rascunho')
    .order('apuracoes(data_apuracao)', { ascending: false })
    .limit(200);

  if (dateStart) q = q.gte('apuracoes.data_apuracao', dateStart.split('T')[0]);
  if (dateEnd)   q = q.lte('apuracoes.data_apuracao', dateEnd.split('T')[0]);
  if (filters.classe !== 'todas') q = q.eq('apuracoes.tipo_apuracao', filters.classe);
  if (filters.lojas.length > 0)  q = q.in('apuracoes.loja_id', filters.lojas);
  if (filters.cortes.length > 0) q = q.in('corte_id', filters.cortes);

  const { data, error } = await q;
  if (error) throw error;
  
  const rawRows = (data ?? []) as unknown as RawRow[];

  return rawRows.map((i) => ({
    loja:        i.apuracoes?.lojas?.nome || '—',
    classe:      i.apuracoes?.tipo_apuracao === 'boi_no_osso' ? 'Boi no Osso'
                 : i.apuracoes?.tipo_apuracao === 'nota_10'   ? 'Açougue Nota 10'
                 : 'Carne Embalada',
    corte:       i.corte_descricao || '—',
    peso_inicial: Number(i.peso_inicial || 0),
    peso_final:   Number(i.peso_final   || 0),
    perda_kg:     Number(i.perda_kg     || 0),
    perda_pct:    Number(i.perda_percentual || 0),
    data:         new Date(i.apuracoes?.data_apuracao ?? Date.now()),
  }));
}

export function DashboardTable({ filters, loading }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['dashboard-table', filters],
    queryFn: () => fetchRecentRows(filters),
    enabled: !loading,
  });

  const handleExport = () => {
    if (rows.length === 0) return;
    const headers = ['Loja', 'Classe', 'Corte', 'Peso Inicial (kg)', 'Peso Final (kg)', 'Perda (kg)', 'Perda (%)', 'Data'];
    const csv = [headers.join(';'), ...rows.map(r => [
      `"${r.loja}"`, `"${r.classe}"`, `"${r.corte}"`,
      r.peso_inicial.toString().replace('.', ','),
      r.peso_final.toString().replace('.', ','),
      r.perda_kg.toString().replace('.', ','),
      r.perda_pct.toString().replace('.', ','),
      format(r.data, 'dd/MM/yyyy'),
    ].join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Perdas_${format(new Date(), 'ddMMyyyy')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-card rounded-xl border p-0 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b flex items-center justify-between bg-muted/20">
        <div>
          <h3 className="text-base font-bold text-foreground">Apurações Recentes</h3>
          <p className="text-xs text-muted-foreground mt-1">Detalhamento por item apurado e cortado.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10 shadow-sm">
            <tr>
              <th className="text-left p-3 px-5 font-semibold text-muted-foreground whitespace-nowrap">Loja</th>
              <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">Classe</th>
              <th className="text-left p-3 font-semibold text-muted-foreground whitespace-nowrap">Corte</th>
              <th className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap">Peso Inicial</th>
              <th className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap">Peso Final</th>
              <th className="text-right p-3 px-5 font-semibold text-muted-foreground whitespace-nowrap">Perda %</th>
              <th className="text-right p-3 font-semibold text-muted-foreground whitespace-nowrap">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhum dado encontrado para os filtros atuais.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 px-5 font-medium">{r.loja}</td>
                  <td className="p-3 text-muted-foreground">{r.classe}</td>
                  <td className="p-3">{r.corte}</td>
                  <td className="p-3 text-right text-muted-foreground">{r.peso_inicial.toFixed(1)} kg</td>
                  <td className="p-3 text-right text-muted-foreground">{r.peso_final.toFixed(1)} kg</td>
                  <td className="p-3 px-5 text-right font-medium">
                    <span className={r.perda_pct > 5 ? 'text-destructive' : ''}>{r.perda_pct.toFixed(1)}%</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full ml-auto mt-1 overflow-hidden">
                      <div className={`h-full ${r.perda_pct > 5 ? 'bg-destructive' : 'bg-success'}`}
                           style={{ width: `${Math.min(r.perda_pct, 100)}%` }} />
                    </div>
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-xs whitespace-nowrap">{format(r.data, 'dd/MM/yyyy')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
