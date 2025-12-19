import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCartoes() {
  const { data: cartoes, isLoading: isLoadingCartoes } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Buscar faturas agrupadas por cartão e mês (apenas uma por combinação)
  const { data: faturas, isLoading: isLoadingFaturas } = useQuery({
    queryKey: ['credit-card-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .order('competencia', { ascending: false });

      if (error) throw error;
      
      // Agrupar faturas duplicadas (somar valores por cartão/competência)
      const grouped = new Map<string, typeof data[0]>();
      
      for (const fatura of data || []) {
        const key = `${fatura.credit_card_id}_${fatura.competencia}`;
        const existing = grouped.get(key);
        
        if (existing) {
          // Somar valores de faturas duplicadas
          existing.total_value += fatura.total_value;
        } else {
          grouped.set(key, { ...fatura });
        }
      }
      
      return Array.from(grouped.values());
    }
  });

  // Calcular fatura atual de cada cartão somando as transações
  const { data: transacoesPorCartao, isLoading: isLoadingTransacoes } = useQuery({
    queryKey: ['credit-card-transactions-summary'],
    queryFn: async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select('credit_card_id, amount, purchase_date')
        .gte('purchase_date', `${currentMonth}-01`)
        .lt('purchase_date', `${currentMonth}-32`);

      if (error) throw error;
      
      // Agrupar por cartão
      const byCard = new Map<string, number>();
      for (const t of data || []) {
        const current = byCard.get(t.credit_card_id) || 0;
        byCard.set(t.credit_card_id, current + t.amount);
      }
      
      return byCard;
    }
  });

  return { 
    cartoes, 
    faturas, 
    transacoesPorCartao,
    isLoading: isLoadingCartoes || isLoadingFaturas || isLoadingTransacoes 
  };
}
