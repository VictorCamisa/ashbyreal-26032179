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
import { User } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted/30 to-background p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-medium text-foreground">Ashby</h1>
        </div>

        {/* Login Form */}
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Email" 
                      className="h-11 bg-background/80 backdrop-blur-sm border-border/50 text-center placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
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
                      className="h-11 bg-background/80 backdrop-blur-sm border-border/50 text-center placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-center text-xs" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-11 font-medium mt-4" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60">
          © 2025 Ashby
        </p>
      </div>
    </div>
  );
}
