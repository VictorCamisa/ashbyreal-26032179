import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { Lead } from '@/types/lead';

type LeadRow = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];

// Convert database row to Lead type
function dbRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
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

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []).map(dbRowToLead));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar leads',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLead = async (leadData: Partial<LeadInsert>) => {
    try {
      setIsCreating(true);
      
      // Create lead
      const { data: leadResult, error: leadError } = await supabase
        .from('leads')
        .insert({
          nome: leadData.nome!,
          telefone: leadData.telefone!,
          email: leadData.email,
          origem: leadData.origem!,
          status: leadData.status || 'novo_lead',
          valor_estimado: leadData.valor_estimado || 0,
          observacoes: leadData.observacoes,
          responsavel: leadData.responsavel,
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Automatically create corresponding client
      const { error: clientError } = await supabase
        .from('clientes')
        .insert({
          nome: leadData.nome!,
          telefone: leadData.telefone!,
          email: leadData.email || '',
          origem: leadData.origem!,
          status: 'lead',
          ticket_medio: leadData.valor_estimado || 0,
          observacoes: leadData.observacoes,
        });

      if (clientError) {
        // If client creation fails, log it but don't throw
        console.error('Failed to create client:', clientError);
      }

      toast({
        title: 'Lead criado com sucesso!',
        description: `${leadResult.nome} foi adicionado ao pipeline e à base de clientes.`,
      });

      await fetchLeads();
      return leadResult;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar lead',
        description: error.message,
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateLead = async (id: string, updates: Partial<LeadInsert>) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lead atualizado com sucesso!',
      });

      await fetchLeads();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar lead',
        description: error.message,
      });
      throw error;
    }
  };

  const updateLeadStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      await fetchLeads();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lead removido com sucesso!',
      });

      await fetchLeads();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover lead',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return {
    leads,
    isLoading,
    isCreating,
    createLead,
    updateLead,
    updateLeadStatus,
    deleteLead,
    refetch: fetchLeads,
  };
}
