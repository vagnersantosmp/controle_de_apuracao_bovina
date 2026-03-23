import { Beef, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-description">Preferências e dados institucionais</p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Dados da Empresa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Nome da Empresa</Label><Input defaultValue="Rede de Supermercados" className="mt-1.5" /></div>
          <div><Label>CNPJ</Label><Input defaultValue="00.000.000/0001-00" className="mt-1.5" /></div>
          <div><Label>Razão Social</Label><Input defaultValue="Rede de Supermercados Ltda." className="mt-1.5" /></div>
          <div><Label>Telefone</Label><Input defaultValue="(11) 3000-0000" className="mt-1.5" /></div>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Beef className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Sistema</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Nome do Sistema</Label><Input defaultValue="Gestão de Apuração Açougue" className="mt-1.5" readOnly /></div>
          <div><Label>Versão</Label><Input defaultValue="1.0.0" className="mt-1.5" readOnly /></div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">
            <strong>Integrações futuras:</strong> Este sistema está preparado para integração com banco de dados, autenticação real e exportação de relatórios.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success('Configurações salvas!')}>Salvar Configurações</Button>
      </div>
    </div>
  );
}
