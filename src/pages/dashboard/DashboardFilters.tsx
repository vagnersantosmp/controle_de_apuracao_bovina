import { DashboardFilters as FiltersType, FilterPeriod } from './useDashboardData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface Props {
  filters: FiltersType;
  setFilters: (v: FiltersType) => void;
  lojasOptions: { id: string; nome: string; codigo: string }[];
  cortesOptions: { id: string; descricao: string; codigo?: string }[];
  isGlobalAdmin: boolean;
}

export function DashboardFilters({ filters, setFilters, lojasOptions, cortesOptions, isGlobalAdmin }: Props) {
  const [localFilters, setLocalFilters] = useState<FiltersType>(filters);
  const [openLojas, setOpenLojas] = useState(false);
  const [openCortes, setOpenCortes] = useState(false);

  const handleApply = () => {
    setFilters(localFilters); // useEffect([filters]) in the hook will pick this up automatically
  };

  const clearFilters = () => {
    const defaultF: FiltersType = {
      classe: 'todas',
      lojas: [],
      cortes: [],
      period: 'current_month',
      dateRange: { from: undefined, to: undefined }
    };
    setLocalFilters(defaultF);
    setFilters(defaultF);
  };

  const update = (key: keyof FiltersType, value: unknown, autoApply = false) => {
    setLocalFilters(prev => {
      const next = { ...prev, [key]: value };
      if (autoApply) {
        setFilters(next);
        // We use setTimeout to allow state to settle before refetch if needed, or rely on useEffect in parent. 
        // Our parent has useEffect on `filters`, so setting filters in parent already triggers refetch!
      }
      return next;
    });
  };

  const toggleLoja = (id: string) => {
    const cur = localFilters.lojas;
    if (cur.includes(id)) update('lojas', cur.filter(x => x !== id));
    else update('lojas', [...cur, id]);
  };

  const toggleCorte = (id: string) => {
    const cur = localFilters.cortes;
    if (cur.includes(id)) update('cortes', cur.filter(x => x !== id));
    else update('cortes', [...cur, id]);
  };

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        
        {/* Classe */}
        <div className="space-y-1.5 w-48">
          <label className="text-xs font-semibold text-muted-foreground">Classe de Apuração</label>
          <Select value={localFilters.classe} onValueChange={(v) => update('classe', v, true)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="boi_no_osso">Boi no Osso</SelectItem>
              <SelectItem value="nota_10">Açougue Nota 10</SelectItem>
              <SelectItem value="embalada">Carne Embalada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lojas - Only for admin/gestor */}
        {isGlobalAdmin && (
          <div className="space-y-1.5 w-60">
            <label className="text-xs font-semibold text-muted-foreground">Lojas</label>
            <Popover open={openLojas} onOpenChange={setOpenLojas}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={openLojas} className="w-full justify-between h-9 font-normal">
                  {localFilters.lojas.length === 0 ? "Todas as Lojas" : `${localFilters.lojas.length} loja(s) selec.`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar loja..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => update('lojas', [])}>
                        <Checkbox checked={localFilters.lojas.length === 0} className="mr-2" />
                        Todas as Lojas
                      </CommandItem>
                      {lojasOptions.map((l) => (
                        <CommandItem key={l.id} onSelect={() => toggleLoja(l.id)}>
                          <Checkbox checked={localFilters.lojas.includes(l.id)} className="mr-2" />
                          {l.codigo} - {l.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Cortes */}
        <div className="space-y-1.5 w-60">
          <label className="text-xs font-semibold text-muted-foreground">Cortes</label>
          <Popover open={openCortes} onOpenChange={setOpenCortes}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openCortes} className="w-full justify-between h-9 font-normal">
                {localFilters.cortes.length === 0 ? "Todos os Cortes" : `${localFilters.cortes.length} corte(s) selec.`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar corte..." />
                <CommandList>
                  <CommandEmpty>Nenhum corte encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem onSelect={() => update('cortes', [])}>
                      <Checkbox checked={localFilters.cortes.length === 0} className="mr-2" />
                      Todos os Cortes
                    </CommandItem>
                    {cortesOptions.map((c) => (
                      <CommandItem key={c.id} value={`${c.codigo ?? ''} ${c.descricao}`} onSelect={() => toggleCorte(c.id)}>
                        <Checkbox checked={localFilters.cortes.includes(c.id)} className="mr-2" />
                        <span className="flex items-center gap-2">
                          {c.codigo && (
                            <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">
                              {c.codigo}
                            </span>
                          )}
                          <span className="truncate">{c.descricao}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Periodo */}
        <div className="space-y-1.5 w-56">
          <label className="text-xs font-semibold text-muted-foreground">Período</label>
          <Select value={localFilters.period} onValueChange={(v: FilterPeriod) => update('period', v, true)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_week">Última Semana</SelectItem>
              <SelectItem value="current_month">Mês Atual</SelectItem>
              <SelectItem value="custom">Período Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={clearFilters} className="h-9">Limpar</Button>
          <Button onClick={handleApply} className="h-9">Aplicar Filtros</Button>
        </div>
      </div>

      {localFilters.period === 'custom' && (
        <div className="flex flex-wrap gap-4 pt-2 border-t mt-2 items-center">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">De:</label>
            <input
              type="date"
              className="h-9 px-3 rounded-md border bg-background text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring"
              value={localFilters.dateRange.from ? format(localFilters.dateRange.from, 'yyyy-MM-dd') : ''}
              onChange={e => {
                const d = e.target.value ? new Date(e.target.value + 'T12:00:00') : undefined;
                update('dateRange', { ...localFilters.dateRange, from: d });
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Até:</label>
            <input
              type="date"
              className="h-9 px-3 rounded-md border bg-background text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring"
              value={localFilters.dateRange.to ? format(localFilters.dateRange.to, 'yyyy-MM-dd') : ''}
              onChange={e => {
                const d = e.target.value ? new Date(e.target.value + 'T23:59:59') : undefined;
                update('dateRange', { ...localFilters.dateRange, to: d });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
