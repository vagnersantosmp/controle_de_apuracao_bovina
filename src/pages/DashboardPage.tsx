import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Database, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

// BI Components
import { useDashboardData } from './dashboard/useDashboardData';
import { DashboardFilters } from './dashboard/DashboardFilters';
import { DashboardKPIs } from './dashboard/DashboardKPIs';
import { DashboardCharts } from './dashboard/DashboardCharts';
import { DashboardTable } from './dashboard/DashboardTable';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSeedData } from './dashboard/useSeedData';

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Options for filters
  const [lojasOptions, setLojasOptions] = useState<{ id: string; nome: string; codigo: string }[]>([]);
  const [cortesOptions, setCortesOptions] = useState<{ id: string; descricao: string; codigo?: string }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  // Hook handles data fetching and calculations based on the filters
  const { data, loading, filters, setFilters, refetch } = useDashboardData(user);

  // Use new hook to handle seed data
  const { seeding, cleaning, handleSeedData, handleCleanData } = useSeedData(
    user, lojasOptions, cortesOptions, refetch
  );

  useEffect(() => {
    const loadOptions = async () => {
      const [lojasRes, cortesRes] = await Promise.all([
        supabase.from('lojas').select('id, codigo, nome').eq('ativa', true),
        supabase.from('cortes').select('id, descricao, codigo').eq('ativo', true).order('descricao')
      ]);
      setLojasOptions(lojasRes.data || []);
      setCortesOptions(cortesRes.data || []);
      setOptionsLoading(false);
    };
    loadOptions();
  }, []);

  if (!user) return null;
  const isGlobalAdmin = user?.perfil === 'admin' || user?.perfil === 'gestor' || user.perfil === 'prevencao';
  const lojaName = !isGlobalAdmin ? (lojasOptions.find(l => l.id === user.lojaId)?.nome || 'sua loja') : '';

  if (optionsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold">Dashboard</h1>
          <p className="page-description text-muted-foreground">{!isGlobalAdmin ? `Visão de perdas da ${lojaName}` : 'Gestão e Análise de Perdas da Rede'}</p>
        </div>
        {(user.perfil === 'admin' || user.perfil === 'loja') && (
          <div className="flex gap-2">
            {isGlobalAdmin && (
              <>
                <Button onClick={handleCleanData} disabled={cleaning || seeding} variant="outline" className="shadow-sm text-destructive hover:text-destructive">
                  {cleaning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Limpar Dados Fake
                </Button>
                <Button onClick={handleSeedData} disabled={seeding || cleaning} variant="secondary" className="shadow-sm">
                  {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                  Gerar Dados Fake (Últimos 2 Meses)
                </Button>
              </>
            )}
            <Link to="/nova-apuracao">
              <Button className="shadow-sm">Nova Apuração</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Top Filter Bar */}
      <DashboardFilters 
        filters={filters}
        setFilters={setFilters}
        lojasOptions={lojasOptions}
        cortesOptions={cortesOptions}
        isGlobalAdmin={isGlobalAdmin}
      />

      {/* KPIs Line */}
      <ErrorBoundary fallbackTitle="Erro ao carregar KPIs">
        <DashboardKPIs data={data} loading={loading} />
      </ErrorBoundary>

      {/* Main Charts Area */}
      <ErrorBoundary fallbackTitle="Erro ao carregar gráficos">
        <DashboardCharts 
          data={data} 
          loading={loading} 
          isGlobalAdmin={isGlobalAdmin} 
          filters={filters}
          lojasOptions={lojasOptions}
          cortesOptions={cortesOptions}
        />
      </ErrorBoundary>

      {/* Detailed Data Table */}
      <ErrorBoundary fallbackTitle="Erro ao carregar tabela">
        <DashboardTable filters={filters} loading={loading} />
      </ErrorBoundary>

    </div>
  );
}
