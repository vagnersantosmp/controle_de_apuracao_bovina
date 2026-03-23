import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  perfil: AppRole;
  lojaId: string | null;
  ativo: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, nome: string, lojaId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

async function fetchAppUser(supabaseUser: SupabaseUser): Promise<AppUser | null> {
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', supabaseUser.id)
    .single();

  // Fetch role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supabaseUser.id)
    .single();

  if (!profile) return null;

  // P0 FIX: Block inactive users (self-registered, awaiting admin approval)
  if (!profile.ativo) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    id: supabaseUser.id,
    nome: profile.nome,
    email: profile.email,
    perfil: roleData?.role ?? 'loja',
    lojaId: profile.loja_id,
    ativo: profile.ativo,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            const appUser = await fetchAppUser(newSession.user);
            setUser(appUser);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      setSession(existingSession);
      if (existingSession?.user) {
        const appUser = await fetchAppUser(existingSession.user);
        setUser(appUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    // P0 FIX: Check if user's profile is active
    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('user_id', authData.user.id)
        .single();

      if (profile && !profile.ativo) {
        await supabase.auth.signOut();
        return { success: false, error: 'Sua conta está aguardando aprovação do administrador.' };
      }
    }

    return { success: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string, nome: string, lojaId: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: nome,
          loja_id: lojaId
        }
      }
    });
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    login,
    signUp,
    logout,
    isAuthenticated: !!user,
    loading
  }), [user, session, loading, login, signUp, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
