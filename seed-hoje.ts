import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const randomFloat = (min: number, max: number) => (Math.random() * (max - min) + min);

async function seedHoje() {
  console.log("Gerando apurações completas para hoje...");

  const { data: lojas } = await supabase.from('lojas').select('id, nome, codigo').eq('ativa', true);
  if (!lojas || lojas.length === 0) {
    console.log("No active stores found.");
    return;
  }

  const { data: cortes } = await supabase.from('cortes').select('id, metodologia').eq('ativo', true);
  if (!cortes) {
    console.log("No active cuts found.");
    return;
  }

  const metodologias = ['boi_no_osso', 'nota_10', 'embalada'];
  let apuracoesCriadas = 0;

  for (const metodologia of metodologias) {
    console.log(`\n--- Gerando para ${metodologia} ---`);
    const availableCuts = cortes.filter(c => c.metodologia === metodologia || metodologia === 'todas'); // just in case
    
    // Filtro estrito:
    const cutsPorMetodologia = cortes.filter(c => c.metodologia === metodologia);
    if (cutsPorMetodologia.length === 0) {
      console.log(`Nenhum corte para ${metodologia}`);
      continue;
    }

    // Criar apuração para todas as lojas
    for (const loja of lojas) {
      const { data: apuracao, error: apErr } = await supabase.from('apuracoes').insert({
        loja_id: loja.id,
        tipo_apuracao: metodologia,
        data_apuracao: new Date().toISOString(), // Hoje
        responsavel: 'Sistema Seed (Auto)',
        status: 'concluido',
        peso_total_traseiro: metodologia === 'boi_no_osso' ? randomFloat(100, 200) : null,
        peso_total_dianteiro: metodologia === 'boi_no_osso' ? randomFloat(80, 150) : null,
      }).select().single();

      if (apErr) {
        console.error(`Erro ao criar apuracao da loja ${loja.nome}:`, apErr.message);
        continue;
      }

      // Adicionamos todos os cortes daquela metodologia para ter um relatório completo
      const itemsToInsert = cutsPorMetodologia.map(corte => {
        const pesoInicial = randomFloat(20, 100);
        // Perda percentual simulando perdas reais
        let perdaPct = 0;
        if (metodologia === 'boi_no_osso') perdaPct = randomFloat(0.04, 0.25);
        if (metodologia === 'nota_10') perdaPct = randomFloat(0.01, 0.10);
        if (metodologia === 'embalada') perdaPct = randomFloat(0.01, 0.05);

        const pesoFinal = pesoInicial * (1 - perdaPct);
        const perdaKg = pesoInicial - pesoFinal;

        return {
          apuracao_id: apuracao.id,
          corte_id: corte.id,
          peso_inicial: pesoInicial,
          peso_final: pesoFinal,
          perda_kg: perdaKg,
          perda_percentual: perdaPct * 100
        };
      });

      const { error: itemsErr } = await supabase.from('itens_apuracao').insert(itemsToInsert);
      if (itemsErr) {
        console.error("Erro inserindo itens:", itemsErr.message);
      } else {
        console.log(`✅ Apuração ${metodologia} criada para a loja ${loja.nome} com ${itemsToInsert.length} cortes.`);
        apuracoesCriadas++;
      }
    }
  }

  console.log(`\nConcluído! ${apuracoesCriadas} apurações criadas com sucesso.`);
}

async function run() {
  const adminEmail = 'admin@admin.com';
  const adminPass = '123456';
  
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPass
  });

  if (authErr) {
    console.warn("Nao foi possivel logar como admin. O script pode falhar por RLS:", authErr.message);
  } else {
    console.log("Logado como admin com sucesso.");
  }

  await seedHoje();
}

run();
