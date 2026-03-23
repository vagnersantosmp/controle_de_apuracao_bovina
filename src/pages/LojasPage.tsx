import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLojas, createLoja, updateLoja, toggleLojaAtiva, deleteLoja, type LojaRow } from '@/services/lojaService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Search, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { lojaSchema } from '@/lib/schemas';

export default function LojasPage() {
  const queryClient = useQueryClient();
  const { data: lojasList = [], isLoading: loading } = useQuery({ queryKey: ['lojas'], queryFn: fetchLojas });

  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formCodigo, setFormCodigo] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formCidade, setFormCidade] = useState('');
  const [formUf, setFormUf] = useState('');
  const [formMetodologias, setFormMetodologias] = useState<Array<'boi_no_osso' | 'nota_10' | 'embalada'>>(['boi_no_osso']);

  const resetForm = () => {
    setFormCodigo(''); setFormNome(''); setFormCidade(''); setFormUf(''); setFormMetodologias(['boi_no_osso']);
    setEditId(null);
  };

  const handleMetodologiaChange = (valor: 'boi_no_osso' | 'nota_10' | 'embalada') => {
    setFormMetodologias(prev => 
      prev.includes(valor) 
        ? prev.filter(v => v !== valor) 
        : [...prev, valor]
    );
  };

  const handleSave = async () => {
    // Validação com Zod
    const validation = lojaSchema.safeParse({
      codigo: formCodigo,
      nome: formNome,
      cidade: formCidade,
      uf: formUf,
      metodologia: formMetodologias,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    setSaving(true);
    try {
      const input = { codigo: formCodigo, nome: formNome, cidade: formCidade, uf: formUf, metodologia: formMetodologias };
      if (editId) {
        await updateLoja(editId, input);
        toast.success('Loja atualizada!');
      } else {
        await createLoja(input);
        toast.success('Loja cadastrada!');
      }
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (l: LojaRow) => {
    setEditId(l.id);
    setFormCodigo(l.codigo);
    setFormNome(l.nome);
    setFormCidade(l.cidade);
    setFormUf(l.uf);
    setFormMetodologias(l.metodologia || []);
    setShowForm(true);
  };

  const handleToggleAtiva = async (l: LojaRow) => {
    try {
      await toggleLojaAtiva(l.id, !l.ativa);
      toast.success(l.ativa ? 'Loja inativada' : 'Loja ativada');
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (l: LojaRow) => {
    if (!confirm(`Tem certeza que deseja excluir a loja ${l.nome}? Todos os usuários vinculados a ela poderão perder acesso e os relatórios futuros podem ficar incompletos.`)) return;
    try {
      await deleteLoja(l.id);
      toast.success('Loja excluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
    } catch (e: any) {
      toast.error('Erro ao excluir loja: ' + e.message);
    }
  };

  const filtered = lojasList.filter(l =>
    l.nome.toLowerCase().includes(busca.toLowerCase()) ||
    l.cidade.toLowerCase().includes(busca.toLowerCase()) ||
    l.codigo.includes(busca)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Gestão de Lojas</h1>
          <p className="page-description">{lojasList.length} lojas cadastradas</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}>
          <Plus className="h-4 w-4 mr-2" />Nova Loja
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-sm font-semibold mb-4">{editId ? 'Editar Loja' : 'Cadastrar Nova Loja'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>Código</Label><Input placeholder="Ex: 01" className="mt-1.5" value={formCodigo} onChange={e => setFormCodigo(e.target.value)} /></div>
            <div><Label>Nome</Label><Input placeholder="Nome da loja" className="mt-1.5" value={formNome} onChange={e => setFormNome(e.target.value)} /></div>
            <div><Label>Cidade</Label><Input placeholder="Cidade" className="mt-1.5" value={formCidade} onChange={e => setFormCidade(e.target.value)} /></div>
            <div><Label>UF</Label><Input placeholder="UF" maxLength={2} className="mt-1.5" value={formUf} onChange={e => setFormUf(e.target.value)} /></div>
          </div>
          
          <div className="mt-4">
            <Label className="mb-2 block">Metodologias Aplicadas</Label>
            <div className="flex flex-wrap gap-4 p-3 border rounded-md bg-muted/20">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  checked={formMetodologias.includes('boi_no_osso')} onChange={() => handleMetodologiaChange('boi_no_osso')} />
                <span className="text-sm font-medium">Boi no osso</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  checked={formMetodologias.includes('nota_10')} onChange={() => handleMetodologiaChange('nota_10')} />
                <span className="text-sm font-medium">Açougue nota 10</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  checked={formMetodologias.includes('embalada')} onChange={() => handleMetodologiaChange('embalada')} />
                <span className="text-sm font-medium">Carne Embalada</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar loja..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Código</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Cidade</th>
                <th className="text-left p-3 font-medium text-muted-foreground">UF</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Metodologia</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma loja encontrada</td></tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono">{l.codigo}</td>
                    <td className="p-3">{l.nome}</td>
                    <td className="p-3">{l.cidade}</td>
                    <td className="p-3">{l.uf}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {l.metodologia?.map(met => (
                          <span key={met} className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-primary/10 text-primary border border-primary/20">
                            {met === 'boi_no_osso' ? 'Boi no osso' : met === 'nota_10' ? 'Açougue nota 10' : 'Carne Embalada'}
                          </span>
                        ))}
                        {(!l.metodologia || l.metodologia.length === 0) && (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleToggleAtiva(l)}>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer', l.ativa ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground')}>
                          {l.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(l)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(l)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
