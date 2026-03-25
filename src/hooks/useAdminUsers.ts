import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Available modules in the system
export const ALL_MODULES = [
  { key: 'pedidos', label: 'Pedidos', icon: 'ShoppingCart' },
  { key: 'crm', label: 'CRM', icon: 'Target' },
  { key: 'financeiro', label: 'Financeiro', icon: 'Wallet' },
  { key: 'contabilidade', label: 'Contabilidade', icon: 'Calculator' },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]['key'];

// Hook for managing admin users
export interface AdminUser {
  id: string;
  email: string;
  nome: string;
  cargo?: string;
  telefone?: string;
  avatar_url?: string;
  is_owner?: boolean;
  roles: string[];
  modules?: string[];
  created_at: string;
  email_confirmed_at?: string;
}

export function useAdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('admin-users?action=list', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Handle 403 gracefully - user is not admin yet
      if (response.error) {
        const errorMsg = response.error.message || '';
        if (errorMsg.includes('403') || response.data?.error?.includes('Não autorizado')) {
          return [] as AdminUser[]; // Return empty array, will show bootstrap button
        }
        throw new Error(errorMsg || 'Erro ao carregar usuários');
      }

      const responseData = response.data;
      
      // Handle not authorized error gracefully
      if (responseData?.error?.includes('Não autorizado')) {
        return [] as AdminUser[];
      }

      return responseData?.users as AdminUser[] || [];
    },
    retry: false, // Don't retry on auth errors
  });

  const createUser = useMutation({
    mutationFn: async (userData: { email: string; password: string; nome: string; telefone: string; cargo?: string; role?: string; is_owner?: boolean; modules?: string[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('admin-users?action=create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: userData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao criar usuário', description: error.message });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('admin-users?action=delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { userId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao excluir usuário');
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao excluir usuário', description: error.message });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role, remove }: { userId: string; role: string; remove?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('admin-users?action=role', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { userId, role, remove },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao atualizar role');
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Role atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao atualizar role', description: error.message });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (profileData: { userId: string; nome?: string; telefone?: string; cargo?: string; is_owner?: boolean; modules?: string[]; password?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('admin-users?action=update', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: profileData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao atualizar perfil');
      }

      const responseData = response.data;
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Perfil atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao atualizar perfil', description: error.message });
    },
  });

  const bootstrapAdmin = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('bootstrap-admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: {},
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao configurar admin');
      }

      const responseData = response.data;
      if (responseData?.error && !responseData?.alreadyExists) {
        throw new Error(responseData.error);
      }

      return responseData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['current-user-role'] });
      toast({ title: data.message || 'Configurado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    },
  });

  return {
    users,
    isLoading,
    error,
    refetch,
    createUser,
    deleteUser,
    updateRole,
    updateProfile,
    bootstrapAdmin,
  };
}

export function useCurrentUserRole() {
  return useQuery({
    queryKey: ['current-user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      return data?.map(r => r.role) || [];
    },
  });
}

// Hook to get current user's visible modules
export function useUserModules() {
  return useQuery({
    queryKey: ['current-user-modules'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user is admin - admins see all modules
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (isAdmin) {
        return ALL_MODULES.map(m => m.key);
      }

      // Get user's specific module permissions
      const { data: modules } = await supabase
        .from('user_module_permissions')
        .select('module_key')
        .eq('user_id', user.id)
        .eq('is_visible', true);

      // If no permissions set, return empty (user must have explicit permissions)
      if (!modules || modules.length === 0) {
        return [];
      }

      return modules.map(m => m.module_key);
    },
  });
}
