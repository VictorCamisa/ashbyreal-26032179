import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();

    console.log('=== Evolution Webhook Received ===');
    console.log('Event type:', body.event);
    console.log('Instance:', body.instance);

    const event = body.event;
    const instance = body.instance;
    const data = body.data;

    if (!instance || !data) {
      console.log('Missing instance or data, ignoring event');
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de mensagem
    if (event === 'messages.upsert') {
      console.log('Processing message upsert event');
      
      const message = data.message || data;
      const key = message.key || {};
      const remoteJid = key.remoteJid || data.remoteJid;
      const messageId = key.id || message.id;
      const fromMe = key.fromMe || false;

      if (!remoteJid || !messageId) {
        console.log('Missing remoteJid or messageId, ignoring');
        return new Response(JSON.stringify({ success: true, ignored: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Message from: ${remoteJid}, fromMe: ${fromMe}, id: ${messageId}`);

      // Extrair corpo da mensagem
      const messageContent = message.message || {};
      const body = messageContent.conversation || 
                   messageContent.extendedTextMessage?.text ||
                   messageContent.imageMessage?.caption ||
                   messageContent.videoMessage?.caption ||
                   messageContent.documentMessage?.caption ||
                   null;

      // Determinar tipo de mensagem
      const messageType = messageContent.imageMessage ? 'image' :
                          messageContent.videoMessage ? 'video' :
                          messageContent.audioMessage ? 'audio' :
                          messageContent.documentMessage ? 'document' :
                          messageContent.stickerMessage ? 'sticker' :
                          messageContent.locationMessage ? 'location' :
                          messageContent.contactMessage ? 'contact' :
                          'text';

      // Extrair URL de mídia
      const mediaUrl = messageContent.imageMessage?.url ||
                       messageContent.videoMessage?.url ||
                       messageContent.audioMessage?.url ||
                       messageContent.documentMessage?.url ||
                       null;

      // Timestamp da mensagem
      const timestamp = message.messageTimestamp 
        ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Buscar ou criar o chat
      let chatId: string | null = null;
      
      const { data: existingChat } = await supabase
        .from('evolution_chats')
        .select('id')
        .eq('instance_name', instance)
        .eq('remote_jid', remoteJid)
        .single();

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        // Criar chat se não existir
        const isGroup = remoteJid.includes('@g.us');
        const pushName = message.pushName || data.pushName || null;

        console.log(`Creating new chat for: ${remoteJid}`);

        const { data: newChat, error: chatError } = await supabase
          .from('evolution_chats')
          .insert({
            instance_name: instance,
            remote_jid: remoteJid,
            push_name: pushName,
            is_group: isGroup,
            last_message: body,
            last_message_at: timestamp,
            unread_count: fromMe ? 0 : 1,
          })
          .select('id')
          .single();

        if (chatError) {
          console.error('Error creating chat:', chatError);
        } else {
          chatId = newChat?.id || null;
        }
      }

      // Salvar mensagem
      const messageData = {
        chat_id: chatId,
        instance_name: instance,
        remote_jid: remoteJid,
        message_id: messageId,
        from_me: fromMe,
        body: body,
        message_type: messageType,
        media_url: mediaUrl,
        timestamp: timestamp,
        status: message.status || null,
      };

      console.log('Saving message:', messageId);

      const { error: msgError } = await supabase
        .from('evolution_messages')
        .upsert(messageData, { onConflict: 'instance_name,message_id' });

      if (msgError) {
        console.error('Error saving message:', msgError);
      } else {
        console.log('Message saved successfully');
      }

      // Atualizar chat com última mensagem
      if (chatId) {
        const updateData: any = {
          last_message: body,
          last_message_at: timestamp,
          updated_at: new Date().toISOString(),
        };

        // Incrementar contador de não lidas se não for mensagem nossa
        if (!fromMe) {
          // Buscar contador atual
          const { data: currentChat } = await supabase
            .from('evolution_chats')
            .select('unread_count')
            .eq('id', chatId)
            .single();

          updateData.unread_count = (currentChat?.unread_count || 0) + 1;
        }

        await supabase
          .from('evolution_chats')
          .update(updateData)
          .eq('id', chatId);
      }

      // Verificar se precisa vincular chats do mesmo contato
      await autoLinkRelatedChats(supabase, instance, remoteJid);

      return new Response(JSON.stringify({ 
        success: true, 
        message_id: messageId,
        chat_id: chatId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de status de mensagem
    if (event === 'messages.update') {
      console.log('Processing message update event');
      
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        const key = update.key || {};
        const messageId = key.id;
        const status = update.update?.status;

        if (messageId && status) {
          console.log(`Updating message ${messageId} status to ${status}`);
          
          await supabase
            .from('evolution_messages')
            .update({ status: String(status) })
            .eq('instance_name', instance)
            .eq('message_id', messageId);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de conexão
    if (event === 'connection.update') {
      console.log('Processing connection update event');
      
      const state = data.state || data.status;
      const isConnected = state === 'open';

      console.log(`Connection state: ${state}, connected: ${isConnected}`);

      await supabase
        .from('whatsapp_instances')
        .update({ is_connected: isConnected })
        .eq('instance_name', instance);

      return new Response(JSON.stringify({ success: true, state }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de presença/leitura
    if (event === 'messages.read' || event === 'chats.update') {
      console.log('Processing read/chat update event');
      
      const remoteJid = data.remoteJid || data.id;
      
      if (remoteJid) {
        await supabase
          .from('evolution_chats')
          .update({ unread_count: 0 })
          .eq('instance_name', instance)
          .eq('remote_jid', remoteJid);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Evento não processado
    console.log('Event not handled:', event);
    return new Response(JSON.stringify({ success: true, unhandled: event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Função para vincular automaticamente chats do mesmo contato
async function autoLinkRelatedChats(supabase: any, instanceName: string, remoteJid: string) {
  try {
    // Pular grupos
    if (remoteJid.includes('@g.us')) return;

    // Extrair número do telefone
    const phoneMatch = remoteJid.match(/^(\d+)@/);
    if (!phoneMatch) return;

    const fullPhone = phoneMatch[1];
    const normalizedPhone = fullPhone.slice(-9); // últimos 9 dígitos

    // Buscar chats com números semelhantes
    const { data: relatedChats } = await supabase
      .from('evolution_chats')
      .select('id, remote_jid, linked_to_chat_id')
      .eq('instance_name', instanceName)
      .not('remote_jid', 'like', '%@g.us'); // excluir grupos

    if (!relatedChats || relatedChats.length < 2) return;

    // Filtrar chats com números similares
    const matchingChats = relatedChats.filter((chat: any) => {
      const match = chat.remote_jid.match(/^(\d+)@/);
      if (!match) return false;
      return match[1].slice(-9) === normalizedPhone;
    });

    if (matchingChats.length < 2) return;

    // Ordenar para escolher o principal (preferir @s.whatsapp.net)
    matchingChats.sort((a: any, b: any) => {
      const aIsStandard = a.remote_jid.includes('@s.whatsapp.net');
      const bIsStandard = b.remote_jid.includes('@s.whatsapp.net');
      if (aIsStandard && !bIsStandard) return -1;
      if (!aIsStandard && bIsStandard) return 1;
      return 0;
    });

    const primaryChat = matchingChats[0];
    const secondaryChats = matchingChats.slice(1);

    // Vincular chats secundários
    for (const secondary of secondaryChats) {
      if (secondary.linked_to_chat_id !== primaryChat.id) {
        console.log(`Auto-linking ${secondary.remote_jid} to ${primaryChat.remote_jid}`);
        
        await supabase
          .from('evolution_chats')
          .update({ linked_to_chat_id: primaryChat.id })
          .eq('id', secondary.id);
      }
    }
  } catch (error) {
    console.error('Error auto-linking chats:', error);
  }
}
