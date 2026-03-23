import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FilePlus, History, BarChart3,
  Store, Users, Beef, Settings, LogOut, ChevronLeft, Menu, MonitorPlay,
  Sun, Moon, UserCircle2
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';

type AppRole = 'admin' | 'loja' | 'gestor' | 'prevencao';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'loja', 'gestor', 'prevencao'] },
  { label: 'Nova Apuração', path: '/nova-apuracao', icon: FilePlus, roles: ['admin', 'loja'] },
  { label: 'Histórico', path: '/historico', icon: History, roles: ['admin', 'loja', 'gestor', 'prevencao'] },
  { label: 'Relatórios', path: '/relatorios', icon: BarChart3, roles: ['admin', 'gestor', 'prevencao'] },
  { label: 'Apresentações', path: '/apresentacoes', icon: MonitorPlay, roles: ['admin', 'gestor', 'prevencao'] },
  { label: 'Painel de Chamados', path: '/chamados', icon: History, roles: ['admin', 'loja', 'gestor', 'prevencao'] },
  { label: 'Lojas', path: '/lojas', icon: Store, roles: ['admin'] },
  { label: 'Usuários', path: '/usuarios', icon: Users, roles: ['admin'] },
  { label: 'Catálogo de Cortes', path: '/cortes', icon: Beef, roles: ['admin'] },
  { label: 'Configurações', path: '/configuracoes', icon: Settings, roles: ['admin'] },
  { label: 'Minha Conta', path: '/minha-conta', icon: UserCircle2, roles: ['admin', 'loja', 'gestor', 'prevencao'] },
];

const profileLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  loja: 'Loja',
  gestor: 'Gestor',
  prevencao: 'Prevenção de Perdas',
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const filteredNav = navItems.filter(item => item.roles.includes(user.perfil));

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Beef className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-accent-foreground truncate">Gestão Açougue</h1>
              <p className="text-xs text-sidebar-muted truncate">Apuração & Controle</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-sidebar-muted">Perfil: {profileLabels[user.perfil]}</p>
          </div>
        )}
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        {!collapsed && (
          <div className="mt-4 px-3 text-center">
            <p className="text-[10px] text-sidebar-muted">2026 - Desenvolvido por Vagner Santos</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background print:bg-white print:block">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 shrink-0 sticky top-0 h-screen print:hidden',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-foreground/50" />
          <aside className="relative w-64 h-full flex flex-col bg-sidebar" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 print:block">
        {/* Header */}
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
              <Menu className="h-5 w-5" />
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:block p-1.5 rounded-md hover:bg-muted">
              <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user.nome}</p>
              <p className="text-xs text-muted-foreground">{profileLabels[user.perfil]}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">{user.nome.charAt(0)}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto print:overflow-visible print:p-0 print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
