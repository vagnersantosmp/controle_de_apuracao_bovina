import { ProcessedData } from './useDashboardData';
import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Loader2 } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { renderBarLabelHorizontal, renderBarLabelVertical, renderDonutLabel, CHART_COLORS, RANKING_COLORS, CORTES_COLOR } from '@/lib/chartHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardFilters } from '@/services/apuracaoService';

interface Props {
  data: ProcessedData | null;
  loading: boolean;
  isGlobalAdmin: boolean;
  filters?: DashboardFilters;
  lojasOptions?: { id: string; nome: string }[];
  cortesOptions?: { id: string; descricao: string }[];
}

export function DashboardCharts({ data, loading, isGlobalAdmin, filters, lojasOptions, cortesOptions }: Props) {

  const [exportingId, setExportingId] = useState<string | null>(null);

  const exportChart = useCallback(async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      setExportingId(elementId);
      const canvas = await html2canvas(el, { scale: 1.5 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar gráfico:', err);
    } finally {
      setExportingId(null);
    }
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
        <Skeleton className="h-[280px] rounded-xl" />
      </div>
    );
  }

  const selectedLojasNames = filters?.lojas?.length 
    ? filters.lojas.map(id => lojasOptions?.find(l => l.id === id)?.nome).filter(Boolean).join(', ')
    : 'Todas as Lojas';

  const selectedCortesNames = filters?.cortes?.length
    ? filters.cortes.map(id => cortesOptions?.find(c => c.id === id)?.descricao).filter(Boolean).join(', ')
    : 'Todos os Cortes';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel 1: Ranking de Lojas (Only makes sense if admin and multiple stores) */}
        {isGlobalAdmin ? (
          <div id="chart-ranking-lojas" className="bg-card rounded-xl border p-5 shadow-sm col-span-1 relative bg-white dark:bg-slate-950">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground">Ranking de Perdas por Loja</h3>
                {filters?.cortes?.length ? <p className="text-[10px] text-muted-foreground mt-0.5">{selectedCortesNames}</p> : null}
              </div>
              <button 
                onClick={() => exportChart('chart-ranking-lojas', 'Ranking_Lojas')} 
                disabled={exportingId === 'chart-ranking-lojas'}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Exportar Imagem"
              >
                {exportingId === 'chart-ranking-lojas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>
            {data.rankingLojas.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.rankingLojas.slice(0,10)} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(210 18% 89%)" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nome" type="category" width={50} tick={{ fontSize: 11 }} />
                  <RechartsTooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Perda']}
                    contentStyle={{ borderRadius: 8, fontSize: '12px' }} 
                  />
                  <Bar dataKey="perda" radius={[0, 4, 4, 0]}>
                    {data.rankingLojas.slice(0,10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? RANKING_COLORS[0] : RANKING_COLORS[1]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="text-[10px] text-muted-foreground/50 text-right mt-3 border-t pt-2">Desenvolvido por Vagner Santos</div>
          </div>
        ) : null}

        {/* Painel 2: Donut Classe de Apuração */}
        <div id="chart-perda-classe" className={`bg-card rounded-xl border p-5 shadow-sm ${isGlobalAdmin ? 'col-span-1' : 'col-span-1 lg:col-span-1'} relative bg-white dark:bg-slate-950`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Perda por Classe de Apuração</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{selectedLojasNames}</p>
              {filters?.cortes?.length ? <p className="text-[10px] text-muted-foreground">{selectedCortesNames}</p> : null}
            </div>
            <button 
              onClick={() => exportChart('chart-perda-classe', 'Perda_Por_Classe')} 
              disabled={exportingId === 'chart-perda-classe'}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Exportar Imagem"
            >
              {exportingId === 'chart-perda-classe' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          {data.perdaPorClasse.length === 0 || data.totalPI === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.perdaPorClasse}
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderDonutLabel}
                  labelLine={false}
                >
                  {data.perdaPorClasse.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}%`, 'Perda Percentual']}
                  contentStyle={{ borderRadius: 8, fontSize: '12px' }} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="text-[10px] text-muted-foreground/50 text-right mt-3 border-t pt-2">Desenvolvido por Vagner Santos</div>
        </div>

        {/* Painel 3: Top 10 Cortes */}
        <div id="chart-top-cortes" className={`bg-card rounded-xl border p-5 shadow-sm ${isGlobalAdmin ? 'col-span-1' : 'col-span-1 lg:col-span-2'} relative bg-white dark:bg-slate-950`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">Top 10 Cortes com Maior Perda</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{selectedLojasNames}</p>
            </div>
            <button 
              onClick={() => exportChart('chart-top-cortes', 'Top_10_Cortes')} 
              disabled={exportingId === 'chart-top-cortes'}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Exportar Imagem"
            >
              {exportingId === 'chart-top-cortes' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          {data.top10Cortes.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.top10Cortes} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(210 18% 89%)" />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={155} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }} 
                  interval={0}
                  tickFormatter={(value: string) => value.length > 22 ? value.slice(0, 22) + '…' : value}
                />
                <RechartsTooltip 
                  formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)}% (${props.payload.perdaKg.toFixed(1)}kg)`, 'Perda']}
                  contentStyle={{ borderRadius: 8, fontSize: '12px' }} 
                />
                <Bar dataKey="perda" fill={CORTES_COLOR} radius={[0, 4, 4, 0]} barSize={24}>
                  {data.top10Cortes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.04)} />
                  ))}
                  <LabelList
                    content={(props: any) => renderBarLabelHorizontal({ ...props, data: data.top10Cortes })}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="text-[10px] text-muted-foreground/50 text-right mt-3 border-t pt-2">Desenvolvido por Vagner Santos</div>
        </div>
      </div>

      {/* Painel Inferior: Evolução da Perda no Tempo */}
      <div id="chart-evolucao" className="bg-card rounded-xl border p-5 shadow-sm relative bg-white dark:bg-slate-950">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Evolução da Perda no Período</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{selectedLojasNames}</p>
            {filters?.cortes?.length ? <p className="text-[10px] text-muted-foreground">{selectedCortesNames}</p> : null}
          </div>
          <button 
            onClick={() => exportChart('chart-evolucao', 'Evolucao_Perda')} 
            disabled={exportingId === 'chart-evolucao'}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Exportar Imagem"
          >
            {exportingId === 'chart-evolucao' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
        </div>
        {data.evolucaoPerda.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.evolucaoPerda} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(210 18% 89%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <RechartsTooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Perda %']}
                labelFormatter={(l) => `Semana/Dia: ${l}`}
                contentStyle={{ borderRadius: 8, fontSize: '12px' }} 
              />
              <Line 
                type="monotone" 
                dataKey="perda" 
                stroke="hsl(220, 80%, 40%)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: "white", strokeWidth: 2 }} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="text-[10px] text-muted-foreground/50 text-right mt-3 border-t pt-2">Desenvolvido por Vagner Santos</div>
      </div>
    </div>
  );
}
