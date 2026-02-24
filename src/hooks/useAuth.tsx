import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, nome?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Then set up auth state listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Only set loading to false if still loading
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nome?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/hub`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { 
            nome: nome || email.split('@')[0]
          },
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este email já está cadastrado');
        }
        throw error;
      }

      toast({
        title: 'Cadastro realizado!',
        description: 'Você já pode fazer login.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: error.message,
      });
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email ou senha inválidos');
        }
        throw error;
      }

      toast({
        title: 'Login realizado com sucesso!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer login',
        description: error.message,
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: 'Logout realizado com sucesso!',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer logout',
        description: error.message,
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
