import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type BarrilLocalizacao = 'LOJA' | 'CLIENTE';
export type BarrilStatusConteudo = 'CHEIO' | 'VAZIO';
export type BarrilTipoMovimento = 'SAIDA' | 'RETORNO';

export interface Barril {
  id: string;
  codigo: string;
  capacidade: number;
  localizacao: BarrilLocalizacao;
  status_conteudo: BarrilStatusConteudo;
  cliente_id: string | null;
  lojista_id: string | null;
  data_ultima_movimentacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
  };
  lojista?: {
    id: string;
    nome: string;
    nome_fantasia: string | null;
  };
}

export interface BarrilMovimentacao {
  id: string;
  barril_id: string;
  pedido_id: string | null;
  cliente_id: string | null;
  tipo_movimento: BarrilTipoMovimento;
  status_conteudo: BarrilStatusConteudo;
  localizacao_anterior: BarrilLocalizacao | null;
  localizacao_nova: BarrilLocalizacao | null;
  data_movimento: string;
  observacoes: string | null;
  created_at: string;
  barril?: {
    codigo: string;
    capacidade: number;
  };
  cliente?: {
    nome: string;
  };
  pedido?: {
    numero_pedido: number;
  };
}

export interface BarrisStats {
  total: number;
  naLoja: number;
  naLojaCheia: number;
  naLojaVazia: number;
  comClientes: number;
  comClientesCheia: number;
  comClientesVazia: number;
  pendentes: number;
}

export function useBarris() {
  return useQuery({
    queryKey: ['barris'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barris')
        .select(`
          *,
          cliente:clientes(id, nome, telefone),
          lojista:lojistas(id, nome, nome_fantasia)
        `)
        .order('codigo');
      
      if (error) throw error;
      return data as Barril[];
    }
  });
}

export function useBarrisStats() {
  return useQuery({
    queryKey: ['barris-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barris')
        .select('localizacao, status_conteudo, data_ultima_movimentacao');
      
      if (error) throw error;
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const stats: BarrisStats = {
        total: data.length,
        naLoja: data.filter(b => b.localizacao === 'LOJA').length,
        naLojaCheia: data.filter(b => b.localizacao === 'LOJA' && b.status_conteudo === 'CHEIO').length,
        naLojaVazia: data.filter(b => b.localizacao === 'LOJA' && b.status_conteudo === 'VAZIO').length,
        comClientes: data.filter(b => b.localizacao === 'CLIENTE').length,
        comClientesCheia: data.filter(b => b.localizacao === 'CLIENTE' && b.status_conteudo === 'CHEIO').length,
        comClientesVazia: data.filter(b => b.localizacao === 'CLIENTE' && b.status_conteudo === 'VAZIO').length,
        pendentes: data.filter(b => {
          if (b.localizacao !== 'CLIENTE') return false;
          if (!b.data_ultima_movimentacao) return true;
          return new Date(b.data_ultima_movimentacao) < sevenDaysAgo;
        }).length
      };
      
      return stats;
    }
  });
}

export function useBarrisByLocalizacao(localizacao: BarrilLocalizacao) {
  return useQuery({
    queryKey: ['barris', 'localizacao', localizacao],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barris')
        .select(`
          *,
          cliente:clientes(id, nome, telefone)
        `)
        .eq('localizacao', localizacao)
        .order('codigo');
      
      if (error) throw error;
      return data as Barril[];
    }
  });
}

export function useBarrisDisponiveis() {
  return useQuery({
    queryKey: ['barris', 'disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barris')
        .select('*')
        .eq('localizacao', 'LOJA')
        .is('cliente_id', null)
        .is('lojista_id', null)
        .order('codigo');
      
      if (error) throw error;
      return data as Barril[];
    }
  });
}

export function useBarrisByCliente(clienteId: string | null) {
  return useQuery({
    queryKey: ['barris', 'cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from('barris')
        .select('*')
        .eq('localizacao', 'CLIENTE')
        .eq('cliente_id', clienteId)
        .order('codigo');
      
      if (error) throw error;
      return data as Barril[];
    },
    enabled: !!clienteId
  });
}

export function useBarrisByLojista(lojistaId: string | null) {
  return useQuery({
    queryKey: ['barris', 'lojista', lojistaId],
    queryFn: async () => {
      if (!lojistaId) return [];
      
      const { data, error } = await supabase
        .from('barris')
        .select('*')
        .eq('localizacao', 'CLIENTE')
        .eq('lojista_id', lojistaId)
        .order('codigo');
      
      if (error) throw error;
      return data as Barril[];
    },
    enabled: !!lojistaId
  });
}

export function useBarrilMovimentacoes(barrilId?: string) {
  return useQuery({
    queryKey: ['barril-movimentacoes', barrilId],
    queryFn: async () => {
      let query = supabase
        .from('barril_movimentacoes')
        .select(`
          *,
          barril:barris(codigo, capacidade),
          cliente:clientes(nome),
          pedido:pedidos(numero_pedido)
        `)
        .order('data_movimento', { ascending: false })
        .limit(100);
      
      if (barrilId) {
        query = query.eq('barril_id', barrilId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as BarrilMovimentacao[];
    }
  });
}
