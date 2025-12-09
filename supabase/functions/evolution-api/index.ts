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

    // Criar nova instância WhatsApp
    if (action === 'create_instance') {
      const { client_slug } = body;
      const newInstanceName = `${client_slug || 'whatsapp'}-${Date.now()}`;
      
      console.log(`Creating new instance: ${newInstanceName}`);
      
      // POST /instance/create
      const url = `${baseUrl}/instance/create`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: newInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      console.log(`Create instance response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error creating instance: ${errorText}`);
        throw new Error(`Failed to create instance: ${errorText}`);
      }

      const result = await response.json();
      console.log(`Instance created:`, JSON.stringify(result));
      
      // Salvar instância no Supabase
      const { error: dbError } = await supabase
        .from('whatsapp_instances')
        .upsert({
          instance_name: newInstanceName,
          client_slug: client_slug || 'default',
          is_active: true,
          is_connected: false,
        }, { onConflict: 'instance_name' });

      if (dbError) {
        console.error('Error saving instance to DB:', dbError);
      }

      // Extrair QR code da resposta
      const qrCode = result?.qrcode?.base64 || result?.base64 || result?.qr || null;
      const pairingCode = result?.qrcode?.pairingCode || result?.pairingCode || null;

      return new Response(JSON.stringify({ 
        success: true, 
        instance_name: newInstanceName,
        qrcode: qrCode,
        pairingCode: pairingCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obter QR code de uma instância existente
    if (action === 'get_qrcode') {
      console.log(`Getting QR code for instance: ${instance_name}`);
      
      // GET /instance/connect/{instance}
      const url = `${baseUrl}/instance/connect/${instance_name}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Get QR code response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error getting QR code: ${errorText}`);
        
        // Se a instância não existe, criar uma nova
        if (response.status === 404 || errorText.includes('not found')) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Instance not found',
            create_new: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Failed to get QR code: ${errorText}`);
      }

      const result = await response.json();
      console.log(`QR code result:`, JSON.stringify(result));
      
      const qrCode = result?.base64 || result?.qrcode?.base64 || result?.qr || null;
      const pairingCode = result?.pairingCode || result?.qrcode?.pairingCode || null;

      return new Response(JSON.stringify({ 
        success: true, 
        instance_name: instance_name,
        qrcode: qrCode,
        pairingCode: pairingCode,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar status de conexão diretamente na Evolution API
    if (action === 'check_connection') {
      // GET /instance/connectionState/{instance}
      const url = `${baseUrl}/instance/connectionState/${instance_name}`;
      console.log(`Checking connection status from: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        console.log(`Connection check response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error checking connection: ${errorText}`);
          
          // Se a instância não existe ou está desconectada
          if (response.status === 404 || errorText.includes('not found') || errorText.includes('does not exist')) {
            return new Response(JSON.stringify({ 
              success: true, 
              connected: false,
              state: 'not_found',
              message: 'Instância não encontrada'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            connected: false,
            state: 'error',
            message: 'Erro ao verificar conexão'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const result = await response.json();
        console.log(`Connection state result:`, JSON.stringify(result));
        
        // A Evolution API retorna { instance: { instanceName, state } }
        // state pode ser: 'open', 'close', 'connecting'
        const state = result?.instance?.state || result?.state || 'unknown';
        const isConnected = state === 'open';

        return new Response(JSON.stringify({ 
          success: true, 
          connected: isConnected,
          state: state,
          instanceName: result?.instance?.instanceName || instance_name
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('Connection check error:', err);
        return new Response(JSON.stringify({ 
          success: true, 
          connected: false,
          state: 'error',
          message: 'Erro ao verificar conexão'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'find_chats') {
      // Buscar APENAS chats reais (sem adicionar contatos da agenda)
      const chatsUrl = `${baseUrl}/chat/findChats/${instance_name}`;
      console.log(`Fetching chats from: ${chatsUrl}`);

      let chatsData: any[] = [];

      try {
        const chatsResponse = await fetch(chatsUrl, {
          method: 'POST',
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        console.log(`Chats response status: ${chatsResponse.status}`);

        if (chatsResponse.ok) {
          const responseData = await chatsResponse.json();
          if (Array.isArray(responseData)) {
            chatsData = responseData;
            console.log(`Found ${chatsData.length} real chats`);
          }
        } else {
          const errorText = await chatsResponse.text();
          console.error(`Error fetching chats: ${errorText}`);
          
          if (errorText.includes('Connection Closed') || errorText.includes('not connected')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'WhatsApp desconectado. Por favor, reconecte escaneando o QR code novamente.',
              disconnected: true
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (err) {
        console.error('Error fetching chats:', err);
      }

      console.log(`Total chats to save: ${chatsData.length}`);

      // Salvar chats no Supabase (APENAS chats reais)
      if (chatsData.length > 0) {
        for (const chat of chatsData) {
          const remoteJid = chat.remoteJid || chat.id || chat.jid;
          if (!remoteJid) continue;

          // Usar apenas dados que vêm diretamente do chat
          const pushName = chat.pushName || chat.name || chat.notify || null;
          const profilePic = chat.profilePicUrl || chat.imgUrl || null;

          const chatData = {
            instance_name,
            remote_jid: remoteJid,
            push_name: pushName,
            profile_pic_url: profilePic,
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

      // === DELETAR CHATS QUE NÃO EXISTEM MAIS NO WHATSAPP ===
      // Criar lista de remote_jids que vieram do WhatsApp
      const whatsappJids = new Set(
        chatsData
          .map(c => c.remoteJid || c.id || c.jid)
          .filter(Boolean)
      );
      
      console.log(`WhatsApp has ${whatsappJids.size} chats`);

      // Buscar todos os chats desta instância no banco
      const { data: dbChats, error: dbError } = await supabase
        .from('evolution_chats')
        .select('id, remote_jid')
        .eq('instance_name', instance_name);

      if (!dbError && dbChats) {
        // Deletar chats que não existem mais no WhatsApp
        for (const dbChat of dbChats) {
          if (!whatsappJids.has(dbChat.remote_jid)) {
            console.log(`Deleting chat no longer in WhatsApp: ${dbChat.remote_jid}`);
            
            // Deletar mensagens primeiro
            await supabase
              .from('evolution_messages')
              .delete()
              .eq('chat_id', dbChat.id);
            
            // Deletar o chat
            await supabase
              .from('evolution_chats')
              .delete()
              .eq('id', dbChat.id);
          }
        }
      }

      // === MESCLAR CHATS DUPLICADOS ===
      // Buscar todos os chats desta instância
      const { data: existingChats, error: fetchError } = await supabase
        .from('evolution_chats')
        .select('id, remote_jid, push_name, last_message_at, unread_count')
        .eq('instance_name', instance_name);

      if (!fetchError && existingChats && existingChats.length > 0) {
        // Agrupar chats pelo número de telefone (extrair número do JID)
        const phoneGroups: Record<string, typeof existingChats> = {};
        
        for (const chat of existingChats) {
          // Extrair número do remote_jid
          // Formatos: 5511999999999@s.whatsapp.net, 5511999999999@lid, grupo@g.us
          const jid = chat.remote_jid;
          
          // Pular grupos
          if (jid.includes('@g.us')) continue;
          
          // Extrair o número (remover sufixos)
          const phoneMatch = jid.match(/^(\d+)@/);
          if (!phoneMatch) continue;
          
          const phone = phoneMatch[1];
          
          if (!phoneGroups[phone]) {
            phoneGroups[phone] = [];
          }
          phoneGroups[phone].push(chat);
        }
        
        // Para cada grupo com mais de um chat, mesclar
        let mergedCount = 0;
        for (const [phone, chatsGroup] of Object.entries(phoneGroups)) {
          if (chatsGroup.length <= 1) continue;
          
          console.log(`Found ${chatsGroup.length} duplicate chats for phone ${phone}`);
          
          // Escolher o chat principal:
          // 1. Preferir o que tem push_name
          // 2. Se empatar, preferir @s.whatsapp.net sobre @lid
          // 3. Se ainda empatar, preferir o mais recente
          chatsGroup.sort((a, b) => {
            // Preferir com push_name
            if (a.push_name && !b.push_name) return -1;
            if (!a.push_name && b.push_name) return 1;
            
            // Preferir @s.whatsapp.net
            const aIsNormal = a.remote_jid.includes('@s.whatsapp.net');
            const bIsNormal = b.remote_jid.includes('@s.whatsapp.net');
            if (aIsNormal && !bIsNormal) return -1;
            if (!aIsNormal && bIsNormal) return 1;
            
            // Preferir mais recente
            const aDate = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const bDate = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return bDate - aDate;
          });
          
          const primaryChat = chatsGroup[0];
          const duplicateChats = chatsGroup.slice(1);
          
          console.log(`Primary chat: ${primaryChat.remote_jid} (${primaryChat.push_name})`);
          console.log(`Duplicates to merge: ${duplicateChats.map(c => c.remote_jid).join(', ')}`);
          
          for (const duplicate of duplicateChats) {
            // Mover todas as mensagens do chat duplicado para o principal
            const { error: moveError } = await supabase
              .from('evolution_messages')
              .update({ 
                chat_id: primaryChat.id,
                remote_jid: primaryChat.remote_jid
              })
              .eq('chat_id', duplicate.id);
            
            if (moveError) {
              console.error(`Error moving messages from ${duplicate.remote_jid}:`, moveError);
              continue;
            }
            
            // Deletar o chat duplicado
            const { error: deleteError } = await supabase
              .from('evolution_chats')
              .delete()
              .eq('id', duplicate.id);
            
            if (deleteError) {
              console.error(`Error deleting duplicate chat ${duplicate.remote_jid}:`, deleteError);
            } else {
              console.log(`Merged and deleted duplicate: ${duplicate.remote_jid}`);
              mergedCount++;
            }
          }
        }
        
        if (mergedCount > 0) {
          console.log(`=== Merged ${mergedCount} duplicate chats ===`);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        chats: chatsData.length 
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
        
        // Detectar erro de conexão fechada
        if (errorText.includes('Connection Closed') || errorText.includes('not connected')) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'WhatsApp desconectado. Por favor, reconecte escaneando o QR code novamente.',
            disconnected: true
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
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

      // Determinar o formato correto do número
      // @lid = Business ID interno, precisa enviar o remoteJid completo
      // @g.us = Grupo, precisa enviar o remoteJid completo  
      // @s.whatsapp.net = Número normal, pode extrair só o número
      const isGroup = remote_jid.includes('@g.us');
      const isLid = remote_jid.includes('@lid');
      
      let requestBody;
      if (isGroup || isLid) {
        // Para grupos e contatos @lid, enviar o remoteJid completo
        requestBody = { number: remote_jid, text };
      } else {
        // Para contatos normais @s.whatsapp.net, extrair só o número
        requestBody = { number: remote_jid.replace('@s.whatsapp.net', ''), text };
      }
      
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
        
        // Detectar erro de conexão fechada
        if (errorText.includes('Connection Closed') || errorText.includes('not connected')) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'WhatsApp desconectado. Por favor, reconecte escaneando o QR code novamente.',
            disconnected: true
          }), {
            status: 200, // Retornar 200 para o frontend tratar
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
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

    // Sincronizar contatos da agenda do WhatsApp
    if (action === 'sync_contacts') {
      console.log(`Syncing contacts for instance: ${instance_name}`);
      
      // POST /chat/findContacts/{instance}
      const contactsUrl = `${baseUrl}/chat/findContacts/${instance_name}`;
      console.log(`Fetching contacts from: ${contactsUrl}`);

      try {
        const contactsResponse = await fetch(contactsUrl, {
          method: 'POST',
          headers: {
            'apikey': EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        console.log(`Contacts response status: ${contactsResponse.status}`);

        if (!contactsResponse.ok) {
          const errorText = await contactsResponse.text();
          console.error(`Error fetching contacts: ${errorText}`);
          
          if (errorText.includes('Connection Closed') || errorText.includes('not connected')) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'WhatsApp desconectado. Por favor, reconecte escaneando o QR code novamente.',
              disconnected: true
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          
          throw new Error(`Evolution API error: ${contactsResponse.status} - ${errorText}`);
        }

        const contactsData = await contactsResponse.json();
        console.log(`Contacts data type: ${typeof contactsData}, isArray: ${Array.isArray(contactsData)}`);
        
        if (!Array.isArray(contactsData)) {
          console.log(`Contacts response:`, JSON.stringify(contactsData));
          return new Response(JSON.stringify({ 
            success: true, 
            contacts: 0,
            message: 'No contacts array returned' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log(`Found ${contactsData.length} contacts to process`);

        let updatedCount = 0;
        
        for (const contact of contactsData) {
          const contactJid = contact.id || contact.remoteJid;
          // O nome pode vir de diferentes campos
          const contactName = contact.name || contact.pushName || contact.notify || contact.verifiedName;
          
          if (!contactJid) continue;
          
          console.log(`Processing contact: ${contactJid} - Name: ${contactName}`);
          
          // Atualizar o push_name no chat correspondente se tiver nome
          if (contactName) {
            const { error: updateError, count } = await supabase
              .from('evolution_chats')
              .update({ 
                push_name: contactName,
                updated_at: new Date().toISOString()
              })
              .eq('instance_name', instance_name)
              .eq('remote_jid', contactJid);

            if (updateError) {
              console.error(`Error updating chat for ${contactJid}:`, updateError);
            } else {
              updatedCount++;
              console.log(`Updated chat name for ${contactJid} to: ${contactName}`);
            }
          }
        }

        console.log(`Successfully updated ${updatedCount} contact names`);

        return new Response(JSON.stringify({ 
          success: true, 
          contacts: contactsData.length,
          updated: updatedCount
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (err) {
        console.error('Error syncing contacts:', err);
        throw err;
      }
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
