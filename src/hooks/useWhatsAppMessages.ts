import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface WhatsAppMessage {
  id: string;
  instance_id: string;
  remote_jid: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  content: string | null;
  media_url: string | null;
  status: string;
  external_id: string | null;
  metadata: {
    sender_name?: string;
    push_name?: string;
    phone_number?: string;
    profile_picture?: string;
    remote_jid_raw?: string;
    remote_jid_alt?: string | null;
  };
  created_at: string;
}

export interface Conversation {
  /** Primary JID used for selection/sending (prefer @s.whatsapp.net). */
  remote_jid: string;
  /** All JIDs that should be considered the same conversation (e.g. primary + @lid aliases). */
  remote_jids: string[];
  contact_name: string;
  phone_number: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  instance_id: string;
}

export function useWhatsAppMessages(instanceId: string | null) {
  const queryClient = useQueryClient();

  // Get all conversations (grouped by remote_jid)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['whatsapp-conversations', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizeJid = (jid: string) => jid.replace(/:\d+(?=@lid)/g, '');

      // Build a mapping lidJid(normalized) -> realJid(raw) using metadata on messages that already have both.
      const lidToReal = new Map<string, string>();
      for (const msg of data || []) {
        const jidRaw = String(msg.remote_jid);
        const metadata = (msg.metadata as WhatsAppMessage['metadata']) || {};

        const altRaw = metadata.remote_jid_alt ? String(metadata.remote_jid_alt) : null;
        const altNorm = altRaw ? normalizeJid(altRaw) : null;

        // When the stored jid is real, and the metadata contains the @lid alias, link them.
        if (jidRaw.includes('@s.whatsapp.net') && altNorm && altNorm.includes('@lid')) {
          lidToReal.set(altNorm, jidRaw);
        }

        // Some payloads store the raw @lid in remote_jid_raw while saving the real jid.
        const rawAlt = metadata.remote_jid_raw ? String(metadata.remote_jid_raw) : null;
        const rawNorm = rawAlt ? normalizeJid(rawAlt) : null;
        if (jidRaw.includes('@s.whatsapp.net') && rawNorm && rawNorm.includes('@lid')) {
          lidToReal.set(rawNorm, jidRaw);
        }
      }

      // Group messages by primary jid (prefer the real jid if we can map it).
      const conversationsMap = new Map<string, Conversation>();

      for (const msg of data || []) {
        const msgJidRaw = String(msg.remote_jid);
        const msgJidNorm = normalizeJid(msgJidRaw);
        const primaryJidRaw = lidToReal.get(msgJidNorm) ?? msgJidRaw;

        const metadata = (msg.metadata as WhatsAppMessage['metadata']) || {};
        const phoneNumber = primaryJidRaw.split('@')[0];
        const contactName =
          metadata.sender_name ||
          metadata.push_name ||
          (primaryJidRaw.includes('@s.whatsapp.net') ? phoneNumber : msgJidNorm.split('@')[0]);

        if (!conversationsMap.has(primaryJidRaw)) {
          conversationsMap.set(primaryJidRaw, {
            remote_jid: primaryJidRaw,
            remote_jids: [primaryJidRaw],
            contact_name: contactName,
            phone_number: phoneNumber,
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
            instance_id: instanceId,
          });
        }

        const conv = conversationsMap.get(primaryJidRaw)!;

        // Track all variants (RAW, as stored in DB) that belong to this conversation.
        if (!conv.remote_jids.includes(msgJidRaw)) conv.remote_jids.push(msgJidRaw);

        const altRaw = metadata.remote_jid_alt ? String(metadata.remote_jid_alt) : null;
        const altNorm = altRaw ? normalizeJid(altRaw) : null;
        if (altRaw && altNorm && altNorm.includes('@lid') && !conv.remote_jids.includes(altRaw)) {
          conv.remote_jids.push(altRaw);
        }

        const rawAlt = metadata.remote_jid_raw ? String(metadata.remote_jid_raw) : null;
        const rawAltNorm = rawAlt ? normalizeJid(rawAlt) : null;
        if (rawAlt && rawAltNorm && rawAltNorm.includes('@lid') && !conv.remote_jids.includes(rawAlt)) {
          conv.remote_jids.push(rawAlt);
        }

        // Keep last message updated (data is desc, but merging can change ordering).
        if (!conv.last_message_at || new Date(msg.created_at).getTime() > new Date(conv.last_message_at).getTime()) {
          conv.last_message = msg.content;
          conv.last_message_at = msg.created_at;
        }

        // Improve contact name from inbound messages when possible.
        if (msg.direction === 'inbound') {
          const senderName = metadata.sender_name || metadata.push_name;
          if (senderName && (conv.contact_name === conv.phone_number || /^\d+$/.test(conv.contact_name))) {
            conv.contact_name = senderName;
          }
        }
      }

      return Array.from(conversationsMap.values()).sort((a, b) => {
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: !!instanceId,
  });

  // Get messages for a specific conversation (supports merged @lid + real JIDs)
  const getMessages = (conversation: Conversation | null) => {
    return useQuery({
      queryKey: ['whatsapp-messages', instanceId, conversation?.remote_jid, (conversation?.remote_jids || []).slice().sort().join('|')],
      queryFn: async () => {
        if (!instanceId || !conversation) return [];

        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('instance_id', instanceId)
          .in('remote_jid', conversation.remote_jids)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as WhatsAppMessage[];
      },
      enabled: !!instanceId && !!conversation,
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      instanceName,
      remoteJid,
      message,
      messageType = 'text',
      mediaUrl,
    }: {
      instanceName: string;
      remoteJid: string;
      message: string;
      messageType?: string;
      mediaUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: { instanceName, remoteJid, message, messageType, mediaUrl },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!instanceId) return;

    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `instance_id=eq.${instanceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient]);

  return {
    conversations,
    loadingConversations,
    getMessages,
    sendMessage,
  };
}
