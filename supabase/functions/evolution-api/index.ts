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
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
      throw new Error('Evolution API credentials not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const { action, instance_name, remote_jid, text } = body;

    console.log(`=== Evolution API Request ===`);
    console.log(`Action: ${action}`);
    console.log(`Instance: ${instance_name}`);
    console.log(`RemoteJid: ${remote_jid || 'N/A'}`);

    // Remove trailing slash from URL if present
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');

    if (action === 'find_chats') {
      // POST /chat/findChats/{instance} - API v2 uses POST
      const url = `${baseUrl}/chat/findChats/${instance_name}`;
      console.log(`Fetching chats from: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching chats: ${errorText}`);
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const chats = await response.json();
      console.log(`Found ${Array.isArray(chats) ? chats.length : 0} chats`);

      // Salvar chats no Supabase
      if (Array.isArray(chats) && chats.length > 0) {
        for (const chat of chats) {
          // A API retorna diferentes estruturas dependendo do tipo
          const remoteJid = chat.remoteJid || chat.id || chat.jid;
          if (!remoteJid) continue;

          const chatData = {
            instance_name,
            remote_jid: remoteJid,
            push_name: chat.pushName || chat.name || chat.notify || null,
            profile_pic_url: chat.profilePicUrl || chat.imgUrl || null,
            unread_count: chat.unreadCount || 0,
            last_message: chat.lastMessage?.message?.conversation || 
                          chat.lastMessage?.message?.extendedTextMessage?.text || 
                          null,
            last_message_at: chat.lastMessage?.messageTimestamp 
              ? new Date(Number(chat.lastMessage.messageTimestamp) * 1000).toISOString()
              : chat.updatedAt || null,
            is_group: remoteJid.includes('@g.us'),
            updated_at: new Date().toISOString(),
          };

          console.log(`Upserting chat: ${remoteJid} - ${chatData.push_name}`);

          const { error } = await supabase
            .from('evolution_chats')
            .upsert(chatData, { onConflict: 'instance_name,remote_jid' });

          if (error) {
            console.error(`Error upserting chat ${remoteJid}:`, error);
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        chats: Array.isArray(chats) ? chats.length : 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'find_messages') {
      if (!remote_jid) {
        throw new Error('remote_jid is required for find_messages');
      }

      // POST /chat/findMessages/{instance}
      const url = `${baseUrl}/chat/findMessages/${instance_name}`;
      console.log(`Fetching messages from: ${url}`);
      console.log(`For remoteJid: ${remote_jid}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remote_jid
            }
          },
          limit: 100
        }),
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching messages: ${errorText}`);
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const messagesResponse = await response.json();
      console.log(`Raw messages response type: ${typeof messagesResponse}`);
      console.log(`Raw messages response keys: ${Object.keys(messagesResponse || {})}`);
      
      // A API v2 retorna { messages: { total, pages, currentPage, records: [...] } }
      let messages: any[] = [];
      if (Array.isArray(messagesResponse)) {
        messages = messagesResponse;
      } else if (messagesResponse?.messages?.records) {
        messages = messagesResponse.messages.records;
      } else if (messagesResponse?.messages && Array.isArray(messagesResponse.messages)) {
        messages = messagesResponse.messages;
      } else if (messagesResponse?.records) {
        messages = messagesResponse.records;
      }
      
      console.log(`Found ${messages.length} messages to process`);

      // Buscar o chat_id correspondente
      const { data: chatData } = await supabase
        .from('evolution_chats')
        .select('id')
        .eq('instance_name', instance_name)
        .eq('remote_jid', remote_jid)
        .single();

      const chatId = chatData?.id;

      // Salvar mensagens no Supabase
      if (Array.isArray(messages) && messages.length > 0) {
        for (const msg of messages) {
          const messageId = msg.key?.id || msg.id;
          if (!messageId) continue;

          const messageData = {
            chat_id: chatId,
            instance_name,
            remote_jid,
            message_id: messageId,
            from_me: msg.key?.fromMe || msg.fromMe || false,
            body: msg.message?.conversation || 
                  msg.message?.extendedTextMessage?.text ||
                  msg.message?.imageMessage?.caption ||
                  msg.message?.videoMessage?.caption ||
                  msg.message?.documentMessage?.caption ||
                  null,
            message_type: msg.message?.imageMessage ? 'image' :
                          msg.message?.videoMessage ? 'video' :
                          msg.message?.audioMessage ? 'audio' :
                          msg.message?.documentMessage ? 'document' :
                          msg.message?.stickerMessage ? 'sticker' :
                          msg.message?.locationMessage ? 'location' :
                          msg.message?.contactMessage ? 'contact' :
                          'text',
            media_url: msg.message?.imageMessage?.url ||
                       msg.message?.videoMessage?.url ||
                       msg.message?.audioMessage?.url ||
                       msg.message?.documentMessage?.url ||
                       null,
            timestamp: msg.messageTimestamp 
              ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
              : new Date().toISOString(),
            status: msg.status || null,
          };

          const { error } = await supabase
            .from('evolution_messages')
            .upsert(messageData, { onConflict: 'instance_name,message_id' });

          if (error) {
            console.error(`Error upserting message ${messageId}:`, error);
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        messages: messages.length 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send_message') {
      if (!remote_jid) {
        throw new Error('remote_jid is required for send_message');
      }

      if (!text) {
        throw new Error('text is required for send_message');
      }

      // POST /message/sendText/{instance}
      const url = `${baseUrl}/message/sendText/${instance_name}`;
      console.log(`Sending message to: ${url}`);

      // Determinar se é número ou grupo
      const isGroup = remote_jid.includes('@g.us');
      const requestBody = isGroup 
        ? { number: remote_jid, text } // Para grupos, enviar o remoteJid completo
        : { number: remote_jid.replace('@s.whatsapp.net', '').replace('@lid', ''), text };
      
      console.log(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error sending message: ${errorText}`);
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`Message sent:`, result);

      return new Response(JSON.stringify({ 
        success: true, 
        result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Edge function error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
