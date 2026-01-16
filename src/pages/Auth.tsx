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
import { 
  Beer, Lock, Mail, ArrowRight, TrendingUp, Users, 
  ShoppingCart, DollarSign, Activity, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const authSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type AuthFormData = z.infer<typeof authSchema>;

interface PublicStats {
  totalClientes: number;
  totalPedidos: number;
  pedidosHoje: number;
  faturamentoMes: number;
}

interface RecentActivity {
  id: string;
  type: 'pedido' | 'cliente' | 'lead';
  message: string;
  time: string;
  icon: 'cart' | 'user' | 'zap';
}

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [stats, setStats] = useState<PublicStats>({
    totalClientes: 0,
    totalPedidos: 0,
    pedidosHoje: 0,
    faturamentoMes: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Fetch public stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total clients
        const { count: clientesCount } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });

        // Get total pedidos
        const { count: pedidosCount } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true });

        // Get pedidos hoje
        const today = new Date().toISOString().split('T')[0];
        const { count: pedidosHoje } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .gte('data_pedido', today);

        // Get faturamento do mês
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: pedidosMes } = await supabase
          .from('pedidos')
          .select('valor_total')
          .gte('data_pedido', startOfMonth)
          .in('status', ['entregue', 'pago']);

        const faturamento = pedidosMes?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0;

        setStats({
          totalClientes: clientesCount || 0,
          totalPedidos: pedidosCount || 0,
          pedidosHoje: pedidosHoje || 0,
          faturamentoMes: faturamento
        });

        // Fetch recent activities
        const { data: recentPedidos } = await supabase
          .from('pedidos')
          .select('id, created_at, numero_pedido, valor_total')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentClientes } = await supabase
          .from('clientes')
          .select('id, created_at, nome')
          .order('created_at', { ascending: false })
          .limit(3);

        const activitiesList: RecentActivity[] = [];

        recentPedidos?.forEach(p => {
          activitiesList.push({
            id: p.id,
            type: 'pedido',
            message: `Pedido #${p.numero_pedido} • R$ ${(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            time: formatTimeAgo(new Date(p.created_at)),
            icon: 'cart'
          });
        });

        recentClientes?.forEach(c => {
          activitiesList.push({
            id: c.id,
            type: 'cliente',
            message: `Novo cliente: ${c.nome?.split(' ')[0] || 'Cliente'}***`,
            time: formatTimeAgo(new Date(c.created_at)),
            icon: 'user'
          });
        });

        // Sort by time (most recent first)
        activitiesList.sort((a, b) => {
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        });

        setActivities(activitiesList.slice(0, 6));
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Rotate through activities
  useEffect(() => {
    if (activities.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentActivityIndex(prev => (prev + 1) % activities.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [activities.length]);

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

  const getActivityIcon = (icon: string) => {
    switch (icon) {
      case 'cart': return ShoppingCart;
      case 'user': return Users;
      case 'zap': return Zap;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Live Stats */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background with dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Floating decorative elements */}
        <motion.div 
          className="absolute top-20 right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 left-10 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [0, -20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 w-full">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 backdrop-blur-sm rounded-2xl border border-amber-500/30">
                <Beer className="h-7 w-7 text-amber-400" />
              </div>
              <span className="text-white text-xl font-bold tracking-tight">
                Taubate Chopp
              </span>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-zinc-400 text-sm"
            >
              <Activity className="h-4 w-4 text-amber-400" />
              <span>Dados em tempo real</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-zinc-800/80 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/20 rounded-xl">
                    <Users className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="text-zinc-400 text-sm font-medium">Clientes</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.totalClientes.toLocaleString('pt-BR')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-zinc-800/80 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <ShoppingCart className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="text-zinc-400 text-sm font-medium">Pedidos Total</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.totalPedidos.toLocaleString('pt-BR')}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-zinc-800/80 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-zinc-400 text-sm font-medium">Pedidos Hoje</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.pedidosHoje}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-zinc-800/80 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/50"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-500/20 rounded-xl">
                    <DollarSign className="h-5 w-5 text-amber-400" />
                  </div>
                  <span className="text-zinc-400 text-sm font-medium">Faturamento/Mês</span>
                </div>
                <p className="text-2xl xl:text-3xl font-bold text-white">
                  R$ {(stats.faturamentoMes / 1000).toFixed(1)}k
                </p>
              </motion.div>
            </div>

            {/* Live Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-zinc-800/80 backdrop-blur-md rounded-2xl p-5 border border-zinc-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-white text-sm font-semibold">Atividade Recente</span>
                <span className="text-zinc-500 text-xs">Atualização automática</span>
              </div>

              <div className="h-32 overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {activities.length > 0 && (
                    <motion.div
                      key={currentActivityIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-3"
                    >
                      {[0, 1, 2].map(offset => {
                        const index = (currentActivityIndex + offset) % activities.length;
                        const activity = activities[index];
                        if (!activity) return null;
                        const IconComponent = getActivityIcon(activity.icon);
                        
                        return (
                          <div 
                            key={`${activity.id}-${offset}`}
                            className={`flex items-center gap-3 ${offset === 0 ? 'opacity-100' : offset === 1 ? 'opacity-60' : 'opacity-30'}`}
                          >
                            <div className={`p-2 rounded-lg ${
                              activity.type === 'pedido' ? 'bg-blue-500/20' :
                              activity.type === 'cliente' ? 'bg-purple-500/20' : 'bg-green-500/20'
                            }`}>
                              <IconComponent className={`h-4 w-4 ${
                                activity.type === 'pedido' ? 'text-blue-300' :
                                activity.type === 'cliente' ? 'text-purple-300' : 'text-green-300'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{activity.message}</p>
                              <p className="text-white/50 text-xs">{activity.time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {activities.length === 0 && (
                  <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                    Carregando atividades...
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-zinc-500 text-xs"
          >
            © {new Date().getFullYear()} Taubate Chopp • Gestão Inteligente
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Beer className="h-6 w-6 text-primary" />
            </div>
            <span className="text-foreground text-xl font-semibold">
              Taubate Chopp
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-muted-foreground">
              {isSignUp 
                ? 'Preencha os dados para criar sua conta' 
                : 'Entre com suas credenciais para continuar'
              }
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="Seu email" 
                          autoComplete="email"
                          className="h-12 pl-12 bg-muted/50 border-border/50 rounded-xl focus:border-primary focus:ring-primary/20"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs ml-1" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="Sua senha" 
                          autoComplete={isSignUp ? "new-password" : "current-password"}
                          className="h-12 pl-12 bg-muted/50 border-border/50 rounded-xl focus:border-primary focus:ring-primary/20"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs ml-1" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-semibold text-base gap-2 group"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    {isSignUp ? 'Criar conta' : 'Entrar'}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">
                ou
              </span>
            </div>
          </div>

          {/* Toggle Sign Up / Sign In */}
          <Button 
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50"
            onClick={() => {
              setIsSignUp(!isSignUp);
              form.reset();
            }}
          >
            {isSignUp ? 'Já tenho uma conta' : 'Criar nova conta'}
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Ao continuar, você concorda com nossos{' '}
            <button className="text-primary hover:underline">Termos de Uso</button>
            {' '}e{' '}
            <button className="text-primary hover:underline">Política de Privacidade</button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// Helper functions
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays === 1) return 'Ontem';
  return `${diffDays} dias atrás`;
}

function parseTimeAgo(timeStr: string): number {
  if (timeStr === 'Agora') return 0;
  if (timeStr.includes('min')) return parseInt(timeStr);
  if (timeStr.includes('h')) return parseInt(timeStr) * 60;
  if (timeStr === 'Ontem') return 24 * 60;
  return parseInt(timeStr) * 24 * 60;
}
