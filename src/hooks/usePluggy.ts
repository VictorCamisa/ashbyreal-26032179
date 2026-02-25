import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PluggyAccount {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  number?: string;
  creditData?: {
    level?: string;
    brand?: string;
    balanceCloseDate?: string;
    balanceDueDate?: string;
    availableCreditLimit?: number;
    creditLimit?: number;
  };
}

export function usePluggy() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

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

  const getConnectToken = async (itemId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase.functions.invoke('pluggy-auth', {
      body: { action: 'connect-token', itemId },
    });

    if (error) throw error;
    return data.accessToken;
  };

  // Fetch accounts for a Pluggy item (to discover all credit cards in the institution)
  const getAccounts = async (itemId: string): Promise<PluggyAccount[]> => {
    const { data, error } = await supabase.functions.invoke('pluggy-auth', {
      body: { action: 'get-accounts', itemId },
    });

    if (error) throw error;
    return data.results || [];
  };

  // Link a single Pluggy account to a credit card
  const linkItemMutation = useMutation({
    mutationFn: async ({ pluggyItemId, pluggyAccountId, creditCardId, connectorName }: { 
      pluggyItemId: string; 
      pluggyAccountId: string;
      creditCardId: string;
      connectorName?: string;
    }) => {
      const { data, error } = await supabase
        .from('pluggy_items')
        .insert({
          pluggy_item_id: pluggyItemId,
          pluggy_account_id: pluggyAccountId,
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
    },
    onError: (error) => {
      toast.error(`Erro ao vincular: ${error.message}`);
    },
  });

  // Link multiple accounts at once (one per card mapping) and auto-sync
  const linkMultipleItems = async (mappings: Array<{
    pluggyItemId: string;
    pluggyAccountId: string;
    creditCardId: string;
    connectorName?: string;
  }>) => {
    const rows = mappings.map(m => ({
      pluggy_item_id: m.pluggyItemId,
      pluggy_account_id: m.pluggyAccountId,
      credit_card_id: m.creditCardId,
      connector_name: m.connectorName,
      status: 'ACTIVE',
    }));

    const { error } = await supabase
      .from('pluggy_items')
      .insert(rows);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ['pluggy-items'] });
    toast.success(`${rows.length} cartão(ões) vinculado(s)! Sincronizando transações...`);

    // Auto-trigger sync for each linked card
    for (const m of mappings) {
      try {
        await supabase.functions.invoke('pluggy-sync', {
          body: { creditCardId: m.creditCardId },
        });
        toast.success(`Transações do cartão sincronizadas com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      } catch (syncErr: any) {
        toast.error(`Erro ao sincronizar: ${syncErr.message}`);
      }
    }
  };

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

  const getCardPluggyItem = (creditCardId: string) => {
    return pluggyItems?.find(item => item.credit_card_id === creditCardId);
  };

  return {
    pluggyItems,
    isLoading,
    isSyncing,
    getConnectToken,
    getAccounts,
    linkItem: linkItemMutation.mutate,
    linkMultipleItems,
    isLinking: linkItemMutation.isPending,
    unlinkItem: unlinkMutation.mutate,
    syncCard,
    getCardPluggyItem,
  };
}
