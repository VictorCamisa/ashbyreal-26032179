import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (username: string, password: string, nome?: string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert username to internal email format
// Using a valid TLD (.app) since Supabase validates email format
const usernameToEmail = (username: string) => `${username.toLowerCase().trim()}@ashby.app`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (username: string, password: string, nome?: string) => {
    try {
      const email = usernameToEmail(username);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            nome: nome || username,
            username: username.toLowerCase().trim()
          },
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Este usuário já está cadastrado');
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

  const signIn = async (username: string, password: string) => {
    try {
      const email = usernameToEmail(username);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Usuário ou senha inválidos');
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
