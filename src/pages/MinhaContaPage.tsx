import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, User, Loader2 } from 'lucide-react';

export default function MinhaContaPage() {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [saving, setSaving] = useState(false);

  const handleTrocarSenha = async () => {
    if (!novaSenha || !confirmarSenha) {
      toast.error('Preencha a nova senha e a confirmação.');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('A nova senha e a confirmação não coincidem.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSaving(false);

    if (error) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } else {
      toast.success('Senha alterada com sucesso! 🔐');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    loja: 'Loja',
    gestor: 'Gestor',
    prevencao: 'Prevenção de Perdas',
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Minha Conta</h1>
        <p className="page-description">Dados do seu perfil e segurança</p>
      </div>

      {/* Dados do usuário */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Dados do Perfil</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome</Label>
            <Input value={user?.nome || ''} readOnly className="mt-1.5 bg-muted/40" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={user?.email || ''} readOnly className="mt-1.5 bg-muted/40" />
          </div>
          <div>
            <Label>Perfil de Acesso</Label>
            <Input value={roleLabels[user?.perfil || ''] || user?.perfil || ''} readOnly className="mt-1.5 bg-muted/40" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Para alterar seu nome ou e-mail, solicite ao Administrador do sistema.
        </p>
      </div>

      {/* Alterar Senha */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-5">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Alterar Senha</h2>
        </div>
        <div className="space-y-4 max-w-sm">
          <div>
            <Label>Nova Senha</Label>
            <Input
              id="nova-senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Confirmar Nova Senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button onClick={handleTrocarSenha} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </div>
      </div>
    </div>
  );
}
