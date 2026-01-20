import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhatsAppInstances } from './useWhatsAppInstances';

export interface ExtractedLead {
  id: string;
  name: string;
  phone: string;
  source: 'chat' | 'group' | 'contact';
  groupName?: string;
  lastInteraction?: string;
  profilePicUrl?: string;
  isExistingClient?: boolean;
  selected?: boolean;
}

export interface GroupInfo {
  id: string;
  name: string;
  participantsCount: number;
  description?: string;
  pictureUrl?: string;
  creation?: string;
}

interface ExtractStats {
  total: number;
  new: number;
  existing: number;
}

const EVOLUTION_CONFIG_KEY = 'evolution_api_config';

function getStoredConfig() {
  try {
    const stored = localStorage.getItem(EVOLUTION_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading Evolution config:', e);
  }
  return null;
}

export function useExtractLeads() {
  const queryClient = useQueryClient();
  const { instances } = useWhatsAppInstances();
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);

  const connectedInstances = instances.filter(i => i.status === 'connected');

  const getCredentials = () => {
    const config = getStoredConfig();
    return {
      evolutionApiUrl: config?.apiUrl,
      evolutionApiKey: config?.apiKey,
    };
  };

  // Fetch chats
  const fetchChats = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('extract-leads', {
        body: {
          action: 'fetch-chats',
          instanceName,
          ...getCredentials(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { leads: ExtractedLead[]; stats: ExtractStats };
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar conversas: ${error.message}`);
    },
  });

  // Fetch groups
  const fetchGroups = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('extract-leads', {
        body: {
          action: 'fetch-groups',
          instanceName,
          ...getCredentials(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { groups: GroupInfo[] };
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar grupos: ${error.message}`);
    },
  });

  // Fetch group members
  const fetchGroupMembers = useMutation({
    mutationFn: async ({ instanceName, groupId }: { instanceName: string; groupId: string }) => {
      const { data, error } = await supabase.functions.invoke('extract-leads', {
        body: {
          action: 'fetch-group-members',
          instanceName,
          groupId,
          ...getCredentials(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { leads: ExtractedLead[]; groupName: string; stats: ExtractStats };
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar membros: ${error.message}`);
    },
  });

  // Fetch contacts
  const fetchContacts = useMutation({
    mutationFn: async (instanceName: string) => {
      const { data, error } = await supabase.functions.invoke('extract-leads', {
        body: {
          action: 'fetch-contacts',
          instanceName,
          ...getCredentials(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { leads: ExtractedLead[]; stats: ExtractStats };
    },
    onError: (error: Error) => {
      toast.error(`Erro ao buscar contatos: ${error.message}`);
    },
  });

  // Import leads as clients
  const importLeads = useMutation({
    mutationFn: async (leads: ExtractedLead[]) => {
      const { data, error } = await supabase.functions.invoke('extract-leads', {
        body: {
          action: 'import-leads',
          leads,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { 
        imported: number; 
        skipped: number; 
        errors: number;
        details: { imported: string[]; skipped: string[]; errors: string[] };
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      
      if (data.imported > 0) {
        toast.success(`${data.imported} lead(s) importado(s) com sucesso!`);
      }
      if (data.skipped > 0) {
        toast.info(`${data.skipped} contato(s) já existiam na base.`);
      }
      if (data.errors > 0) {
        toast.warning(`${data.errors} contato(s) não puderam ser importados.`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar leads: ${error.message}`);
    },
  });

  return {
    // Data
    connectedInstances,
    selectedInstance,
    setSelectedInstance,
    
    // Mutations
    fetchChats,
    fetchGroups,
    fetchGroupMembers,
    fetchContacts,
    importLeads,
    
    // Loading states
    isLoading: 
      fetchChats.isPending || 
      fetchGroups.isPending || 
      fetchGroupMembers.isPending || 
      fetchContacts.isPending ||
      importLeads.isPending,
  };
}
