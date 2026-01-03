import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize JID to canonical format using remoteJidAlt when available
function normalizeToCanonical(remoteJid: string, remoteJidAlt?: string): {
  canonicalJid: string;
  lidJid: string | null;
  pnJid: string | null;
  phoneNumber: string | null;
  isGroup: boolean;
} {
  const isGroup = remoteJid.includes("@g.us");
  
  if (isGroup) {
    return { canonicalJid: remoteJid, lidJid: null, pnJid: null, phoneNumber: null, isGroup: true };
  }

  const isLid = remoteJid.includes("@lid");
  
  // If we have remoteJidAlt (the real phone number JID), use it as canonical
  if (remoteJidAlt && (remoteJidAlt.includes("@s.whatsapp.net") || remoteJidAlt.includes("@c.us"))) {
    const normalizedPn = remoteJidAlt.replace("@c.us", "@s.whatsapp.net");
    const phoneNumber = normalizedPn.split("@")[0];
    return {
      canonicalJid: normalizedPn,
      lidJid: isLid ? remoteJid : null,
      pnJid: normalizedPn,
      phoneNumber,
      isGroup: false,
    };
  }
  
  if (isLid) {
    return { canonicalJid: remoteJid, lidJid: remoteJid, pnJid: null, phoneNumber: null, isGroup: false };
  }
  
  const normalizedPn = remoteJid.replace("@c.us", "@s.whatsapp.net");
  const phoneNumber = normalizedPn.split("@")[0];
  return { canonicalJid: normalizedPn, lidJid: null, pnJid: normalizedPn, phoneNumber, isGroup: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const event = payload.event;
    const instanceName = payload.instance || payload.instanceName;

    console.log(`[Webhook] Event: ${event}, Instance: ${instanceName}`);

    if (event === "messages.upsert") {
      const data = payload.data;
      if (!data) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

      const key = data.key;
      const message = data.message;
      const pushName = data.pushName;

      if (!key?.remoteJid) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

      const remoteJid = key.remoteJid;
      const remoteJidAlt = key.remoteJidAlt || data.remoteJidAlt;
      const messageId = key.id;
      const fromMe = key.fromMe || false;
      const timestamp = data.messageTimestamp 
        ? new Date(Number(data.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      if (remoteJid === "status@broadcast") {
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      const { canonicalJid, lidJid, pnJid, phoneNumber, isGroup } = normalizeToCanonical(remoteJid, remoteJidAlt);

      console.log(`[Webhook] remoteJid=${remoteJid}, alt=${remoteJidAlt}, canonical=${canonicalJid}, phone=${phoneNumber}`);

      // Extract message content
      let body = "";
      let messageType = "text";
      let mediaUrl = null;

      if (message?.conversation) body = message.conversation;
      else if (message?.extendedTextMessage?.text) body = message.extendedTextMessage.text;
      else if (message?.imageMessage) { messageType = "image"; body = message.imageMessage.caption || "[Imagem]"; }
      else if (message?.videoMessage) { messageType = "video"; body = message.videoMessage.caption || "[Vídeo]"; }
      else if (message?.audioMessage) { messageType = "audio"; body = "[Áudio]"; }
      else if (message?.documentMessage) { messageType = "document"; body = message.documentMessage.fileName || "[Documento]"; }
      else if (message?.stickerMessage) { messageType = "sticker"; body = "[Sticker]"; }

      // Upsert chat by canonical_jid
      const { data: existingChat } = await supabase
        .from("evolution_chats")
        .select("id, lid_jid, pn_jid, phone_number, push_name, unread_count")
        .eq("instance_name", instanceName)
        .eq("canonical_jid", canonicalJid)
        .maybeSingle();

      let chatId: string;

      if (existingChat) {
        chatId = existingChat.id;
        
        const updateData: Record<string, unknown> = {
          last_message: body.substring(0, 200),
          last_message_at: timestamp,
          updated_at: new Date().toISOString(),
        };

        if (lidJid && !existingChat.lid_jid) updateData.lid_jid = lidJid;
        if (pnJid && !existingChat.pn_jid) updateData.pn_jid = pnJid;
        if (phoneNumber && !existingChat.phone_number) updateData.phone_number = phoneNumber;
        if (pushName && !existingChat.push_name) updateData.push_name = pushName;
        if (!fromMe) updateData.unread_count = (existingChat.unread_count || 0) + 1;

        await supabase.from("evolution_chats").update(updateData).eq("id", chatId);
      } else {
        const { data: newChat, error } = await supabase
          .from("evolution_chats")
          .insert({
            instance_name: instanceName,
            remote_jid: remoteJid,
            canonical_jid: canonicalJid,
            lid_jid: lidJid,
            pn_jid: pnJid,
            phone_number: phoneNumber,
            push_name: pushName || null,
            is_group: isGroup,
            last_message: body.substring(0, 200),
            last_message_at: timestamp,
            unread_count: fromMe ? 0 : 1,
          })
          .select("id")
          .single();

        if (error) throw error;
        chatId = newChat.id;
      }

      // Insert message
      await supabase.from("evolution_messages").upsert({
        instance_name: instanceName,
        remote_jid: canonicalJid,
        source_remote_jid: remoteJid,
        chat_id: chatId,
        message_id: messageId,
        from_me: fromMe,
        body,
        message_type: messageType,
        media_url: mediaUrl,
        timestamp,
        status: fromMe ? "sent" : "received",
      }, { onConflict: "message_id,instance_name" });

      return new Response(JSON.stringify({ success: true, chat_id: chatId }), { headers: corsHeaders });
    }

    if (event === "messages.update") {
      const updates = Array.isArray(payload.data) ? payload.data : [payload.data];
      for (const update of updates) {
        if (!update?.key?.id) continue;
        const status = update.status;
        let statusText = null;
        if (status === 2 || status === "SERVER_ACK") statusText = "sent";
        else if (status === 3 || status === "DELIVERY_ACK") statusText = "delivered";
        else if (status === 4 || status === "READ") statusText = "read";

        if (statusText) {
          await supabase.from("evolution_messages").update({ status: statusText })
            .eq("message_id", update.key.id).eq("instance_name", instanceName);
        }
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (event === "connection.update") {
      const state = payload.data?.state || payload.data?.status;
      const isConnected = state === "open" || state === "connected";
      await supabase.from("whatsapp_instances").update({
        is_connected: isConnected,
        status: isConnected ? "connected" : "disconnected",
      }).eq("instance_name", instanceName);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (event === "messages.read" || event === "chats.update") {
      const jid = payload.data?.key?.remoteJid || payload.data?.remoteJid;
      if (jid) {
        await supabase.from("evolution_chats").update({ unread_count: 0 })
          .eq("instance_name", instanceName)
          .or(`canonical_jid.eq.${jid},lid_jid.eq.${jid},pn_jid.eq.${jid}`);
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
