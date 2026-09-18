import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Cadastro unificado derivado dos pedidos.
 *
 * A tela de Clientes lia só a tabela `clientes`, então os pedidos B2B ligados a
 * `lojistas` — a maior fatia do faturamento — não apareciam. Esta view cruza os
 * pedidos e devolve uma linha por contraparte real, cliente ou lojista.
 */
export interface ContraparteUnificada {
  id: string;
  tipo_cadastro: 'cliente' | 'lojista';
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  cidade: string | null;
  status: string | null;
  origem: string | null;
  observacoes: string | null;
  pedidos: number;
  faturamento: number;
  ticket_medio: number | null;
  primeiro_pedido: string | null;
  ultimo_pedido: string | null;
  pedidos_pendentes: number;
  dias_sem_comprar: number | null;
  segmento: 'B2B' | 'B2C' | 'indefinido';
  pendencias: string[];
  precisa_revisao: boolean;
}

export function useClientesUnificados() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clientes-unificados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes_unificados' as never)
        .select('*')
        .order('faturamento', { ascending: false });

      if (error) throw error;

      // A view devolve numeric como string no PostgREST.
      return ((data ?? []) as unknown as ContraparteUnificada[]).map((linha) => ({
        ...linha,
        pedidos: Number(linha.pedidos ?? 0),
        faturamento: Number(linha.faturamento ?? 0),
        ticket_medio: linha.ticket_medio === null ? null : Number(linha.ticket_medio),
        pedidos_pendentes: Number(linha.pedidos_pendentes ?? 0),
        dias_sem_comprar: linha.dias_sem_comprar === null ? null : Number(linha.dias_sem_comprar),
        pendencias: linha.pendencias ?? [],
      }));
    },
  });

  return { contrapartes: data ?? [], isLoading, error };
}
