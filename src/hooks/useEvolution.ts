import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface EvolutionChat {
  id: string;
  instance_name: string;
  remote_jid: string;
  canonical_jid: string;
  lid_jid: string | null;
  pn_jid: string | null;
  phone_number: string | null;
  push_name: string | null;
  profile_pic_url: string | null;
  is_group: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface EvolutionMessage {
  id: string;
  instance_name: string;
  remote_jid: string;
  source_remote_jid: string | null;
  chat_id: string;
  message_id: string;
  from_me: boolean;
  body: string | null;
  message_type: string;
  media_url: string | null;
  timestamp: string;
  status: string | null;
  created_at: string;
}

type DisconnectCallback = () => void;

export function useEvolution(instanceName: string | null, onDisconnect?: DisconnectCallback) {
  const queryClient = useQueryClient();

  const { data: chats, isLoading: loadingChats, refetch: refetchChats } = useQuery({
    queryKey: ["evolution-chats", instanceName],
    queryFn: async () => {
      if (!instanceName) return [];
      const { data, error } = await supabase
        .from("evolution_chats")
        .select("*")
        .eq("instance_name", instanceName)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as EvolutionChat[];
    },
    enabled: !!instanceName,
  });

  const getMessages = (chatId: string | null) => {
    return useQuery({
      queryKey: ["evolution-messages", chatId],
      queryFn: async () => {
        if (!chatId) return [];
        const { data, error } = await supabase
          .from("evolution_messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("timestamp", { ascending: true });
        if (error) throw error;
        return (data || []) as EvolutionMessage[];
      },
      enabled: !!chatId,
    });
  };

  const syncChats = useMutation({
    mutationFn: async () => {
      if (!instanceName) throw new Error("No instance");
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "find_chats", instance_name: instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
      toast.success("Conversas sincronizadas");
    },
    onError: () => toast.error("Erro ao sincronizar"),
  });

  const syncMessages = useMutation({
    mutationFn: async (chatId: string) => {
      if (!instanceName) throw new Error("No instance");
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "find_messages", instance_name: instanceName, chatId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-messages", chatId] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ chatId, text }: { chatId: string; text: string }) => {
      if (!instanceName) throw new Error("No instance");
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "send_message", instance_name: instanceName, chatId, text },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-messages", chatId] });
      queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
    },
    onError: () => toast.error("Erro ao enviar"),
  });

  const deleteChat = useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "delete_chat", instance_name: instanceName, chatId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
      toast.success("Conversa excluída");
    },
  });

  const syncContacts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "sync_contacts", instance_name: instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
      toast.success(`${data?.updated || 0} contatos atualizados`);
    },
  });

  const rebuildChats = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: { action: "rebuild_chats", instance_name: instanceName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
      queryClient.invalidateQueries({ queryKey: ["evolution-messages"] });
      toast.success("Conversas reconstruídas");
    },
  });

  useEffect(() => {
    if (!instanceName) return;

    const chatsChannel = supabase
      .channel("evolution-chats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "evolution_chats", filter: `instance_name=eq.${instanceName}` },
        () => queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] })
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("evolution-messages-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "evolution_messages", filter: `instance_name=eq.${instanceName}` },
        (payload) => {
          const msg = payload.new as EvolutionMessage;
          queryClient.invalidateQueries({ queryKey: ["evolution-messages", msg.chat_id] });
          queryClient.invalidateQueries({ queryKey: ["evolution-chats", instanceName] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [instanceName, queryClient]);

  return {
    chats: chats || [],
    loadingChats,
    refetchChats,
    getMessages,
    syncChats: syncChats.mutate,
    syncingChats: syncChats.isPending,
    syncMessages: syncMessages.mutate,
    syncingMessages: syncMessages.isPending,
    sendMessage: sendMessage.mutateAsync,
    sendingMessage: sendMessage.isPending,
    deleteChat: deleteChat.mutate,
    syncContacts: syncContacts.mutate,
    syncingContacts: syncContacts.isPending,
    rebuildChats: rebuildChats.mutate,
    rebuildingChats: rebuildChats.isPending,
  };
}
