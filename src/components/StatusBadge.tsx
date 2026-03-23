import { cn } from '@/lib/utils';
import { StatusApuracao } from '@/types';

const statusConfig: Record<StatusApuracao, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-warning/15 text-warning border-warning/30' },
  finalizada: { label: 'Finalizada', className: 'bg-success/15 text-success border-success/30' },
  revisada: { label: 'Revisada', className: 'bg-info/15 text-info border-info/30' },
  em_andamento: { label: 'Em Ajuste', className: 'bg-blue-500/15 text-blue-600 border-blue-300/30' },
};

export function StatusBadge({ status, className }: { status: StatusApuracao; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', config.className, className)}>
      {config.label}
    </span>
  );
}
