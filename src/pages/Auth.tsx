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

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user && !isLoading) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (data: LoginFormData) => {
    try {
      setIsSubmitting(true);
      await signIn(data.email, data.password);
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
        {/* Name with Apple-style typing reveal animation */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {/* Base text (invisible, just for sizing) */}
            <h1 
              className="text-5xl font-light tracking-tight text-transparent select-none"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
            >
              Alexandre
            </h1>
            {/* Revealed text with clip animation */}
            <h1 
              className="absolute inset-0 text-5xl font-light tracking-tight text-primary select-none animate-text-reveal"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
            >
              Alexandre
            </h1>
          </div>
        </div>

        {/* Login Form */}
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      className="h-12 bg-muted/30 backdrop-blur-sm border-border/30 text-center placeholder:text-muted-foreground/50 focus:border-border focus:ring-0 rounded-xl"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-center text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={loginForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Senha" 
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
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/40">
          © 2025 Ashby
        </p>
      </div>
    </div>
  );
}
