import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from './dashboard/useDashboardData';
import { DashboardFilters } from './dashboard/DashboardFilters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Loader2, MonitorPlay, Download, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { renderBarLabelHorizontal, renderBarLabelVertical, renderDonutLabel, CHART_COLORS, RANKING_COLORS, CORTES_COLOR } from '@/lib/chartHelpers';

export default function PresentationsPage() {
  const { user } = useAuth();
  const [lojasOptions, setLojasOptions] = useState<{ id: string; nome: string; codigo: string }[]>([]);
  const [cortesOptions, setCortesOptions] = useState<{ id: string; descricao: string; codigo?: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const { data, loading, filters, setFilters } = useDashboardData(user);

  // Print settings
  const [orientacao, setOrientacao] = useState<'p' | 'l'>('p'); // p=retrato, l=paisagem
  const [divisao, setDivisao] = useState<'1' | '2'>('2'); // 1 ou 2 graficos por pagina

  // Chart Selection
  const [selectedCharts, setSelectedCharts] = useState({
    rankingLojas: true,
    melhoresLojas: false,
    panoramaLojas: false,
    donutClasse: true,
    topCortes: true,
    evolucao: true
  });

  const toggleChart = (key: keyof typeof selectedCharts) => {
    setSelectedCharts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Chart type customization
  const [rankingChartType, setRankingChartType] = useState<'horizontal' | 'vertical'>('horizontal');
  const [melhoresChartType, setMelhoresChartType] = useState<'horizontal' | 'vertical'>('horizontal');
  const [panoramaChartType, setPanoramaChartType] = useState<'horizontal' | 'vertical'>('vertical');
  const [cortesChartType, setCortesChartType] = useState<'horizontal' | 'vertical'>('horizontal');

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      const [lojasRes, cortesRes] = await Promise.all([
        supabase.from('lojas').select('id, codigo, nome').eq('ativa', true),
        supabase.from('cortes').select('id, descricao, codigo').eq('ativo', true).order('descricao')
      ]);
      setLojasOptions(lojasRes.data || []);
      setCortesOptions(cortesRes.data || []);
      setOptionsLoading(false);
    };
    loadOptions();
  }, []);

  if (!user) return null;
  const isGlobalAdmin = user.perfil === 'admin' || user.perfil === 'gestor' || user.perfil === 'prevencao';

  const handleExportPDF = () => {
    window.print();
  };

  if (optionsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Determine heights depending on layout
  let chartHeightPx = 350;
  if (divisao === '1') {
    chartHeightPx = orientacao === 'l' ? 480 : 700;
  } else {
    chartHeightPx = orientacao === 'l' ? 240 : 350;
  }

  const selectedLojasNames = filters?.lojas?.length 
    ? filters.lojas.map(id => lojasOptions?.find(l => l.id === id)?.nome).filter(Boolean).join(', ')
    : 'Todas as Lojas';

  const selectedCortesNames = filters?.cortes?.length
    ? filters.cortes.map(id => cortesOptions?.find(c => c.id === id)?.descricao).filter(Boolean).join(', ')
    : 'Todos os Cortes';

  const chartContainerClass = cn(
    "bg-white p-6 border rounded-sm shadow-sm print:break-inside-avoid print:shadow-none print:border-none",
    divisao === '1' ? "print:break-after-page last:print:break-after-auto print:h-[93vh] print:flex print:flex-col print:justify-center" : "print:mb-8"
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 print:pb-0 print:space-y-4">
      <style>{`
        @media print {
          @page { margin: 10mm; }
          body { background-color: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <div className="page-header flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="page-title text-2xl font-bold flex items-center gap-2">
            <MonitorPlay className="h-6 w-6 text-primary" />
            Exportação de Apresentações
          </h1>
          <p className="page-description text-muted-foreground">Construa e exporte painéis gerenciais em formato folha A4</p>
        </div>
        <Button onClick={handleExportPDF} size="lg" className="shadow-md">
          <Download className="w-5 h-5 mr-2" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="print:hidden">
        <DashboardFilters 
          filters={filters}
          setFilters={setFilters}
          lojasOptions={lojasOptions}
          cortesOptions={cortesOptions}
          isGlobalAdmin={isGlobalAdmin}
        />
      </div>

      {/* Painel de Controle de Impressão */}
      <div className="bg-card rounded-xl border p-5 shadow-sm space-y-4 print:hidden">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckSquare className="h-4 w-4" /> Construtor do Relatório
        </h2>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Coluna 1: Seleção + Tipo de Gráfico */}
          <div className="space-y-4 flex-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Métricas a Incluir</Label>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="chk-lojas" checked={selectedCharts.rankingLojas} onCheckedChange={() => toggleChart('rankingLojas')} disabled={!isGlobalAdmin} />
                  <label htmlFor="chk-lojas" className="text-sm font-medium leading-none cursor-pointer">Ranking de Lojas</label>
                </div>
                {selectedCharts.rankingLojas && (
                  <Select value={rankingChartType} onValueChange={(v: any) => setRankingChartType(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Barras Horizontais</SelectItem>
                      <SelectItem value="vertical">Barras Verticais</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="chk-melhores" checked={selectedCharts.melhoresLojas} onCheckedChange={() => toggleChart('melhoresLojas')} disabled={!isGlobalAdmin} />
                  <label htmlFor="chk-melhores" className="text-sm font-medium leading-none cursor-pointer">🏆 Melhores Lojas (Menor Perda)</label>
                </div>
                {selectedCharts.melhoresLojas && (
                  <Select value={melhoresChartType} onValueChange={(v: any) => setMelhoresChartType(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Barras Horizontais</SelectItem>
                      <SelectItem value="vertical">Barras Verticais</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="chk-panorama" checked={selectedCharts.panoramaLojas} onCheckedChange={() => toggleChart('panoramaLojas')} disabled={!isGlobalAdmin} />
                  <label htmlFor="chk-panorama" className="text-sm font-medium leading-none cursor-pointer">📊 Panorama Completo (Todas as Lojas)</label>
                </div>
                {selectedCharts.panoramaLojas && (
                  <Select value={panoramaChartType} onValueChange={(v: any) => setPanoramaChartType(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Barras Horizontais</SelectItem>
                      <SelectItem value="vertical">Barras Verticais</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="chk-donut" checked={selectedCharts.donutClasse} onCheckedChange={() => toggleChart('donutClasse')} />
                <label htmlFor="chk-donut" className="text-sm font-medium leading-none cursor-pointer">Perda por Classe (Donut)</label>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="chk-cortes" checked={selectedCharts.topCortes} onCheckedChange={() => toggleChart('topCortes')} />
                  <label htmlFor="chk-cortes" className="text-sm font-medium leading-none cursor-pointer">Top 10 Cortes (Maior Perda)</label>
                </div>
                {selectedCharts.topCortes && (
                  <Select value={cortesChartType} onValueChange={(v: any) => setCortesChartType(v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Barras Horizontais</SelectItem>
                      <SelectItem value="vertical">Barras Verticais</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="chk-evo" checked={selectedCharts.evolucao} onCheckedChange={() => toggleChart('evolucao')} />
                <label htmlFor="chk-evo" className="text-sm font-medium leading-none cursor-pointer">Evolução no Período</label>
              </div>
            </div>
          </div>

          {/* Coluna 2: Layout PDF */}
          <div className="space-y-4 flex-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Layout de Impressão (PDF)</Label>
            <div className="grid grid-cols-2 gap-4 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Orientação da Folha</Label>
                <Select value={orientacao} onValueChange={(v:any) => setOrientacao(v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="p">Retrato (Vertical)</SelectItem>
                    <SelectItem value="l">Paisagem (Horizontal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Divisão de Página</Label>
                <Select value={divisao} onValueChange={(v:any) => setDivisao(v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Gráfico p/ Página</SelectItem>
                    <SelectItem value="2">2 Gráficos p/ Página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-foreground border-b pb-2 print:hidden">Pré-visualização dos Gráficos (Tamanho Dinâmico para Câmera)</h2>
          
          <div className="grid grid-cols-1 gap-6 print:block print:space-y-8">
            
            {/* 1. Ranking Lojas */}
            {selectedCharts.rankingLojas && isGlobalAdmin && (
              <div id="pres-chart-ranking-lojas" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Ranking de Perdas por Loja</h3>
                  {filters?.cortes?.length ? <p className="text-xs text-slate-500 mt-1">{selectedCortesNames}</p> : null}
                </div>
                {data.rankingLojas.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : rankingChartType === 'horizontal' ? (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <BarChart data={data.rankingLojas.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" radius={[0, 4, 4, 0]}>
                        {data.rankingLojas.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? RANKING_COLORS[0] : RANKING_COLORS[1]} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelHorizontal({ ...props, data: data.rankingLojas.slice(0, 10) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <BarChart data={data.rankingLojas.slice(0, 10)} margin={{ left: 0, right: 10, top: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#333' } as any} interval={0} height={70} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" radius={[4, 4, 0, 0]}>
                        {data.rankingLojas.slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? RANKING_COLORS[0] : RANKING_COLORS[1]} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelVertical({ ...props, textColor: '#333', subTextColor: '#666', data: data.rankingLojas.slice(0, 10) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

            {/* 1b. Melhores Lojas */}
            {selectedCharts.melhoresLojas && isGlobalAdmin && (
              <div id="pres-chart-melhores-lojas" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">🏆 Melhores Lojas (Menor Perda)</h3>
                  {filters?.cortes?.length ? <p className="text-xs text-slate-500 mt-1">{selectedCortesNames}</p> : null}
                </div>
                {data.rankingLojas.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : melhoresChartType === 'horizontal' ? (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <BarChart data={[...data.rankingLojas].reverse().slice(0, 10)} layout="vertical" margin={{ left: 10, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" radius={[0, 4, 4, 0]}>
                        {[...data.rankingLojas].reverse().slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(150, 70%, 40%)' : 'hsl(160, 60%, 55%)'} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelHorizontal({ ...props, data: [...data.rankingLojas].reverse().slice(0, 10) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <BarChart data={[...data.rankingLojas].reverse().slice(0, 10)} margin={{ left: 0, right: 10, top: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#333' } as any} interval={0} height={70} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" radius={[4, 4, 0, 0]}>
                        {[...data.rankingLojas].reverse().slice(0, 10).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(150, 70%, 40%)' : 'hsl(160, 60%, 55%)'} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelVertical({ ...props, textColor: '#333', subTextColor: '#666', data: [...data.rankingLojas].reverse().slice(0, 10) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

            {/* 1c. Panorama Completo */}
            {selectedCharts.panoramaLojas && isGlobalAdmin && (
              <div id="pres-chart-panorama-lojas" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">📊 Panorama Completo</h3>
                  <p className="text-sm text-slate-600 font-medium mt-1">{selectedLojasNames}</p>
                  {filters?.cortes?.length ? <p className="text-xs text-slate-500 mt-0.5">{selectedCortesNames}</p> : null}
                </div>
                {data.rankingLojas.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : panoramaChartType === 'vertical' ? (
                  <ResponsiveContainer width="100%" height={Math.max(chartHeightPx, data.rankingLojas.length * 35 + 100)}>
                    <BarChart data={[...data.rankingLojas].sort((a, b) => a.perda - b.perda)} margin={{ left: 0, right: 10, top: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#333' } as any} interval={0} height={70} angle={-35} textAnchor="end" />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" radius={[4, 4, 0, 0]} barSize={28}>
                        {[...data.rankingLojas].sort((a, b) => a.perda - b.perda).map((entry, index, arr) => (
                          <Cell key={`cell-${index}`} fill={index < 3 ? 'hsl(150, 70%, 45%)' : index >= arr.length - 3 ? 'hsl(0, 70%, 55%)' : 'hsl(210, 60%, 55%)'} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelVertical({ ...props, textColor: '#333', subTextColor: '#666', data: [...data.rankingLojas].sort((a, b) => a.perda - b.perda) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(chartHeightPx, data.rankingLojas.length * 35 + 40)}>
                    <BarChart data={[...data.rankingLojas].sort((a, b) => a.perda - b.perda)} layout="vertical" margin={{ left: 10, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 11, fill: '#333' }} interval={0} />
                      <Bar dataKey="perda" radius={[0, 4, 4, 0]} barSize={20}>
                        {[...data.rankingLojas].sort((a, b) => a.perda - b.perda).map((entry, index, arr) => (
                          <Cell key={`cell-${index}`} fill={index < 3 ? 'hsl(150, 70%, 45%)' : index >= arr.length - 3 ? 'hsl(0, 70%, 55%)' : 'hsl(210, 60%, 55%)'} />
                        ))}
                        <LabelList content={(props: any) => renderBarLabelHorizontal({ ...props, data: [...data.rankingLojas].sort((a, b) => a.perda - b.perda) })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

            {/* 2. Donut */}
            {selectedCharts.donutClasse && (
              <div id="pres-chart-donut-classe" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Perda por Classe de Apuração</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedLojasNames}</p>
                  {filters?.cortes?.length ? <p className="text-[10px] text-slate-500 mt-0.5">{selectedCortesNames}</p> : null}
                </div>
                {data.perdaPorClasse.length === 0 ? (
                   <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <PieChart>
                      <Pie data={data.perdaPorClasse} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value" label={renderDonutLabel} labelLine={false}>
                     {data.perdaPorClasse.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Perda']} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

            {/* 3. Top Cortes */}
            {selectedCharts.topCortes && (
              <div id="pres-chart-top-cortes" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Top 10 Cortes com Maior Perda</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedLojasNames}</p>
                  {filters?.cortes?.length ? <p className="text-[10px] text-slate-500 mt-0.5">{selectedCortesNames}</p> : null}
                </div>
                {data.top10Cortes.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : cortesChartType === 'horizontal' ? (
                  <ResponsiveContainer width="100%" height={chartHeightPx + 50}>
                    <BarChart data={data.top10Cortes} layout="vertical" margin={{ left: 10, right: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#333' }} interval={0} tickFormatter={(v: string) => v.length > 25 ? v.slice(0, 25) + '…' : v} />
                      <Bar dataKey="perda" fill={CORTES_COLOR} radius={[0, 4, 4, 0]} barSize={28}>
                        {data.top10Cortes.map((_, index) => <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.04)} />)}
                        <LabelList content={(props: any) => renderBarLabelHorizontal({ ...props, data: data.top10Cortes })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeightPx + 50}>
                    <BarChart data={data.top10Cortes} margin={{ left: 0, right: 10, top: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#333' } as any} interval={0} height={90} angle={-40} textAnchor="end" />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} />
                      <Bar dataKey="perda" fill={CORTES_COLOR} radius={[4, 4, 0, 0]} barSize={32}>
                        {data.top10Cortes.map((_, index) => <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.04)} />)}
                        <LabelList content={(props: any) => renderBarLabelVertical({ ...props, textColor: '#333', subTextColor: '#666', data: data.top10Cortes })} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

            {/* 4. Evolucao */}
            {selectedCharts.evolucao && (
              <div id="pres-chart-evolucao" className={chartContainerClass}>
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-800">Evolução da Perda no Período</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedLojasNames}</p>
                  {filters?.cortes?.length ? <p className="text-[10px] text-slate-500 mt-0.5">{selectedCortesNames}</p> : null}
                </div>
                {data.evolucaoPerda.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-slate-400">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={chartHeightPx}>
                    <LineChart data={data.evolucaoPerda} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#333' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#333' }} axisLine={false} tickLine={false} />
                      <Line type="monotone" dataKey="perda" stroke="hsl(220, 80%, 40%)" strokeWidth={4} dot={{ r: 5, fill: "white", strokeWidth: 2 }} activeDot={{ r: 7 }}>
                        <LabelList dataKey="perda" position="top" formatter={(v: number) => `${v.toFixed(1)}%`} style={{ fontSize: 11, fontWeight: 600, fill: '#1e3a5f' }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <div className="text-[10px] text-slate-400 text-right mt-4 border-t pt-2">Desenvolvido por Vagner Santos</div>
              </div>
            )}

          </div>
        </div>
      ) : null}
    </div>
  );
}
