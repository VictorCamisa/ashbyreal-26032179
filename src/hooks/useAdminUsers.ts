import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  nome: string;
  cargo?: string;
  avatar_url?: string;
  roles: string[];
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

      const response = await supabase.functions.invoke('admin-users', {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: null,
      });

      // Handle the response properly - Supabase functions.invoke returns { data, error }
      if (response.error) {
        throw new Error(response.error.message || 'Erro ao carregar usuários');
      }

      // The actual response data is in response.data
      const responseData = response.data;
      
      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      return responseData?.users as AdminUser[] || [];
    },
  });

  const createUser = useMutation({
    mutationFn: async (userData: { email: string; password: string; nome: string; cargo?: string; role?: string }) => {
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

      const response = await supabase.functions.invoke('admin-users', {
        method: 'DELETE',
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
