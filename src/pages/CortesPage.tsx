import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCortes, createCorte, updateCorteDescricao, toggleCorteAtivo, deleteCorte, type CorteRow } from '@/services/corteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CortesPage() {
  const { user } = useAuth();
  const canManage = user?.perfil === 'admin' || user?.perfil === 'gestor';
  const queryClient = useQueryClient();

  const { data: lista = [], isLoading: loading } = useQuery({ queryKey: ['cortes'], queryFn: fetchCortes });

  const [editId, setEditId] = useState<string | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'boi_no_osso' | 'nota_10' | 'embalada'>('boi_no_osso');
  const [showModal, setShowModal] = useState(false);
  const [novoCorte, setNovoCorte] = useState({
    codigo: '',
    descricao: '',
    categoria: 'dianteiro',
    exige_peso_inicial: true,
    exige_peso_final: true,
  });

  const handleEdit = (c: CorteRow) => {
    setEditId(c.id);
    setEditDescricao(c.descricao);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editDescricao) return;
    setSaving(true);
    try {
      await updateCorteDescricao(editId, editDescricao);
      toast.success('Corte atualizado!');
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['cortes'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (c: CorteRow) => {
    if (!canManage) return;
    try {
      await toggleCorteAtivo(c.id, !c.ativo);
      toast.success(c.ativo ? 'Corte inativado' : 'Corte ativado');
      queryClient.invalidateQueries({ queryKey: ['cortes'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteCorte = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este corte permanentemente? Ele será apagado do banco de dados.')) return;
    try {
      await deleteCorte(id);
      toast.success('Corte excluído!');
      queryClient.invalidateQueries({ queryKey: ['cortes'] });
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message);
    }
  };

  const handleAddCorte = async () => {
    if (!novoCorte.codigo || !novoCorte.descricao) {
      toast.error('Preencha código e descrição.');
      return;
    }
    
    // Find the max ordem for the current methodology
    const cortesAtuais = lista.filter(c => c.metodologia === activeTab);
    const maxOrdem = cortesAtuais.reduce((max, c) => Math.max(max, c.ordem), 0);

    setSaving(true);
    try {
      const cortesAtuais = lista.filter(c => c.metodologia === activeTab);
      const maxOrdem = cortesAtuais.reduce((max, c) => Math.max(max, c.ordem), 0);
      await createCorte({
        codigo: novoCorte.codigo,
        descricao: novoCorte.descricao,
        categoria: novoCorte.categoria,
        exige_peso_inicial: novoCorte.exige_peso_inicial,
        exige_peso_final: novoCorte.exige_peso_final,
        ordem: maxOrdem + 1,
        metodologia: activeTab,
      });
      toast.success('Corte adicionado com sucesso!');
      setShowModal(false);
      setNovoCorte({ codigo: '', descricao: '', categoria: 'dianteiro', exige_peso_inicial: true, exige_peso_final: true });
      queryClient.invalidateQueries({ queryKey: ['cortes'] });
    } catch (e: any) {
      toast.error('Erro ao adicionar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const filteredLista = lista.filter(c => c.metodologia === activeTab);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="page-title">Catálogo de Cortes</h1>
          <p className="page-description">{filteredLista.length} cortes cadastrados nesta metodologia</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Corte
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border mb-4">
        {[
          { id: 'boi_no_osso', label: 'Boi no Osso' },
          { id: 'nota_10', label: 'Açougue Nota 10' },
          { id: 'embalada', label: 'Carne Embalada' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2 border-b-2 font-medium text-sm transition-colors",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium text-muted-foreground">Ordem</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Descrição</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Categoria</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Peso Inicial</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Peso Final</th>
              <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
              {canManage && <th className="text-center p-3 font-medium text-muted-foreground w-28">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLista.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum corte cadastrado nesta metodologia.
                </td>
              </tr>
            ) : (
              filteredLista.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3">{c.ordem}</td>
                  <td className="p-3 font-mono">{c.codigo}</td>
                  <td className="p-3">
                    {editId === c.id ? (
                      <div className="flex gap-2 items-center">
                        <Input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="h-8 text-sm" />
                        <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>×</Button>
                      </div>
                    ) : c.descricao}
                  </td>
                  <td className="p-3 capitalize">{c.categoria}</td>
                  <td className="p-3 text-center">{c.exige_peso_inicial ? '✓' : '—'}</td>
                  <td className="p-3 text-center">{c.exige_peso_final ? '✓' : '—'}</td>
                  <td className="p-3 text-center">
                    {canManage ? (
                      <button onClick={() => handleToggleAtivo(c)}>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer', c.ativo ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground')}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </button>
                    ) : (
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', c.ativo ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground')}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10" onClick={() => handleDeleteCorte(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Novo Corte {
              activeTab === 'boi_no_osso' ? '(Boi no Osso)' : 
              activeTab === 'nota_10' ? '(Açougue Nota 10)' : '(Carne Embalada)'
            }</h2>
            
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input 
                  value={novoCorte.codigo} 
                  onChange={e => setNovoCorte({...novoCorte, codigo: e.target.value})} 
                  className="mt-1"
                  placeholder="Ex: 1059"
                  autoFocus
                />
              </div>
              
              <div>
                <Label>Descrição</Label>
                <Input 
                  value={novoCorte.descricao} 
                  onChange={e => setNovoCorte({...novoCorte, descricao: e.target.value})} 
                  className="mt-1"
                  placeholder="Ex: ACEM BOVINO"
                />
              </div>
              
              <div>
                <Label>Categoria</Label>
                <select 
                  value={novoCorte.categoria}
                  onChange={e => setNovoCorte({...novoCorte, categoria: e.target.value})}
                  className="mt-1 w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="dianteiro">Dianteiro</option>
                  <option value="traseiro">Traseiro</option>
                  <option value="suino">Suíno</option>
                  <option value="bovino">Bovino</option>
                </select>
              </div>
              
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={novoCorte.exige_peso_inicial}
                    onChange={e => setNovoCorte({...novoCorte, exige_peso_inicial: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Exige Peso Inicial
                </label>
                <label className="flex items-center gap-2 text-sm select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={novoCorte.exige_peso_final}
                    onChange={e => setNovoCorte({...novoCorte, exige_peso_final: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Exige Peso Final
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleAddCorte} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Salvar Corte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
