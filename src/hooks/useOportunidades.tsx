import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/types/lead';

interface OportunidadeRow {
  id: string;
  cliente_id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem: string;
  status: string | null;
  valor_estimado: number | null;
  data_criacao: string | null;
  ultima_atualizacao: string | null;
  observacoes: string | null;
  responsavel: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Convert database row to Lead type (keeping type for compatibility)
function dbRowToOportunidade(row: OportunidadeRow): Lead & { clienteId: string } {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email || undefined,
    origem: row.origem as any,
    status: row.status as any,
    valorEstimado: Number(row.valor_estimado) || 0,
    dataCriacao: row.data_criacao || '',
    ultimaAtualizacao: row.ultima_atualizacao || '',
    observacoes: row.observacoes || undefined,
    responsavel: row.responsavel || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export function useOportunidades() {
  const [oportunidades, setOportunidades] = useState<(Lead & { clienteId: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchOportunidades = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOportunidades((data || []).map((row: any) => dbRowToOportunidade(row)));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar oportunidades',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createOportunidade = async (data: {
    cliente_id: string;
    nome: string;
    telefone: string;
    email?: string | null;
    origem: string;
    status?: string;
    valor_estimado?: number;
    observacoes?: string;
    responsavel?: string;
  }) => {
    try {
      setIsCreating(true);
      
      const { data: result, error } = await supabase
        .from('leads')
        .insert({
          cliente_id: data.cliente_id,
          nome: data.nome,
          telefone: data.telefone,
          email: data.email,
          origem: data.origem,
          status: data.status || 'novo_lead',
          valor_estimado: data.valor_estimado || 0,
          observacoes: data.observacoes,
          responsavel: data.responsavel,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Oportunidade criada!',
        description: `Nova oportunidade para ${data.nome} foi adicionada ao pipeline.`,
      });

      await fetchOportunidades();
      return result;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar oportunidade',
        description: error.message,
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateOportunidadeStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      await fetchOportunidades();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteOportunidade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Oportunidade removida!',
      });

      await fetchOportunidades();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover oportunidade',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchOportunidades();
  }, []);

  return {
    oportunidades,
    // Keep leads alias for backward compatibility
    leads: oportunidades,
    isLoading,
    isCreating,
    createOportunidade,
    // Keep createLead alias for backward compatibility  
    createLead: createOportunidade,
    updateOportunidadeStatus,
    updateLeadStatus: updateOportunidadeStatus,
    deleteOportunidade,
    deleteLead: deleteOportunidade,
    refetch: fetchOportunidades,
  };
}

// Keep useLeads as alias for backward compatibility
export const useLeads = useOportunidades;
