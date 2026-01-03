import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalizar JID para usar sempre o formato @s.whatsapp.net com número puro
function normalizeRemoteJid(jid: string): { normalizedJid: string; originalJid: string; isGroup: boolean } {
  const originalJid = jid;
  const isGroup = jid.includes('@g.us');
  
  if (isGroup) {
    return { normalizedJid: jid, originalJid, isGroup: true };
  }
  
  // Extrair apenas números do JID
  let phone = jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')
    .replace('@lid', '')
    .replace(/\D/g, '');
  
  // Se não conseguir extrair número, retorna original
  if (!phone || phone.length < 8) {
    return { normalizedJid: jid, originalJid, isGroup: false };
  }
  
  // Normalizar para formato @s.whatsapp.net
  const normalizedJid = `${phone}@s.whatsapp.net`;
  
  return { normalizedJid, originalJid, isGroup: false };
}

serve(async (req) => {
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
    console.log('Event:', body.event, 'Instance:', body.instance);

    const event = body.event;
    const instance = body.instance;
    const data = body.data;

    if (!instance) {
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de mensagem
    if (event === 'messages.upsert') {
      let messageData: any = null;
      
      if (Array.isArray(data)) {
        messageData = data[0];
      } else if (data.message) {
        messageData = data.message;
      } else {
        messageData = data;
      }

      const key = messageData?.key || {};
      const rawRemoteJid = key.remoteJid || messageData?.remoteJid || data?.remoteJid;
      const messageId = key.id || messageData?.id || data?.id;
      const fromMe = key.fromMe ?? messageData?.fromMe ?? false;

      console.log('Raw remoteJid:', rawRemoteJid, 'messageId:', messageId, 'fromMe:', fromMe);

      if (!rawRemoteJid || !messageId) {
        return new Response(JSON.stringify({ success: true, ignored: true, reason: 'no_jid_or_id' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Normalizar o JID para sempre usar o mesmo formato
      const { normalizedJid, originalJid, isGroup } = normalizeRemoteJid(rawRemoteJid);
      
      console.log('Normalized JID:', normalizedJid, 'from original:', originalJid);

      // Extrair corpo da mensagem
      const messageContent = messageData?.message || data?.message?.message || {};
      const messageBody = messageContent.conversation || 
                   messageContent.extendedTextMessage?.text ||
                   messageContent.imageMessage?.caption ||
                   messageContent.videoMessage?.caption ||
                   messageContent.documentMessage?.caption ||
                   messageData?.body ||
                   data?.body ||
                   null;

      // Determinar tipo de mensagem
      const messageType = messageContent.imageMessage ? 'image' :
                          messageContent.videoMessage ? 'video' :
                          messageContent.audioMessage ? 'audio' :
                          messageContent.documentMessage ? 'document' :
                          messageContent.stickerMessage ? 'sticker' :
                          messageContent.locationMessage ? 'location' :
                          messageContent.contactMessage ? 'contact' :
                          messageData?.messageType || 'text';

      // Extrair URL de mídia
      const mediaUrl = messageContent.imageMessage?.url ||
                       messageContent.videoMessage?.url ||
                       messageContent.audioMessage?.url ||
                       messageContent.documentMessage?.url ||
                       messageData?.mediaUrl ||
                       null;

      // Timestamp
      const rawTimestamp = messageData?.messageTimestamp || 
                           data?.messageTimestamp || 
                           messageData?.timestamp ||
                           data?.timestamp;
      
      let timestamp: string;
      if (rawTimestamp) {
        const ts = Number(rawTimestamp);
        timestamp = ts > 1e12 ? new Date(ts).toISOString() : new Date(ts * 1000).toISOString();
      } else {
        timestamp = new Date().toISOString();
      }

      // Buscar chat existente pelo JID normalizado
      let chatId: string | null = null;
      
      const { data: existingChat } = await supabase
        .from('evolution_chats')
        .select('id, push_name')
        .eq('instance_name', instance)
        .eq('remote_jid', normalizedJid)
        .single();

      if (existingChat) {
        chatId = existingChat.id;
        console.log('Found existing chat:', chatId);
        
        // Atualizar push_name se veio da mensagem e não tínhamos antes
        const incomingPushName = messageData?.pushName || data?.pushName;
        if (incomingPushName && !existingChat.push_name) {
          await supabase
            .from('evolution_chats')
            .update({ push_name: incomingPushName })
            .eq('id', chatId);
        }
      } else {
        // Criar chat com JID normalizado
        const pushName = messageData?.pushName || data?.pushName || null;

        console.log('Creating new chat for:', normalizedJid, 'pushName:', pushName);

        const { data: newChat, error: chatError } = await supabase
          .from('evolution_chats')
          .insert({
            instance_name: instance,
            remote_jid: normalizedJid,
            push_name: pushName,
            is_group: isGroup,
            last_message: messageBody,
            last_message_at: timestamp,
            unread_count: fromMe ? 0 : 1,
          })
          .select('id')
          .single();

        if (chatError) {
          console.error('Error creating chat:', chatError);
        } else {
          chatId = newChat?.id || null;
          console.log('Created new chat:', chatId);
        }
      }

      // Salvar mensagem com JID normalizado
      const msgRecord = {
        chat_id: chatId,
        instance_name: instance,
        remote_jid: normalizedJid,
        message_id: messageId,
        from_me: fromMe,
        body: messageBody,
        message_type: messageType,
        media_url: mediaUrl,
        timestamp: timestamp,
        status: messageData?.status || null,
      };

      const { error: msgError } = await supabase
        .from('evolution_messages')
        .upsert(msgRecord, { onConflict: 'instance_name,message_id' });

      if (msgError) {
        console.error('Error saving message:', msgError);
      } else {
        console.log('Message saved successfully');
      }

      // Atualizar chat com última mensagem
      if (chatId) {
        const updateData: any = {
          last_message: messageBody,
          last_message_at: timestamp,
          updated_at: new Date().toISOString(),
        };

        if (!fromMe) {
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

      return new Response(JSON.stringify({ 
        success: true, 
        message_id: messageId,
        chat_id: chatId,
        normalized_jid: normalizedJid,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar eventos de status de mensagem
    if (event === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        const key = update.key || {};
        const messageId = key.id || update.id;
        const status = update.update?.status || update.status;

        if (messageId && status) {
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
      const state = data.state || data.status;
      const isConnected = state === 'open';

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
      const rawJid = data.remoteJid || data.id;
      
      if (rawJid) {
        const { normalizedJid } = normalizeRemoteJid(rawJid);
        
        await supabase
          .from('evolution_chats')
          .update({ unread_count: 0 })
          .eq('instance_name', instance)
          .eq('remote_jid', normalizedJid);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
