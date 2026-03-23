import { ProcessedData } from './useDashboardData';
import { KPICard } from '@/components/KPICard';
import { FileText, Scale, TrendingDown, AlertTriangle, Store, Percent } from 'lucide-react';

interface Props {
  data: ProcessedData | null;
  loading: boolean;
}

export function DashboardKPIs({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => (
           <div key={i} className="h-28 bg-muted rounded-xl border"></div>
        ))}
      </div>
    );
  }

  const { apuracoes, totalPI, totalPF, totalPerdaKg, mediaPerdaPercentual, lojaMaiorPerda } = data;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <KPICard 
        titulo="Total de Apurações" 
        valor={apuracoes.length} 
        icone={FileText} 
        tipo="neutro" 
      />
      <KPICard 
        titulo="Peso Inicial (kg)" 
        valor={totalPI.toFixed(1)} 
        icone={Scale} 
        tipo="neutro" 
      />
      <KPICard 
        titulo="Peso Final (kg)" 
        valor={totalPF.toFixed(1)} 
        icone={Scale} 
        tipo="neutro" 
      />
      <KPICard 
        titulo="Perda Total (kg)" 
        valor={totalPerdaKg.toFixed(1)} 
        icone={TrendingDown} 
        tipo={totalPerdaKg > 0 ? "negativo" : "positivo"} 
      />
      <KPICard 
        titulo="Perda Média" 
        valor={`${mediaPerdaPercentual.toFixed(2)}%`}
        icone={Percent} 
        tipo={mediaPerdaPercentual > 5 ? "alerta" : mediaPerdaPercentual > 10 ? "negativo" : "positivo"} 
      />
      <KPICard 
        titulo="Loja Maior Perda" 
        valor={lojaMaiorPerda ? lojaMaiorPerda.nome : "—"} 
        variacao={lojaMaiorPerda ? `${lojaMaiorPerda.perda.toFixed(2)}%` : ""}
        icone={Store} 
        tipo={lojaMaiorPerda && lojaMaiorPerda.perda > 5 ? "alerta" : "neutro"} 
        className={lojaMaiorPerda && lojaMaiorPerda.perda > 10 ? "!border-red-200 !bg-red-50/50" : ""}
      />
    </div>
  );
}
