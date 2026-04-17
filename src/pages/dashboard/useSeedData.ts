import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, subMonths, startOfDay } from 'date-fns';
import type { AppUser } from '@/contexts/AuthContext';

export function useSeedData(
  user: AppUser | null,
  lojasOptions: { id: string; nome: string; codigo: string }[],
  cortesOptions: { id: string; descricao: string; codigo?: string }[],
  onSuccess: () => void
) {
  const [seeding, setSeeding] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // TEMP: Function to inject mock data
  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    toast.info("Iniciando geração de testes...");

    try {
      const metodologias = ['boi_no_osso', 'nota_10', 'embalada'];
      const now = new Date();
      let currentDate = startOfDay(subMonths(now, 2)); // 2 meses atrás
      const endDate = startOfDay(now); // hoje
      let apuracoesCriadas = 0;

      while (currentDate <= endDate) {
        const numStores = Math.floor(Math.random() * 3) + 3; // 3 to 5
        const selectedStores = [...lojasOptions].sort(() => 0.5 - Math.random()).slice(0, numStores);

        for (const loja of selectedStores) {
          const metodologia = metodologias[Math.floor(Math.random() * 3)];
          const availableCuts = cortesOptions; // for mock, let's use all or partial

          const numItems = Math.floor(Math.random() * 4) + 3; // 3 to 6
          const selectedCuts = [...availableCuts].sort(() => 0.5 - Math.random()).slice(0, numItems);

          let totalPI = 0;
          let totalPF = 0;
          let totalPerda = 0;

          // Compute item objects partially
          const tempItems = selectedCuts.map(corte => {
            const pesoIni = Math.random() * 30 + 15;
            const perdaPct = Math.random() * 0.12 + 0.02; // 2% to 14%
            const pesoFin = pesoIni * (1 - perdaPct);
            const perdaKg = pesoIni - pesoFin;
            
            totalPI += pesoIni;
            totalPF += pesoFin;
            totalPerda += perdaKg;

            return {
              corte_id: corte.id,
              corte_codigo: corte.codigo || '000',
              corte_descricao: corte.descricao || 'Corte Teste',
              peso_inicial: pesoIni,
              peso_final: pesoFin,
              perda_kg: perdaKg,
              perda_percentual: perdaPct * 100
            };
          });

          const mediaPerda = totalPI > 0 ? (totalPerda / totalPI) * 100 : 0;

          const { data: apuracao, error: apErr } = await supabase.from('apuracoes').insert({
            loja_id: loja.id,
            tipo_apuracao: metodologia,
            data_apuracao: currentDate.toISOString(),
            responsavel: 'Sistema Gerador (Teste)',
            status: 'finalizada',
            user_id: user.id, // we use the current user id so RLS passes!
            observacoes: 'TESTE_BI_DELETE_DEPOIS',
            peso_carcaca: Number((totalPI).toFixed(3)),
            total_peso_inicial: Number((totalPI).toFixed(3)),
            total_peso_final: Number((totalPF).toFixed(3)),
            total_perda_kg: Number((totalPerda).toFixed(3)),
            media_perda_percentual: Number((mediaPerda).toFixed(2))
          }).select().single();

          if (apErr) throw apErr;

          const itemsToInsert = tempItems.map(item => ({
            ...item,
            apuracao_id: apuracao.id
          }));

          const { error: itemsErr } = await supabase.from('itens_apuracao').insert(itemsToInsert);
          if (itemsErr) throw itemsErr;
          
          apuracoesCriadas++;
        }
        currentDate = addDays(currentDate, 7);
      }
      
      toast.success(`${apuracoesCriadas} apurações de teste injetadas!`);
      onSuccess(); // update dashboard

    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao gerar testes: ' + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleCleanData = async () => {
    try {
      setCleaning(true);
      const { error } = await supabase.from('apuracoes').delete().eq('observacoes', 'TESTE_BI_DELETE_DEPOIS');
      if (error) throw error;
      toast.success('Dados de teste apagados com sucesso!');
      onSuccess();
    } catch (e: any) {
       toast.error('Erro ao limpar testes: ' + e.message);
    } finally {
      setCleaning(false);
    }
  };

  return { seeding, cleaning, handleSeedData, handleCleanData };
}
