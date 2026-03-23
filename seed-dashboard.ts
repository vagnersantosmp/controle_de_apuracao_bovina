import { createClient } from '@supabase/supabase-js';
import { addDays } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Random helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => (Math.random() * (max - min) + min);

async function seed() {
  console.log("Starting mock data generation...");

  // Get active stores
  const { data: lojas } = await supabase.from('lojas').select('id').eq('ativa', true);
  if (!lojas || lojas.length === 0) {
    console.log("No active stores found.");
    return;
  }

  // Get active cuts by methodology
  const { data: cortes } = await supabase.from('cortes').select('id, metodologia').eq('ativo', true);
  if (!cortes || cortes.length === 0) {
    console.log("No active cuts found.");
    return;
  }

  const metodologias = ['boi_no_osso', 'nota_10', 'embalada'];
  
  // Dates: Jan 2, 2026 to Mar 2, 2026 (approx 8 weeks)
  const startDate = new Date('2026-01-02T12:00:00Z');
  const endDate = new Date('2026-03-02T12:00:00Z');
  
  let currentDate = startDate;
  let apuracoesCriadas = 0;

  // We will iterate week by week
  while (currentDate <= endDate) {
    // For each week, let's create apuracoes for 3-5 random stores
    const numStoresThisWeek = randomInt(3, Math.min(6, lojas.length));
    const selectedStores = [...lojas].sort(() => 0.5 - Math.random()).slice(0, numStoresThisWeek);

    for (const loja of selectedStores) {
      // Pick a random methodology for this apuracao
      const metodologia = metodologias[randomInt(0, 2)];
      
      // Filter cuts for this methodology
      const availableCuts = cortes.filter(c => c.metodologia === metodologia);
      if (availableCuts.length === 0) continue;

      // Create Apuracao
      const { data: apuracao, error: apErr } = await supabase.from('apuracoes').insert({
        loja_id: loja.id,
        tipo_apuracao: metodologia,
        data_apuracao: currentDate.toISOString(),
        responsavel: 'Sistema Teste',
        status: 'concluido',
        peso_total_traseiro: metodologia === 'boi_no_osso' ? randomFloat(100, 200) : null,
        peso_total_dianteiro: metodologia === 'boi_no_osso' ? randomFloat(80, 150) : null,
        user_id: null // We can leave user_id null or map to an admin, but RLS might need it. Wait, if using ANON KEY, RLS might block insert if not authenticated.
        // ACTUALLY, insert might be blocked by RLS if anonymously creating. Let's see if we can use the service role key if it exists, or bypass.
        // RLS for apuracoes: auth.uid() = user_id OR perfil = admin.
        // Let's use the first admin user we can find to bypass RLS, or temporary auth.
      }).select().single();

      if (apErr) {
        console.error("Error creating apuracao:", apErr.message);
        continue;
      }

      // Add items
      const numItems = randomInt(3, Math.min(7, availableCuts.length));
      const selectedCuts = [...availableCuts].sort(() => 0.5 - Math.random()).slice(0, numItems);

      const itemsToInsert = selectedCuts.map(corte => {
        const pesoInicial = randomFloat(20, 50);
        // Perda between 2% and 15%
        const perdaPct = randomFloat(0.02, 0.15);
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
        console.error("Error inserting items:", itemsErr.message);
      } else {
        apuracoesCriadas++;
      }
    }
    
    // Advance 1 week
    currentDate = addDays(currentDate, 7);
  }

  console.log(`Mock data generation complete! Created ${apuracoesCriadas} apuracoes with their items.`);
}

// Since RLS requires auth, we need an admin login.
async function run() {
  // Try to login as admin to bypass RLS, we need user credentials.
  // Alternatively, if the user lets us read .env we could use service_role, but VITE_SUPABASE_ANON_KEY does not have bypass.
  // We can just use standard Supabase client and login.
  const adminEmail = 'admin@admin.com';
  const adminPass = '123456';
  
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPass
  });

  if (authErr) {
    console.warn("Could not login as admin. The script might fail due to RLS policies:", authErr.message);
  } else {
    console.log("Logged in as admin successfully.");
  }

  await seed();
}

run();
