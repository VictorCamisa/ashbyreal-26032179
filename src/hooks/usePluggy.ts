import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePluggy() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch pluggy items linked to credit cards
  const { data: pluggyItems, isLoading } = useQuery({
    queryKey: ['pluggy-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pluggy_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get connect token for Pluggy widget
  const getConnectToken = async (itemId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('pluggy-auth', {
      body: { action: 'connect-token', itemId },
    });

    if (error) throw error;
    return data.accessToken;
  };

  // Link a Pluggy item to a credit card
  const linkItemMutation = useMutation({
    mutationFn: async ({ pluggyItemId, creditCardId, connectorName }: { 
      pluggyItemId: string; 
      creditCardId: string;
      connectorName?: string;
    }) => {
      const { data, error } = await supabase
        .from('pluggy_items')
        .insert({
          pluggy_item_id: pluggyItemId,
          credit_card_id: creditCardId,
          connector_name: connectorName,
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pluggy-items'] });
      toast.success('Conta bancária conectada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao conectar: ${error.message}`);
    },
  });

  // Trigger manual sync
  const syncCard = async (creditCardId: string) => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: { creditCardId },
      });

      if (error) throw error;

      toast.success(`Sincronização concluída! ${data.inserted} novas transações importadas.`);
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['pluggy-items'] });

      return data;
    } catch (error: any) {
      toast.error(`Erro na sincronização: ${error.message}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Remove Pluggy link
  const unlinkMutation = useMutation({
    mutationFn: async (pluggyItemDbId: string) => {
      const { error } = await supabase
        .from('pluggy_items')
        .delete()
        .eq('id', pluggyItemDbId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pluggy-items'] });
      toast.success('Conexão removida.');
    },
  });

  // Get linked item for a specific card
  const getCardPluggyItem = (creditCardId: string) => {
    return pluggyItems?.find(item => item.credit_card_id === creditCardId);
  };

  return {
    pluggyItems,
    isLoading,
    isSyncing,
    getConnectToken,
    linkItem: linkItemMutation.mutate,
    isLinking: linkItemMutation.isPending,
    unlinkItem: unlinkMutation.mutate,
    syncCard,
    getCardPluggyItem,
  };
}
