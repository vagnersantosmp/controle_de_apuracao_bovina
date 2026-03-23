import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let roleData = null;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    try {
      const { data } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id)
        .in('role', ['admin', 'gestor'])
        .single();
      roleData = data;
    } catch (dbErr: any) {
      return new Response(JSON.stringify({ error: 'Erro de Banco/Permissão Admin: ' + dbErr.message }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Operação negada. Requer permissão de gestor ou admin.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, email, password } = await req.json();

    if (!user_id || (!email && !password)) {
      return new Response(JSON.stringify({ error: 'Campos incorretos: informe user_id e pelo menos email ou password' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: any = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      updates
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update email in profile as well if it was passed
    if (email) {
      await adminClient
        .from('profiles')
        .update({ email })
        .eq('user_id', user_id);
    }

    return new Response(JSON.stringify({ success: true, user: updatedUser.user }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
