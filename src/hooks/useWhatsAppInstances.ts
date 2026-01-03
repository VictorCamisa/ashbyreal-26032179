import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WhatsAppInstance {
  id: string;
  name: string;
  instance_name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  phone_number: string | null;
  qr_code: string | null;
  webhook_url: string | null;
  webhook_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppInstances() {
  const queryClient = useQueryClient();

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppInstance[];
    },
  });

  const createInstance = useMutation({
    mutationFn: async ({ name, instanceName }: { name: string; instanceName: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { action: 'create', name, instanceName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar instância: ${error.message}`);
    },
  });

  const deleteInstance = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { action: 'delete', instanceName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Instância removida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover instância: ${error.message}`);
    },
  });

  const getQRCode = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { action: 'qrcode', instanceName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao obter QR Code: ${error.message}`);
    },
  });

  const checkConnection = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { action: 'connect', instanceName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      if (data?.isConnected) {
        toast.success('WhatsApp conectado!');
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao verificar conexão: ${error.message}`);
    },
  });

  const logout = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { action: 'logout', instanceName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      toast.success('Desconectado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  return {
    instances,
    isLoading,
    createInstance,
    deleteInstance,
    getQRCode,
    checkConnection,
    logout,
  };
}
