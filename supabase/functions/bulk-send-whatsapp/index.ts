import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limit: 1 message per second to respect WhatsApp limits
const DELAY_BETWEEN_MESSAGES = 1500;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatPhoneToJid(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add Brazil country code if not present
  let formatted = cleaned;
  if (!formatted.startsWith('55')) {
    formatted = '55' + formatted;
  }
  
  // Remove the 9th digit for landlines or keep for mobile
  // Brazilian mobile numbers have 11 digits (2 area + 9 mobile)
  // Landlines have 10 digits (2 area + 8 number)
  
  return `${formatted}@s.whatsapp.net`;
}

function replaceVariables(template: string, cliente: any): string {
  let message = template;
  message = message.replace(/\{\{nome\}\}/gi, cliente.nome || '');
  message = message.replace(/\{\{empresa\}\}/gi, cliente.empresa || '');
  message = message.replace(/\{\{telefone\}\}/gi, cliente.telefone || '');
  message = message.replace(/\{\{email\}\}/gi, cliente.email || '');
  return message;
}

async function sendSingleMessage(
  instanceName: string,
  remoteJid: string,
  message: string,
  messageType: string = 'text',
  mediaUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let endpoint = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
    let body: any = {
      number: remoteJid,
      text: message,
    };

    if (messageType === 'image' && mediaUrl) {
      endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`;
      body = {
        number: remoteJid,
        mediatype: 'image',
        media: mediaUrl,
        caption: message,
      };
    } else if (messageType === 'audio' && mediaUrl) {
      endpoint = `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instanceName}`;
      body = {
        number: remoteJid,
        audio: mediaUrl,
      };
    } else if (messageType === 'document' && mediaUrl) {
      endpoint = `${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`;
      body = {
        number: remoteJid,
        mediatype: 'document',
        media: mediaUrl,
        caption: message,
        fileName: 'documento',
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error sending to ${remoteJid}:`, errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Exception sending to ${remoteJid}:`, error);
    return { success: false, error: errorMessage };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campanhaId, instanceName, clientes, messageTemplate, mediaUrl, mediaType } = await req.json();

    if (!campanhaId || !instanceName || !clientes || !messageTemplate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Update campaign status to in progress
    await supabase
      .from('campanhas')
      .update({ status: 'em_andamento' })
      .eq('id', campanhaId);

    console.log(`Starting bulk send for campaign ${campanhaId} with ${clientes.length} clients`);

    let enviadas = 0;
    let entregues = 0;
    let erros = 0;

    // Process each client
    for (const cliente of clientes) {
      const remoteJid = formatPhoneToJid(cliente.telefone);
      const personalizedMessage = replaceVariables(messageTemplate, cliente);

      // Update envio status to "enviando"
      await supabase
        .from('campanha_envios')
        .update({ status: 'enviando' })
        .eq('campanha_id', campanhaId)
        .eq('cliente_id', cliente.id);

      // Send message
      const result = await sendSingleMessage(
        instanceName,
        remoteJid,
        personalizedMessage,
        mediaType || 'text',
        mediaUrl
      );

      enviadas++;

      if (result.success) {
        entregues++;
        await supabase
          .from('campanha_envios')
          .update({ 
            status: 'enviado', 
            sent_at: new Date().toISOString(),
            remote_jid: remoteJid
          })
          .eq('campanha_id', campanhaId)
          .eq('cliente_id', cliente.id);
      } else {
        erros++;
        await supabase
          .from('campanha_envios')
          .update({ 
            status: 'erro', 
            error_message: result.error,
            remote_jid: remoteJid
          })
          .eq('campanha_id', campanhaId)
          .eq('cliente_id', cliente.id);
      }

      // Update campaign progress
      await supabase
        .from('campanhas')
        .update({ 
          mensagens_enviadas: enviadas,
          mensagens_entregues: entregues
        })
        .eq('id', campanhaId);

      // Rate limiting
      await sleep(DELAY_BETWEEN_MESSAGES);
    }

    // Mark campaign as completed
    await supabase
      .from('campanhas')
      .update({ 
        status: 'concluida',
        mensagens_enviadas: enviadas,
        mensagens_entregues: entregues
      })
      .eq('id', campanhaId);

    console.log(`Campaign ${campanhaId} completed: ${entregues}/${enviadas} delivered`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        enviadas, 
        entregues, 
        erros 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in bulk-send-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
