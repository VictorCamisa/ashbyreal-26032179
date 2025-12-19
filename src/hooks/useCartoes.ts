import { useMemo } from 'react';
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

  // Calcular fatura atual de cada cartão - usar total_value da fatura da competência atual
  // A competência atual depende do dia de fechamento de cada cartão
  const getCurrentCompetencia = (closingDay: number) => {
    const now = new Date();
    const day = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Se estamos APÓS o fechamento, a fatura atual é do próximo mês
    if (day > closingDay) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
    }
    
    // Se estamos ATÉ o fechamento, a fatura atual é do mês atual
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };
  
  // Mapa de valores atuais por cartão baseado em faturas (não transações)
  const transacoesPorCartao = useMemo(() => {
    if (!cartoes || !faturas) return new Map<string, number>();
    
    const byCard = new Map<string, number>();
    
    for (const cartao of cartoes) {
      const closingDay = cartao.closing_day || 10;
      const competenciaAtual = getCurrentCompetencia(closingDay);
      
      // Buscar fatura dessa competência
      const faturaAtual = faturas.find(
        f => f.credit_card_id === cartao.id && f.competencia.startsWith(competenciaAtual)
      );
      
      if (faturaAtual) {
        byCard.set(cartao.id, faturaAtual.total_value);
      }
    }
    
    return byCard;
  }, [cartoes, faturas]);

  return { 
    cartoes, 
    faturas, 
    transacoesPorCartao,
    isLoading: isLoadingCartoes || isLoadingFaturas
  };
}
