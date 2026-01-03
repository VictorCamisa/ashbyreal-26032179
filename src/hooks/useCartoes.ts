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

  // Buscar faturas agrupadas por cartão e mês
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
          existing.total_value = (existing.total_value || 0) + (fatura.total_value || 0);
        } else {
          grouped.set(key, { ...fatura });
        }
      }
      
      return Array.from(grouped.values());
    }
  });

  // Buscar compras parceladas ativas
  const { data: comprasParceladas, isLoading: isLoadingCompras } = useQuery({
    queryKey: ['card-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_purchases')
        .select('*')
        .eq('status', 'ATIVA')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Calcular fatura atual de cada cartão
  const getCurrentCompetencia = (closingDay: number) => {
    const now = new Date();
    const day = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    if (day > closingDay) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
    }
    
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };
  
  // Mapa de valores atuais por cartão baseado em faturas
  const transacoesPorCartao = useMemo(() => {
    if (!cartoes || !faturas) return new Map<string, number>();
    
    const byCard = new Map<string, number>();
    
    for (const cartao of cartoes) {
      const closingDay = cartao.closing_day || 10;
      const competenciaAtual = getCurrentCompetencia(closingDay);
      
      const faturaAtual = faturas.find(
        f => f.credit_card_id === cartao.id && f.competencia.startsWith(competenciaAtual)
      );
      
      if (faturaAtual) {
        byCard.set(cartao.id, faturaAtual.total_value || 0);
      }
    }
    
    return byCard;
  }, [cartoes, faturas]);

  return { 
    cartoes, 
    faturas, 
    comprasParceladas,
    transacoesPorCartao,
    isLoading: isLoadingCartoes || isLoadingFaturas || isLoadingCompras
  };
}
