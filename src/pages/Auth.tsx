import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (data: AuthFormData) => {
    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await signUp(data.email, data.password);
        // After signup, switch to login mode
        setIsSignUp(false);
        form.reset();
      } else {
        await signIn(data.email, data.password);
      }
    } catch (error) {
      // Error already handled in useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background p-4">
      <div className="w-full max-w-sm space-y-10">
        {/* Name with wave fill animation */}
        <div className="flex flex-col items-center">
          <h1 
            className="text-6xl select-none animate-wave-fill bg-gradient-to-r from-muted-foreground/20 via-primary to-muted-foreground/20 bg-[length:300%_100%] bg-clip-text text-transparent"
            style={{ fontFamily: '"Allura", cursive' }}
          >
            Alexandre
          </h1>
        </div>

        {/* Auth Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      autoComplete="email"
                      className="h-12 bg-muted/30 backdrop-blur-sm border-border/30 text-center placeholder:text-muted-foreground/50 focus:border-border focus:ring-0 rounded-xl"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-center text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Senha" 
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      className="h-12 bg-muted/30 backdrop-blur-sm border-border/30 text-center placeholder:text-muted-foreground/50 focus:border-border focus:ring-0 rounded-xl"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-center text-xs" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              variant="ghost"
              className="w-full h-12 font-medium mt-6 bg-muted/40 hover:bg-muted/60 text-foreground border border-border/30 rounded-xl transition-all duration-300" 
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? (isSignUp ? 'Cadastrando...' : 'Entrando...') 
                : (isSignUp ? 'Cadastrar' : 'Entrar')
              }
            </Button>
          </form>
        </Form>

        {/* Toggle between login and signup */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              form.reset();
            }}
            className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            {isSignUp 
              ? 'Já tem conta? Entrar' 
              : 'Não tem conta? Cadastrar'
            }
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/40">
          © 2025 Ashby
        </p>
      </div>
    </div>
  );
}
