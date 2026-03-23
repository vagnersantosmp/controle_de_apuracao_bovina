import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Clock, Printer, Eye, X, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type Chamado = {
  id: string;
  apuracao_id: string;
  motivo: string;
  status: 'aberto' | 'aprovado' | 'rejeitado' | 'revisado';
  created_at: string;
  resolvido_por: string | null;
  revisor_nome?: string | null;
  numero_chamado: string | null;
  lojas: { nome: string };
  apuracoes: { data_apuracao: string; numero_apuracao: string | null };
};

export default function ChamadosPage() {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedMotivo, setExpandedMotivo] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewingChamado, setViewingChamado] = useState<Chamado | null>(null);
  const [editingMotivo, setEditingMotivo] = useState<{ id: string; motivo: string; numero: string | null } | null>(null);

  const fetchChamados = async () => {
    setLoading(true);
    let query = supabase
      .from('chamados')
      .select('id, apuracao_id, motivo, status, created_at, resolvido_por, numero_chamado, lojas(nome), apuracoes(data_apuracao, numero_apuracao)')
      .order('created_at', { ascending: false });

    if (user?.perfil === 'loja' && user?.lojaId) {
      query = query.eq('loja_id', user.lojaId);
    }

    const { data, error } = await query;
    
    if (error) {
      toast.error('Erro ao carregar chamados');
      console.error(error);
    } else {
      // Fetch revisor names for chamados that have a resolver
      const chamadosData = data as any[];
      const revisorIds = [...new Set(chamadosData.filter(c => c.resolvido_por).map(c => c.resolvido_por))];
      let revisorMap: Record<string, string> = {};
      if (revisorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nome')
          .in('user_id', revisorIds);
        if (profiles) {
          profiles.forEach((p: any) => { revisorMap[p.user_id] = p.nome; });
        }
      }
      setChamados(chamadosData.map(c => ({ ...c, revisor_nome: c.resolvido_por ? revisorMap[c.resolvido_por] || null : null })) as Chamado[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChamados();
  }, []);

  const statusLabel = (s: string) => {
    if (s === 'aberto') return 'Pendente';
    if (s === 'aprovado') return 'Em Ajuste';
    if (s === 'revisado') return 'Revisado';
    if (s === 'rejeitado') return 'Rejeitado';
    return s;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === chamados.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(chamados.map(c => c.id)));
    }
  };

  const handlePrint = () => {
    const now = new Date().toLocaleString('pt-BR');
    const toPrint = selectedIds.size > 0
      ? chamados.filter(c => selectedIds.has(c.id))
      : chamados;
    const rows = toPrint.map(c => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;color:#2563eb">${c.numero_chamado || '—'}</td>
        <td>${new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
        <td><strong>${c.lojas?.nome || '—'}</strong></td>
        <td style="font-family:monospace;font-weight:bold">${c.apuracoes?.numero_apuracao || new Date(c.apuracoes?.data_apuracao).toLocaleDateString('pt-BR')}</td>
        <td>${c.motivo}</td>
        <td>${statusLabel(c.status)}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Painel de Chamados</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f0f0f0; text-align: left; padding: 8px; border: 1px solid #ccc; font-size: 11px; }
          td { padding: 7px 8px; border: 1px solid #ddd; vertical-align: top; }
          tr:nth-child(even) td { background: #fafafa; }
          .footer { margin-top: 16px; font-size: 10px; color: #888; }
        </style>
      </head>
      <body>
        <h1>Painel de Chamados</h1>
        <div class="sub">Impresso em: ${now} &nbsp;&nbsp;|&nbsp;&nbsp; Total: ${chamados.length} chamado(s)</div>
        <table>
          <thead>
            <tr>
              <th>Nº Chamado</th><th>Data</th><th>Loja</th><th>Apuração</th><th>Motivo</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Sistema de Apuração de Açougue &mdash; Documento gerado automaticamente</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handlePrintSingle = (c: Chamado) => {
    const html = `
      <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" />
      <title>Chamado ${c.numero_chamado || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 32px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .sub { color: #777; font-size: 11px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #f0f0f0; text-align: left; padding: 7px 10px; border: 1px solid #ccc; }
        td { padding: 7px 10px; border: 1px solid #ddd; vertical-align: top; }
        .motivo { white-space: pre-wrap; word-break: break-word; }
        .footer { margin-top: 24px; font-size: 10px; color: #aaa; }
      </style></head><body>
      <h1>Chamado de Ajuste: <span style="font-family:monospace;color:#2563eb">${c.numero_chamado || '—'}</span></h1>
      <div class="sub">Impresso em: ${new Date().toLocaleString('pt-BR')}</div>
      <table>
        <tr><th>Loja</th><td>${c.lojas?.nome || '—'}</td><th>Apuração</th><td style="font-family:monospace;font-weight:bold">${c.apuracoes?.numero_apuracao || new Date(c.apuracoes?.data_apuracao).toLocaleDateString('pt-BR')}</td></tr>
        <tr><th>Data Solicitação</th><td>${new Date(c.created_at).toLocaleString('pt-BR')}</td><th>Status</th><td>${statusLabel(c.status)}</td></tr>
        <tr><th>Revisor</th><td colspan="3">${c.revisor_nome || '—'}</td></tr>
        <tr><th>Motivo</th><td colspan="3" class="motivo">${c.motivo}</td></tr>
      </table>
      <div class="footer">Sistema de Apuração de Açougue &mdash; Documento gerado automaticamente</div>
      <script>window.onload = () => { window.print(); }<\/script>
      </body></html>`;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleSaveMotivo = async () => {
    if (!editingMotivo) return;
    if (!editingMotivo.motivo.trim()) {
      toast.error('O motivo não pode ser vazio');
      return;
    }
    setActionLoading(editingMotivo.id);
    const { error } = await supabase
      .from('chamados')
      .update({ motivo: editingMotivo.motivo })
      .eq('id', editingMotivo.id);

    if (error) {
      toast.error('Erro ao salvar motivo');
    } else {
      toast.success('Motivo atualizado com sucesso!');
      setEditingMotivo(null);
      fetchChamados();
    }
    setActionLoading(null);
  };

  const handleAction = async (id: string, status: 'aprovado' | 'rejeitado', apuracaoId: string) => {
    setActionLoading(id);
    
    // 1. Atualiza o status do chamado
    const { error: chamadoError } = await supabase
      .from('chamados')
      .update({ 
        status, 
        resolvido_por: user?.id, 
        data_resolucao: new Date().toISOString() 
      })
      .eq('id', id);

    if (chamadoError) {
      toast.error(`Erro ao ${status === 'aprovado' ? 'aprovar' : 'rejeitar'} chamado`);
      setActionLoading(null);
      return;
    }

    // 2. Se foi aprovado, reabre a apuração correspondente!
    if (status === 'aprovado') {
      const { error: apuracaoError } = await supabase
        .from('apuracoes')
        .update({ status: 'em_andamento' })
        .eq('id', apuracaoId);
        
      if (apuracaoError) {
        toast.error('Erro ao reabrir a apuração da loja');
        setActionLoading(null);
        return;
      }
      toast.success('Chamado aprovado e Apuração liberada para a Loja!');
    } else {
      toast.success('Chamado rejeitado.');
    }

    setActionLoading(null);
    fetchChamados(); // recarrega a lista
  };

  const handleFinalizar = async (id: string) => {
    if (!window.confirm('Confirmar que o ajuste na apuração foi realizado e o chamado pode ser encerrado?')) return;
    setActionLoading(id);
    const { error } = await supabase
      .from('chamados')
      .update({ status: 'revisado', data_resolucao: new Date().toISOString(), resolvido_por: user?.id })
      .eq('id', id);
    if (error) {
      toast.error('Erro ao finalizar chamado');
    } else {
      toast.success('Chamado finalizado com sucesso!');
      fetchChamados();
    }
    setActionLoading(null);
  };

  const handleReabrir = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from('chamados')
      .update({ status: 'aberto', resolvido_por: null, data_resolucao: null })
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao reabrir chamado');
    } else {
      toast.success('Chamado reaberto com sucesso!');
      fetchChamados();
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Chamados</h1>
        <Button variant="outline" onClick={handlePrint} disabled={chamados.length === 0} className="gap-2">
          <Printer className="h-4 w-4" />
          {selectedIds.size > 0 ? `Imprimir ${selectedIds.size} selecionado(s)` : 'Imprimir Todos'}
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chamados.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground flex-col">
            <CheckCircle2 className="h-12 w-12 text-primary/40 mb-2" />
            <p>Nenhum chamado pendente ou histórico encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
              <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === chamados.length && chamados.length > 0}
                      onChange={toggleAll}
                      title="Selecionar todos"
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">Nº Chamado</th>
                  <th className="px-4 py-3">Data Solicitação</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Apuração Afetada</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Revisor</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {chamados.map((c) => (
                  <tr key={c.id} className={`border-b last:border-0 transition-colors ${selectedIds.has(c.id) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-primary text-sm">{c.numero_chamado || '—'}</td>
                    <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-semibold">{c.lojas?.nome}</td>
                    <td className="px-4 py-3">
                      {c.apuracoes?.numero_apuracao ? (
                        <Link 
                          to={`/apuracao/${c.apuracao_id}`}
                          className="font-mono font-semibold text-primary hover:underline"
                        >
                          {c.apuracoes.numero_apuracao}
                        </Link>
                      ) : (
                        new Date(c.apuracoes?.data_apuracao).toLocaleDateString('pt-BR')
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div
                        className="cursor-pointer"
                        onClick={() => setExpandedMotivo(expandedMotivo === c.id ? null : c.id)}
                      >
                        {expandedMotivo === c.id ? (
                          <span className="text-foreground whitespace-pre-wrap">{c.motivo}</span>
                        ) : (
                          <span className="truncate block max-w-xs text-muted-foreground hover:text-foreground transition-colors" title="Clique para expandir">
                            {c.motivo.length > 50 ? c.motivo.slice(0, 50) + '...' : c.motivo}
                          </span>
                        )}
                        {c.motivo.length > 50 && (
                          <span className="text-xs text-primary mt-0.5 block">
                            {expandedMotivo === c.id ? 'Clique para recolher' : 'Clique para ver mais'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.status === 'aberto' && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-yellow-500/10 text-yellow-600"><Clock className="w-3 h-3" /> Pendente</span>}
                      {c.status === 'aprovado' && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-500/10 text-blue-600"><CheckCircle2 className="w-3 h-3" /> Em Ajuste</span>}
                      {c.status === 'revisado' && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-green-500/10 text-green-600"><CheckCircle2 className="w-3 h-3" /> Revisado</span>}
                      {c.status === 'rejeitado' && <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-red-500/10 text-red-600"><XCircle className="w-3 h-3" /> Rejeitado</span>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.revisor_nome ? (
                        <span className="font-medium text-foreground">{c.revisor_nome}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium flex gap-2 justify-center">
                      {user?.perfil !== 'loja' ? (
                        <>
                          {c.status === 'aberto' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="default" 
                                disabled={actionLoading === c.id}
                                onClick={() => handleAction(c.id, 'aprovado', c.apuracao_id)}
                              >
                                Aprovar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                disabled={actionLoading === c.id}
                                onClick={() => handleAction(c.id, 'rejeitado', c.apuracao_id)}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {c.status === 'rejeitado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === c.id}
                              onClick={() => handleReabrir(c.id)}
                            >
                              Reabrir
                            </Button>
                          )}
                          {c.status === 'aprovado' && (
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={actionLoading === c.id}
                                onClick={() => handleFinalizar(c.id)}
                                className="text-xs w-full"
                              >
                                Finalizar Chamado
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === c.id}
                                onClick={() => handleReabrir(c.id)}
                                className="text-xs w-full"
                              >
                                Reabrir
                              </Button>
                            </div>
                          )}
                          {c.status === 'revisado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading === c.id}
                              onClick={() => handleReabrir(c.id)}
                            >
                              Reabrir Chamado
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          {(c.status === 'aberto' || c.status === 'rejeitado') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              disabled={actionLoading === c.id}
                              onClick={() => setEditingMotivo({ id: c.id, motivo: c.motivo, numero: c.numero_chamado })}
                            >
                              <Edit2 className="w-3 h-3" /> Editar
                            </Button>
                          )}
                        </>
                      )}
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingChamado(c)}
                        title="Visualizar chamado"
                        className="mt-1 text-muted-foreground hover:text-primary"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewingChamado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingChamado(null)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border p-6 space-y-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Chamado de Ajuste</h2>
                {viewingChamado.numero_chamado && (
                  <span className="font-mono text-xl text-primary font-bold">{viewingChamado.numero_chamado}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handlePrintSingle(viewingChamado)} className="gap-1">
                  <Printer className="w-4 h-4" /> Imprimir
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewingChamado(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4 bg-muted/30">
              <div><span className="text-muted-foreground block text-xs">Loja</span><span className="font-semibold">{viewingChamado.lojas?.nome}</span></div>
              <div><span className="text-muted-foreground block text-xs">Apuração</span>
                <Link to={`/apuracao/${viewingChamado.apuracao_id}`} className="font-mono font-bold text-primary hover:underline" onClick={() => setViewingChamado(null)}>
                  {viewingChamado.apuracoes?.numero_apuracao || new Date(viewingChamado.apuracoes?.data_apuracao).toLocaleDateString('pt-BR')}
                </Link>
              </div>
              <div><span className="text-muted-foreground block text-xs">Data Solicitação</span><span>{new Date(viewingChamado.created_at).toLocaleString('pt-BR')}</span></div>
              <div><span className="text-muted-foreground block text-xs">Status</span>
                <span className="font-semibold">{statusLabel(viewingChamado.status)}</span>
              </div>
              <div className="col-span-2"><span className="text-muted-foreground block text-xs">Revisor</span>
                <span>{viewingChamado.revisor_nome || <em className="text-muted-foreground">Não revisado ainda</em>}</span>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Motivo da Solicitação</span>
              <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/40 rounded-lg p-3 border">{viewingChamado.motivo}</p>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewingChamado(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Motivo Modal */}
      {editingMotivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingMotivo(null)}>
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Editar Chamado</h2>
                <span className="font-mono text-xl text-primary font-bold">{editingMotivo.numero || '—'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingMotivo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Solicitação</label>
              <textarea
                value={editingMotivo.motivo}
                onChange={e => setEditingMotivo({ ...editingMotivo, motivo: e.target.value })}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Descreva em detalhes o ajuste necessário para esta apuração.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingMotivo(null)} disabled={actionLoading === editingMotivo.id}>Cancelar</Button>
              <Button onClick={handleSaveMotivo} disabled={actionLoading === editingMotivo.id} className="gap-2">
                {actionLoading === editingMotivo.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
