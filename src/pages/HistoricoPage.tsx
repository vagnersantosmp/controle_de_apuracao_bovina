import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@/components/StatusBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

interface ApuracaoRow {
  id: string;
  data_apuracao: string;
  loja_id: string;
  tipo_apuracao: string;
  peso_carcaca: number;
  total_peso_inicial: number;
  total_peso_final: number;
  total_perda_kg: number;
  media_perda_percentual: number;
  status: 'rascunho' | 'finalizada' | 'revisada';
  responsavel: string;
  sif: string | null;
  numero_apuracao: string | null;
  loja_nome?: string;
}

async function fetchHistorico(
  page: number,
  filtroLoja: string,
  filtroStatus: string,
  busca: string,
  lojaId: string | undefined
) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('apuracoes')
    .select('*, lojas(nome)', { count: 'exact' })
    .order('data_apuracao', { ascending: false })
    .range(from, to);

  if (lojaId) query = query.eq('loja_id', lojaId);
  else if (filtroLoja) query = query.eq('loja_id', filtroLoja);
  if (filtroStatus) query = query.eq('status', filtroStatus);
  if (busca) query = query.ilike('lojas.nome', `%${busca}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows: ApuracaoRow[] = (data || []).map((a: any) => ({
    ...a,
    loja_nome: a.lojas?.nome || '—',
  }));

  return { rows, total: count ?? 0 };
}

export default function HistoricoPage() {
  const { user } = useAuth();
  const isLoja = user?.perfil === 'loja';

  const [page, setPage] = useState(0);
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');

  const { data: lojas = [] } = useQuery({
    queryKey: ['lojas-options'],
    queryFn: async () => {
      const { data } = await supabase.from('lojas').select('id, nome').eq('ativa', true).order('nome');
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['historico', page, filtroLoja, filtroStatus, busca, user?.lojaId],
    queryFn: () => fetchHistorico(page, filtroLoja, filtroStatus, busca, isLoja ? user?.lojaId : undefined),
    placeholderData: (prev) => prev,
  });

  const lista = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => { setBusca(buscaInput); setPage(0); };
  const handleFilter = (setter: (v: string) => void, value: string) => { setter(value); setPage(0); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Histórico de Apurações</h1>
        <p className="page-description">
          {total > 0 ? `${total} apurações encontradas` : 'Nenhuma apuração encontrada'}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por loja ou SIF..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} size="sm" className="shrink-0">Buscar</Button>
          </div>
        </div>
        {!isLoja && (
          <select
            value={filtroLoja}
            onChange={e => handleFilter(setFiltroLoja, e.target.value)}
            className="h-10 px-3 rounded-md border bg-background text-sm"
          >
            <option value="">Todas as lojas</option>
            {lojas.map((l: any) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        )}
        <select
          value={filtroStatus}
          onChange={e => handleFilter(setFiltroStatus, e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="finalizada">Finalizada</option>
          <option value="revisada">Revisada</option>
        </select>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className={`bg-card rounded-lg border overflow-x-auto transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Nº</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Loja</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Tipo</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Peso Inicial</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Peso Final</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Perda (kg)</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Perda %</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Responsável</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">Nenhuma apuração encontrada</td></tr>
              ) : (
                lista.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 whitespace-nowrap font-mono text-xs font-semibold text-primary">{a.numero_apuracao || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{new Date(a.data_apuracao).toLocaleDateString('pt-BR')}</td>
                    <td className="p-3 whitespace-nowrap">{a.loja_nome}</td>
                    <td className="p-3">
                      {a.tipo_apuracao === 'boi_no_osso' ? 'Boi no Osso' :
                       a.tipo_apuracao === 'nota_10' ? 'Açougue Nota 10' :
                       a.tipo_apuracao === 'embalada' ? 'Carne Embalada' : a.tipo_apuracao}
                    </td>
                    <td className="p-3 text-right">{Number(a.total_peso_inicial).toFixed(2)}</td>
                    <td className="p-3 text-right">{Number(a.total_peso_final).toFixed(2)}</td>
                    <td className="p-3 text-right font-medium">{Number(a.total_perda_kg).toFixed(2)}</td>
                    <td className="p-3 text-right font-medium">{Number(a.media_perda_percentual).toFixed(2)}%</td>
                    <td className="p-3 text-center"><StatusBadge status={a.status} /></td>
                    <td className="p-3 whitespace-nowrap">{a.responsavel}</td>
                    <td className="p-3 text-center">
                      <Link to={`/apuracao/${a.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages} — {total} registros no total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || isFetching}
                  className="gap-1"
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
