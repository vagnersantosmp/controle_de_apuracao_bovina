import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import NovaApuracaoPage from "./pages/NovaApuracaoPage";
import HistoricoPage from "./pages/HistoricoPage";
import DetalheApuracaoPage from "./pages/DetalheApuracaoPage";
import RelatoriosPage from "./pages/RelatoriosPage";
import LojasPage from "./pages/LojasPage";
import UsuariosPage from "./pages/UsuariosPage";
import CortesPage from "./pages/CortesPage";
import ConfiguracoesPage from "./pages/ConfiguracoesPage";
import ChamadosPage from "./pages/ChamadosPage";
import PresentationsPage from "./pages/PresentationsPage";
import NotFound from "./pages/NotFound";
import MinhaContaPage from "./pages/MinhaContaPage";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.perfil)) return <Navigate to="/dashboard" />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/nova-apuracao" element={<ProtectedRoute roles={['admin', 'loja']}><NovaApuracaoPage /></ProtectedRoute>} />
      <Route path="/historico" element={<ProtectedRoute><HistoricoPage /></ProtectedRoute>} />
      <Route path="/apuracao/:id" element={<ProtectedRoute><DetalheApuracaoPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute roles={['admin', 'gestor', 'prevencao']}><RelatoriosPage /></ProtectedRoute>} />
      <Route path="/apresentacoes" element={<ProtectedRoute roles={['admin', 'gestor', 'prevencao']}><PresentationsPage /></ProtectedRoute>} />
      <Route path="/lojas" element={<ProtectedRoute roles={['admin']}><LojasPage /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><UsuariosPage /></ProtectedRoute>} />
      <Route path="/cortes" element={<ProtectedRoute roles={['admin']}><CortesPage /></ProtectedRoute>} />
      <Route path="/chamados" element={<ProtectedRoute roles={['admin', 'loja', 'gestor', 'prevencao']}><ChamadosPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute roles={['admin']}><ConfiguracoesPage /></ProtectedRoute>} />
      <Route path="/minha-conta" element={<ProtectedRoute><MinhaContaPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
