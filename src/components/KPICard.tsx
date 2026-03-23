import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  titulo: string;
  valor: string | number;
  variacao?: string;
  tipo?: 'positivo' | 'negativo' | 'neutro' | 'alerta';
  icone?: LucideIcon;
  className?: string;
}

export function KPICard({ titulo, valor, variacao, tipo = 'neutro', icone: Icon, className }: KPICardProps) {
  const varColor = {
    positivo: 'text-success',
    negativo: 'text-destructive',
    alerta: 'text-warning',
    neutro: 'text-muted-foreground',
  }[tipo];

  return (
    <div className={cn('kpi-card animate-fade-in', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground/70">{titulo}</span>
        {Icon && <Icon className="h-4 w-4 text-foreground/70" />}
      </div>
      <div className="text-2xl font-bold text-foreground">{valor}</div>
      {variacao && <p className={cn('text-xs mt-1', varColor)}>{variacao}</p>}
    </div>
  );
}
