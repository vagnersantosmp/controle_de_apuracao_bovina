import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, toggleUserAtivo, deleteUser, updateUserProfile, upsertUserRole, invokeCreateUser, invokeUpdateUser, type UserRow, type AppRole } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Search, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  loja: 'Loja',
  gestor: 'Gestor',
  prevencao: 'Prevenção',
};

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading: loading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const users = data?.users ?? [];
  const lojas = data?.lojas ?? [];

  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPerfil, setFormPerfil] = useState<AppRole>('loja');
  const [formLojaId, setFormLojaId] = useState('');

  const resetForm = () => {
    setFormNome('');
    setFormEmail('');
    setFormPassword('');
    setFormPerfil('loja');
    setFormLojaId('');
    setEditId(null);
  };

  const handleEdit = (u: UserRow) => {
    setEditId(u.user_id);
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormPerfil(u.role || 'loja');
    setFormLojaId(u.loja_id || '');
    setFormPassword(''); // a senha não é mostrada por segurança, e se voltar vazia não altera
    setShowForm(true);
  };

  const handleToggleAtiva = async (u: UserRow) => {
    try {
      await toggleUserAtivo(u.id, !u.ativo);
      toast.success(u.ativo ? 'Usuário inativado' : 'Usuário ativado');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${u.nome}? Essa ação excluirá seu perfil do painel.`)) return;
    try {
      await deleteUser(u.user_id);
      toast.success('Usuário removido da listagem.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      toast.error('Erro ao excluir usuário: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!formNome || !formEmail || !formPassword) {
      toast.error('Preencha nome, e-mail e senha.');
      return;
    }
    if (formPerfil === 'loja' && !formLojaId) {
      toast.error('Selecione a loja vinculada.');
      return;
    }

    setSaving(true);
    
    try {
      if (editId) {
        // Editar usuário existente
        if (formPassword && formPassword.length < 6) {
          toast.error('A senha deve ter no mínimo 6 caracteres.');
          setSaving(false); return;
        }

        await updateUserProfile(editId, formNome, formPerfil === 'loja' ? formLojaId : null);

        // Update Auth credentials if provided
        if (formEmail || formPassword) {
          await invokeUpdateUser({
            user_id: editId,
            ...(formEmail ? { email: formEmail } : {}),
            ...(formPassword ? { password: formPassword } : {}),
          });
        }

        await upsertUserRole(editId, formPerfil);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        if (!formPassword) {
          toast.error('Preencha a senha para novos usuários.');
          setSaving(false); return;
        }
        
        await invokeCreateUser({
          nome: formNome,
          email: formEmail,
          password: formPassword,
          perfil: formPerfil,
          loja_id: formPerfil === 'loja' ? formLojaId : null,
        });
        toast.success('Usuário cadastrado com sucesso!');
      }

      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    u => u.nome.toLowerCase().includes(busca.toLowerCase()) || u.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Gestão de Usuários</h1>
          <p className="page-description">{users.length} usuários cadastrados</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); if (!showForm) resetForm(); }}>
          <Plus className="h-4 w-4 mr-2" />Novo Usuário
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-sm font-semibold mb-4">Cadastrar Novo Usuário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome completo" className="mt-1.5" value={formNome} onChange={e => setFormNome(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@rede.com.br" className="mt-1.5" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            </div>
            <div>
              <Label>{editId ? 'Nova Senha (opcional)' : 'Senha'}</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" className="mt-1.5" value={formPassword} onChange={e => setFormPassword(e.target.value)} />
            </div>
            <div>
              <Label>Perfil</Label>
              <select value={formPerfil} onChange={e => setFormPerfil(e.target.value as AppRole)} className="mt-1.5 w-full h-10 px-3 rounded-md border bg-background text-sm">
                <option value="admin">Administrador</option>
                <option value="loja">Loja</option>
                <option value="gestor">Gestor</option>
                <option value="prevencao">Prevenção</option>
              </select>
            </div>
            {formPerfil === 'loja' && (
              <div>
                <Label>Loja vinculada *</Label>
                <select value={formLojaId} onChange={e => setFormLojaId(e.target.value)} className="mt-1.5 w-full h-10 px-3 rounded-md border bg-background text-sm">
                  <option value="">Selecione</option>
                  {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
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
          <Input placeholder="Buscar usuário..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
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
                <th className="text-left p-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-3 font-medium text-muted-foreground">E-mail</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Perfil</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Loja</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{u.nome}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{roleLabels[u.role || 'loja']}</td>
                    <td className="p-3">{u.loja_nome}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleToggleAtiva(u)}>
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80', u.ativo ? 'bg-success/15 text-success border-success/30' : 'bg-muted text-muted-foreground')}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(u)}>
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
