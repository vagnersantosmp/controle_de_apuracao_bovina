import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Send, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface ItemRow {
  id?: string;
  corte_codigo: string;
  corte_descricao: string;
  peso_inicial: number;
  peso_final: number;
  perda_kg: number;
  perda_percentual: number;
}

interface ApuracaoDetail {
  id: string;
  data_apuracao: string;
  tipo_apuracao: string;
  peso_carcaca: number;
  sif: string | null;
  observacoes: string | null;
  responsavel: string;
  status: 'rascunho' | 'finalizada' | 'revisada' | 'em_andamento';
  total_peso_inicial: number;
  total_peso_final: number;
  total_perda_kg: number;
  media_perda_percentual: number;
  created_at: string;
  loja_id: string;
  loja_nome: string;
  numero_apuracao: string | null;
  itens: ItemRow[];
}

export default function DetalheApuracaoPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [apuracao, setApuracao] = useState<ApuracaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editItens, setEditItens] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Chamado States
  const [showChamadoModal, setShowChamadoModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [sendingChamado, setSendingChamado] = useState(false);

  const canEdit = user?.perfil === 'admin' || user?.perfil === 'gestor' || user?.perfil === 'prevencao';
  const canDelete = user?.perfil === 'admin' || user?.perfil === 'gestor';

  const loadApuracao = async () => {
    const [apRes, itensRes] = await Promise.all([
      supabase.from('apuracoes').select('*, lojas(nome)').eq('id', id!).single(),
      supabase.from('itens_apuracao').select('*').eq('apuracao_id', id!).order('created_at'),
    ]);

    if (apRes.data) {
      const itens = (itensRes.data || []).map((i: any) => ({
        id: i.id,
        corte_codigo: i.corte_codigo,
        corte_descricao: i.corte_descricao,
        peso_inicial: Number(i.peso_inicial),
        peso_final: Number(i.peso_final),
        perda_kg: Number(i.perda_kg),
        perda_percentual: Number(i.perda_percentual),
      }));
      setApuracao({
        ...apRes.data,
        loja_id: (apRes.data as any).loja_id,
        loja_nome: (apRes.data as any).lojas?.nome || '—',
        itens,
      } as ApuracaoDetail);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadApuracao();
  }, [id]);

  const handleStartEdit = () => {
    if (!apuracao) return;
    setEditItens(apuracao.itens.map(i => ({ ...i })));
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditItens([]);
  };

  const handleItemChange = (idx: number, field: 'peso_inicial' | 'peso_final', value: string) => {
    const newItens = [...editItens];
    const numVal = parseFloat(value) || 0;
    newItens[idx] = { ...newItens[idx], [field]: numVal };

    // Recalculate perda
    const pi = field === 'peso_inicial' ? numVal : newItens[idx].peso_inicial;
    const pf = field === 'peso_final' ? numVal : newItens[idx].peso_final;
    newItens[idx].perda_kg = pi - pf;
    newItens[idx].perda_percentual = pi > 0 ? ((pi - pf) / pi) * 100 : 0;

    setEditItens(newItens);
  };

  const handleSaveEdit = async () => {
    if (!apuracao) return;
    setSaving(true);

    try {
      // Update each item — use .select('id') to detect silent RLS failures
      for (const item of editItens) {
        if (!item.id) continue;
        const { data: updatedRows, error } = await supabase
          .from('itens_apuracao')
          .update({
            peso_inicial: item.peso_inicial,
            peso_final: item.peso_final,
            perda_kg: item.perda_kg,
            perda_percentual: item.perda_percentual,
          })
          .eq('id', item.id)
          .select('id');
        if (error) throw new Error(error.message);
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(
            'Sem permissão para alterar os itens desta apuração. Verifique as políticas de acesso (RLS) na tabela itens_apuracao.'
          );
        }
      }

      // Recalculate totals
      const totalPesoInicial = editItens.reduce((s, i) => s + i.peso_inicial, 0);
      const totalPesoFinal = editItens.reduce((s, i) => s + i.peso_final, 0);
      const totalPerdaKg = totalPesoInicial - totalPesoFinal;
      const mediaPerdaPercentual = totalPesoInicial > 0
        ? (totalPerdaKg / totalPesoInicial) * 100 : 0;

      const { error: apError } = await supabase.from('apuracoes').update({
        total_peso_inicial: totalPesoInicial,
        total_peso_final: totalPesoFinal,
        total_perda_kg: totalPerdaKg,
        media_perda_percentual: mediaPerdaPercentual,
        status: 'revisada',
      }).eq('id', apuracao.id);

      toast.success('Apuração ajustada com sucesso!');
      setEditMode(false);
      await loadApuracao();
    } catch (err: any) {
      toast.error('Erro ao salvar ajustes: ' + err.message);
    }

    setSaving(false);
  };

  const handleOpenChamado = async () => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo detalhado para a solicitação.');
      return;
    }

    setSendingChamado(true);
    const { error } = await supabase.from('chamados').insert({
      apuracao_id: id,
      loja_id: apuracao?.loja_id,
      solicitante_id: user?.id,
      motivo: motivo.trim()
    });

    setSendingChamado(false);

    if (error) {
      toast.error('Não foi possível enviar a solicitação.');
      console.error(error);
    } else {
      toast.success('Solicitação de ajuste enviada com sucesso ao Gestor/Admin!');
      setShowChamadoModal(false);
      setMotivo('');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (!apuracao) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-lg font-medium">Apuração não encontrada</p>
        <Link to="/historico"><Button variant="outline" className="mt-4">Voltar ao Histórico</Button></Link>
      </div>
    );
  }

  // Totals for edit mode
  const editTotalPI = editItens.reduce((s, i) => s + i.peso_inicial, 0);
  const editTotalPF = editItens.reduce((s, i) => s + i.peso_final, 0);
  const editTotalPerdaKg = editTotalPI - editTotalPF;
  const editMediaPerda = editTotalPI > 0 ? (editTotalPerdaKg / editTotalPI) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="flex items-center gap-4">
        <Link to="/historico"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="page-title flex items-center gap-3">
            Detalhe da Apuração
            {apuracao.numero_apuracao && (
              <span className="font-mono text-base text-primary bg-primary/10 px-2 py-0.5 rounded">
                #{apuracao.numero_apuracao}
              </span>
            )}
            <StatusBadge status={apuracao.status} />
          </h1>
          <p className="page-description">{apuracao.loja_nome} — {new Date(apuracao.data_apuracao).toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div className="ml-auto flex gap-2">
          {/* Loja user: can request adjustment */}
          {user?.perfil === 'loja' && apuracao.status !== 'rascunho' && (
             <Button variant="outline" onClick={() => setShowChamadoModal(true)} className="gap-2">
               <Send className="w-4 h-4" />
               Solicitar Ajuste
             </Button>
          )}
          {/* Admin/Gestor/Prevenção: can edit */}
          {canEdit && !editMode && (
            <Button variant="outline" onClick={handleStartEdit} className="gap-2">
              <Pencil className="w-4 h-4" />
              Editar Itens
            </Button>
          )}
          {canEdit && editMode && (
            <>
              <Button variant="ghost" onClick={handleCancelEdit} className="gap-2" disabled={saving}>
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Ajustes
              </Button>
            </>
          )}
        </div>
      </div>

      {showChamadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card w-full max-w-md p-6 rounded-xl shadow-lg border">
            <h3 className="text-lg font-bold mb-2">Solicitar Ajuste na Apuração</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A apuração <strong>já foi finalizada</strong>. Para fazer alterações, descreva o motivo e solicite a permissão de um Gestor e informe o campo e valor correto na descrição.
            </p>
            <textarea
              className="w-full flex min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none mb-4"
              placeholder="Ex: Pesei a picanha pela metade na desossa e finalizei sem querer. O peso real na balança foi 15.200kg."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowChamadoModal(false)} disabled={sendingChamado}>Cancelar</Button>
              <Button onClick={handleOpenChamado} disabled={sendingChamado}>
                {sendingChamado ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {apuracao.numero_apuracao && (
            <div className="col-span-2 md:col-span-4">
              <span className="text-muted-foreground block">Número Identificador</span>
              <span className="font-mono font-bold text-lg text-primary">{apuracao.numero_apuracao}</span>
            </div>
          )}
          <div><span className="text-muted-foreground block">Loja</span><span className="font-medium">{apuracao.loja_nome}</span></div>
          <div><span className="text-muted-foreground block">Data</span><span className="font-medium">{new Date(apuracao.data_apuracao).toLocaleDateString('pt-BR')}</span></div>
          <div><span className="text-muted-foreground block">Metodologia</span><span className="font-medium">{
             apuracao.tipo_apuracao === 'boi_no_osso' ? 'Boi no Osso' : 
             apuracao.tipo_apuracao === 'nota_10' ? 'Açougue Nota 10' : 
             apuracao.tipo_apuracao === 'embalada' ? 'Carne Embalada' : apuracao.tipo_apuracao
          }</span></div>
          <div><span className="text-muted-foreground block">Peso Carcaça</span><span className="font-medium">{Number(apuracao.peso_carcaca).toFixed(2)} kg</span></div>
          <div><span className="text-muted-foreground block">SIF</span><span className="font-medium">{apuracao.sif || '—'}</span></div>
          <div><span className="text-muted-foreground block">Responsável</span><span className="font-medium">{apuracao.responsavel}</span></div>
          <div><span className="text-muted-foreground block">Criado em</span><span className="font-medium">{new Date(apuracao.created_at).toLocaleString('pt-BR')}</span></div>
          <div><span className="text-muted-foreground block">Observações</span><span className="font-medium">{apuracao.observacoes || '—'}</span></div>
        </div>
      </div>

      {editMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center gap-2">
          <Pencil className="w-4 h-4 shrink-0" />
          <span><strong>Modo Edição Ativo</strong> — Ajuste os pesos e clique em "Salvar Ajustes". A perda será recalculada automaticamente.</span>
        </div>
      )}

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Peso Inicial</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Peso Final</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Perda (kg)</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Perda %</th>
            </tr>
          </thead>
          <tbody>
            {apuracao.itens.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum item registrado</td></tr>
            ) : editMode ? (
              editItens.map((item, idx) => (
                <tr key={idx} className={cn('border-b last:border-0', item.perda_percentual > 20 && 'bg-destructive/5')}>
                  <td className="p-3 font-mono text-xs">{item.corte_codigo}</td>
                  <td className="p-3">{item.corte_descricao}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.peso_inicial}
                      onChange={e => handleItemChange(idx, 'peso_inicial', e.target.value)}
                      className="w-28 text-right h-8 ml-auto"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.peso_final}
                      onChange={e => handleItemChange(idx, 'peso_final', e.target.value)}
                      className="w-28 text-right h-8 ml-auto"
                    />
                  </td>
                  <td className={cn('p-3 text-right font-medium', item.perda_percentual > 20 && 'text-destructive')}>{item.perda_kg.toFixed(3)}</td>
                  <td className={cn('p-3 text-right font-medium', item.perda_percentual > 20 && 'text-destructive')}>{item.perda_percentual.toFixed(2)}%</td>
                </tr>
              ))
            ) : (
              apuracao.itens.map((item, idx) => (
                <tr key={idx} className={cn('border-b last:border-0', item.perda_percentual > 20 && 'bg-destructive/5')}>
                  <td className="p-3 font-mono text-xs">{item.corte_codigo}</td>
                  <td className="p-3">{item.corte_descricao}</td>
                  <td className="p-3 text-right">{item.peso_inicial.toFixed(3)}</td>
                  <td className="p-3 text-right">{item.peso_final.toFixed(3)}</td>
                  <td className={cn('p-3 text-right font-medium', item.perda_percentual > 20 && 'text-destructive')}>{item.perda_kg.toFixed(3)}</td>
                  <td className={cn('p-3 text-right font-medium', item.perda_percentual > 20 && 'text-destructive')}>{item.perda_percentual.toFixed(2)}%</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-semibold border-t-2">
              <td className="p-3" colSpan={2}>Total</td>
              <td className="p-3 text-right">{editMode ? editTotalPI.toFixed(3) : Number(apuracao.total_peso_inicial).toFixed(3)} kg</td>
              <td className="p-3 text-right">{editMode ? editTotalPF.toFixed(3) : Number(apuracao.total_peso_final).toFixed(3)} kg</td>
              <td className="p-3 text-right">{editMode ? editTotalPerdaKg.toFixed(3) : Number(apuracao.total_perda_kg).toFixed(3)} kg</td>
              <td className="p-3 text-right">{editMode ? editMediaPerda.toFixed(2) : Number(apuracao.media_perda_percentual).toFixed(2)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
