import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Save, CheckCircle, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { novaApuracaoSchema } from '@/lib/schemas';

interface CorteRow {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  exige_peso_inicial: boolean;
  exige_peso_final: boolean;
  ordem: number;
  metodologia: 'boi_no_osso' | 'nota_10' | 'embalada';
}

interface LojaOption {
  id: string;
  nome: string;
  metodologia?: string[];
}

interface ItemState {
  corteId: string;
  corteCodigo: string;
  corteDescricao: string;
  pesoInicial: number;
  pesoFinal: number;
  perdaKg: number;
  perdaPercentual: number;
  exigePesoInicial: boolean;
  exigePesoFinal: boolean;
}

export default function NovaApuracaoPage() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [cortesDb, setCortesDb] = useState<CorteRow[]>([]);
  const [lojasDb, setLojasDb] = useState<LojaOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loja, setLoja] = useState(user?.lojaId || '');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<'boi_no_osso' | 'nota_10' | 'embalada'>('boi_no_osso');
  const [pesoCarcaca, setPesoCarcaca] = useState('');
  const [sif, setSif] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [itens, setItens] = useState<ItemState[]>([]);

  useEffect(() => {
    if (user?.lojaId && !loja) setLoja(user.lojaId);
    
    const load = async () => {
      const [cortesRes, lojasRes] = await Promise.all([
        supabase.from('cortes').select('*').eq('ativo', true).order('ordem'),
        supabase.from('lojas').select('id, nome, metodologia').eq('ativa', true).order('nome'),
      ]);
      const cortes = cortesRes.data || [];
      setCortesDb(cortes as CorteRow[]);
      
      const lojas = (lojasRes.data || []) as unknown as LojaOption[];
      setLojasDb(lojas);
      
      // Se tiver loja vinculada ao usuário, fixa como principal
      if (user?.lojaId) {
        setLoja(user.lojaId);
        
        // Timer de atraso pra evitar race conditions do render (garantindo que dropdown leia o estado novo)
        setTimeout(() => {
          const minhaLoja = lojas.find(l => l.id === user.lojaId);
          if (minhaLoja?.metodologia && minhaLoja.metodologia.length > 0) {
            setTipo(minhaLoja.metodologia[0] as any);
          }
        }, 50);
      }

      setLoadingData(false);
    };
    load();
  }, [user]);

  // Toda vez que mudar a metodologia (tipo), refaz a tabela de itens vazia para aquela metodologia.
  useEffect(() => {
    if (cortesDb.length > 0) {
      const cortesFiltrados = cortesDb.filter(c => c.metodologia === tipo);
      setItens(cortesFiltrados.map(c => ({
        corteId: c.id,
        corteCodigo: c.codigo,
        corteDescricao: c.descricao,
        pesoInicial: 0, pesoFinal: 0, perdaKg: 0, perdaPercentual: 0,
        exigePesoInicial: c.exige_peso_inicial,
        exigePesoFinal: c.exige_peso_final,
      })));
    }
  }, [tipo, cortesDb]);

  const updateItem = (idx: number, field: 'pesoInicial' | 'pesoFinal', value: string) => {
    const val = parseFloat(value) || 0;
    setItens(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      updated.perdaKg = +(updated.pesoInicial - updated.pesoFinal).toFixed(3);
      updated.perdaPercentual = updated.pesoInicial > 0
        ? +((updated.perdaKg / updated.pesoInicial) * 100).toFixed(2)
        : 0;
      return updated;
    }));
  };

  const totals = useMemo(() => {
    const pi = +itens.reduce((s, i) => s + i.pesoInicial, 0).toFixed(3);
    const pf = +itens.reduce((s, i) => s + i.pesoFinal, 0).toFixed(3);
    const pk = +(pi - pf).toFixed(3);
    const mp = pi > 0 ? +((pk / pi) * 100).toFixed(2) : 0;
    return { pi, pf, pk, mp };
  }, [itens]);

  const handleSave = async (status: 'rascunho' | 'finalizada') => {
    // Validação com Zod
    const validation = novaApuracaoSchema.safeParse({
      loja_id: loja,
      data_apuracao: data,
      tipo_apuracao: tipo,
      peso_carcaca: pesoCarcaca ? parseFloat(pesoCarcaca) : undefined,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }
    if (!session?.user?.id) { toast.error('Sessão expirada.'); return; }

    setSaving(true);

    const { data: apuracao, error: apuracaoError } = await supabase
      .from('apuracoes')
      .insert({
        loja_id: loja,
        user_id: session.user.id,
        data_apuracao: data,
        tipo_apuracao: tipo,
        peso_carcaca: parseFloat(pesoCarcaca) || 0,
        sif: sif || null,
        observacoes: observacoes || null,
        responsavel: user?.nome || session.user.email || '',
        status,
        total_peso_inicial: totals.pi,
        total_peso_final: totals.pf,
        total_perda_kg: totals.pk,
        media_perda_percentual: totals.mp,
      })
      .select('id')
      .single();

    if (apuracaoError) {
      setSaving(false);
      toast.error('Erro ao salvar apuração: ' + apuracaoError.message);
      return;
    }

    // Insert items that have data
    const itensComDados = itens.filter(i => i.pesoInicial > 0 || i.pesoFinal > 0);
    if (itensComDados.length > 0) {
      const { error: itensError } = await supabase.from('itens_apuracao').insert(
        itensComDados.map(i => ({
          apuracao_id: apuracao.id,
          corte_id: i.corteId,
          corte_codigo: i.corteCodigo,
          corte_descricao: i.corteDescricao,
          peso_inicial: i.pesoInicial,
          peso_final: i.pesoFinal,
          perda_kg: i.perdaKg,
          perda_percentual: i.perdaPercentual,
        }))
      );
      if (itensError) {
        setSaving(false);
        toast.error('Erro ao salvar itens: ' + itensError.message);
        return;
      }
    }

    setSaving(false);
    toast.success(status === 'rascunho' ? 'Rascunho salvo!' : 'Apuração finalizada!');
    navigate('/historico');
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="page-header">
        <h1 className="page-title">Nova Apuração</h1>
        <p className="page-description">Preencha os dados da apuração de açougue</p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Dados da Apuração</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Loja</Label>
            <Select
              value={loja}
              onValueChange={setLoja}
              disabled={!!user?.lojaId || user?.perfil === 'loja'}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione a loja" />
              </SelectTrigger>
              <SelectContent>
                {lojasDb.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data da Apuração</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Metodologia</Label>
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as typeof tipo)}
              disabled={user?.perfil === 'loja' && lojasDb.find(l => l.id === loja)?.metodologia?.length === 1}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(!loja || !lojasDb.find(l => l.id === loja)?.metodologia?.length) ? (
                  <>
                    <SelectItem value="boi_no_osso">Boi no Osso</SelectItem>
                    <SelectItem value="nota_10">Açougue Nota 10</SelectItem>
                    <SelectItem value="embalada">Carne Embalada</SelectItem>
                  </>
                ) : (
                  lojasDb.find(l => l.id === loja)?.metodologia?.map(met => (
                    <SelectItem key={met} value={met}>
                      {met === 'boi_no_osso' ? 'Boi no Osso' : met === 'nota_10' ? 'Açougue Nota 10' : 'Carne Embalada'}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Peso da Carcaça (kg)</Label>
            <Input type="number" step="0.01" placeholder="0,00" value={pesoCarcaca} onChange={e => setPesoCarcaca(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>SIF</Label>
            <Input placeholder="Número do SIF" value={sif} onChange={e => setSif(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Observações</Label>
            <Input placeholder="Observações gerais" value={observacoes} onChange={e => setObservacoes(e.target.value)} className="mt-1.5" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-5 border-b">
          <h2 className="text-sm font-semibold text-foreground">Tabela de Cortes</h2>
          <p className="text-xs text-muted-foreground mt-1">Preencha os pesos iniciais e finais de cada corte</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground w-20">Código</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-right p-3 font-medium text-muted-foreground w-32">Peso Inicial</th>
                <th className="text-right p-3 font-medium text-muted-foreground w-32">Peso Final</th>
                <th className="text-right p-3 font-medium text-muted-foreground w-28">Perda (kg)</th>
                <th className="text-right p-3 font-medium text-muted-foreground w-28">Perda %</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => {
                const highLoss = item.perdaPercentual > 20;
                const negativeLoss = item.perdaKg < 0;
                return (
                  <tr key={item.corteId} className={cn('border-b last:border-0 transition-colors', highLoss && 'bg-destructive/5', negativeLoss && 'bg-warning/5')}>
                    <td className="p-3 font-mono text-xs">{item.corteCodigo}</td>
                    <td className="p-3 text-xs">{item.corteDescricao}</td>
                    <td className="p-3">
                      <Input
                        type="number" step="0.01" min="0" placeholder="0,00"
                        className="text-right h-8 text-sm"
                        disabled={!item.exigePesoInicial}
                        onChange={e => updateItem(idx, 'pesoInicial', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="number" step="0.01" min="0" placeholder="0,00"
                        className="text-right h-8 text-sm"
                        disabled={!item.exigePesoFinal}
                        onChange={e => updateItem(idx, 'pesoFinal', e.target.value)}
                      />
                    </td>
                    <td className={cn('p-3 text-right font-medium', highLoss && 'text-destructive', negativeLoss && 'text-warning')}>
                      {item.perdaKg.toFixed(3)}
                    </td>
                    <td className={cn('p-3 text-right font-medium', highLoss && 'text-destructive', negativeLoss && 'text-warning')}>
                      {item.perdaPercentual.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold border-t-2">
                <td className="p-3" colSpan={2}>Totalizadores</td>
                <td className="p-3 text-right">{totals.pi.toFixed(3)} kg</td>
                <td className="p-3 text-right">{totals.pf.toFixed(3)} kg</td>
                <td className={cn('p-3 text-right', totals.mp > 15 && 'text-destructive')}>{totals.pk.toFixed(3)} kg</td>
                <td className={cn('p-3 text-right', totals.mp > 15 && 'text-destructive')}>{totals.mp.toFixed(2)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate('/historico')} disabled={saving}><X className="h-4 w-4 mr-2" />Cancelar</Button>
        <Button variant="secondary" onClick={() => handleSave('rascunho')} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Rascunho
        </Button>
        <Button onClick={() => handleSave('finalizada')} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Finalizar Apuração
        </Button>
      </div>
    </div>
  );
}
