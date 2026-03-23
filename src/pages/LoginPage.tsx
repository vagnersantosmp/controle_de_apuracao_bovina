import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Beef, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

export default function LoginPage() {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register States
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [lojaId, setLojaId] = useState('');
  const [lojas, setLojas] = useState<{id: string, nome: string}[]>([]);
  
  // Common States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch Lojas for Registration Dropdown
  const fetchLojas = async () => {
    const { data } = await supabase.from('lojas').select('id, nome').eq('ativa', true).order('nome');
    if (data) setLojas(data);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {setError('Informe o e-mail');return;}
    if (!password) {setError('Informe a senha');return;}
    
    setLoading(true);
    setError('');
    
    const result = await login(email, password);
    setLoading(false);
    
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Credenciais inválidas');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {setError('Informe o seu nome completo');return;}
    if (!lojaId) {setError('Selecione a sua loja');return;}
    if (!email) {setError('Informe o e-mail');return;}
    if (password.length < 8) {setError('A senha deve ter no mínimo 8 caracteres');return;}
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    const result = await signUp(email, password, nome, lojaId);
    setLoading(false);
    
    if (result.success) {
      setSuccess('Conta criada com sucesso! Você já pode fazer login no sistema.');
      setIsRegistering(false);
      setPassword('');
    } else {
      setError(result.error || 'Ocorreu um erro ao criar a conta.');
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setSuccess('');
    if (!isRegistering && lojas.length === 0) {
      fetchLojas();
    }
  };

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <Beef className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-primary-foreground">Gestão Açougue</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Controle total da<br />apuração de açougue
          </h2>
          <p className="text-primary-foreground/70 max-w-md">Sistema integrado para gestão de apurações, controle de rendimento e prevenção de perdas no setor de açougue
          </p>
        </div>
        <p className="text-primary-foreground/40 text-sm">© 2026 - Desenvolvido por Vagner Santos</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Beef className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Gestão Açougue</span>
          </div>

          <div className="bg-card rounded-xl shadow-sm border p-8">
            <h1 className="text-xl font-bold text-foreground mb-1">
              {isRegistering ? 'Criar sua conta' : 'Entrar no sistema'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {isRegistering ? 'Preencha seus dados para se cadastrar' : 'Informe suas credenciais para acessar'}
            </p>

            {error &&
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                {error}
              </div>
            }
            
            {success &&
              <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm border border-success/20">
                {success}
              </div>
            }

            {isRegistering ? (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" type="text" placeholder="Seu nome" value={nome} onChange={(e) => {setNome(e.target.value);setError('');}} className="mt-1.5" />
                </div>
                
                <div>
                  <Label htmlFor="loja">Sua Loja base</Label>
                  <select 
                    id="loja"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5" 
                    value={lojaId} 
                    onChange={e => {setLojaId(e.target.value); setError('');}}
                  >
                    <option value="">Selecione uma loja...</option>
                    {lojas.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="email-reg">E-mail</Label>
                  <Input id="email-reg" type="email" placeholder="seu@email.com.br" value={email} onChange={(e) => {setEmail(e.target.value);setError('');}} className="mt-1.5" />
                </div>
                
                <div>
                  <Label htmlFor="password-reg">Senha</Label>
                  <div className="relative mt-1.5">
                    <Input id="password-reg" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => {setPassword(e.target.value);setError('');}} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Mínimo 8 caracteres</p>
                </div>
                
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Cadastrando...' : 'Criar conta'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com.br" value={email} onChange={(e) => {setEmail(e.target.value);setError('');}} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative mt-1.5">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => {setPassword(e.target.value);setError('');}} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
                
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground cursor-pointer hover:underline mb-3">Esqueceu a senha?</p>
                </div>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-border flex flex-col items-center">
              <p className="text-sm text-muted-foreground">
                {isRegistering ? 'Já possui uma conta?' : 'Uma loja nova na rede?'}
              </p>
              <Button variant="link" onClick={toggleMode} className="mt-1 h-auto p-0">
                {isRegistering ? 'Fazer login' : 'Criar uma conta para minha loja'}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );

}