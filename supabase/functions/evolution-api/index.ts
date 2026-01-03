import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function normalizeToCanonical(remoteJid: string, remoteJidAlt?: string): {
  canonicalJid: string;
  lidJid: string | null;
  pnJid: string | null;
  phoneNumber: string | null;
  isGroup: boolean;
} {
  const isGroup = remoteJid.includes("@g.us");
  if (isGroup) return { canonicalJid: remoteJid, lidJid: null, pnJid: null, phoneNumber: null, isGroup: true };

  const isLid = remoteJid.includes("@lid");
  
  if (remoteJidAlt && (remoteJidAlt.includes("@s.whatsapp.net") || remoteJidAlt.includes("@c.us"))) {
    const normalizedPn = remoteJidAlt.replace("@c.us", "@s.whatsapp.net");
    return { canonicalJid: normalizedPn, lidJid: isLid ? remoteJid : null, pnJid: normalizedPn, phoneNumber: normalizedPn.split("@")[0], isGroup: false };
  }
  
  if (isLid) return { canonicalJid: remoteJid, lidJid: remoteJid, pnJid: null, phoneNumber: null, isGroup: false };
  
  const normalizedPn = remoteJid.replace("@c.us", "@s.whatsapp.net");
  return { canonicalJid: normalizedPn, lidJid: null, pnJid: normalizedPn, phoneNumber: normalizedPn.split("@")[0], isGroup: false };
}

// Extract last message text from various formats
function extractLastMessage(chat: any): string | null {
  const lm = chat.lastMessage;
  if (!lm) return null;
  
  const msg = lm.message || lm;
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    (msg?.imageMessage ? "[Imagem]" : null) ||
    (msg?.videoMessage ? "[Vídeo]" : null) ||
    (msg?.audioMessage ? "[Áudio]" : null) ||
    (msg?.documentMessage?.fileName || (msg?.documentMessage ? "[Doc]" : null)) ||
    (typeof lm === "string" ? lm : null) ||
    null
  );
}

// Extract timestamp from various formats
function extractTimestamp(chat: any): string | null {
  const lm = chat.lastMessage;
  const ts = lm?.messageTimestamp || chat.messageTimestamp || chat.updatedAt;
  if (!ts) return null;
  
  // Handle seconds vs milliseconds
  const num = Number(ts);
  if (num > 1e12) return new Date(num).toISOString();
  return new Date(num * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL")!.replace(/\/$/, "");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json();
    const { action, instance_name: instanceName, ...params } = body;

    console.log(`[Evolution API] Action: ${action}, Instance: ${instanceName}`);

    const evolutionFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${EVOLUTION_API_URL}${endpoint}`;
      console.log(`[Evolution API] Fetching: ${url}`);
      const res = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", "apikey": EVOLUTION_API_KEY, ...options.headers },
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`[Evolution API] Error ${res.status}: ${text.substring(0, 500)}`);
        throw new Error(`Evolution API error: ${res.status}`);
      }
      try {
        return JSON.parse(text);
      } catch {
        console.error(`[Evolution API] Invalid JSON: ${text.substring(0, 200)}`);
        return null;
      }
    };

    const extractQrPayload = (result: any): { qrcode: string | null; pairingCode: string | null } => {
      if (!result) return { qrcode: null, pairingCode: null };

      const qrcode =
        result?.qrcode?.base64 ??
        result?.qrcode?.base64Qr ??
        result?.qrcode?.qr ??
        result?.qrcode?.code ??
        (typeof result?.qrcode === "string" ? result.qrcode : null) ??
        result?.base64 ??
        result?.qr?.base64 ??
        result?.qrCode?.base64 ??
        result?.data?.qrcode?.base64 ??
        null;

      const pairingCode =
        result?.pairingCode ??
        result?.pairing_code ??
        result?.qrcode?.pairingCode ??
        null;

      return { qrcode, pairingCode };
    };

    // Helper to fetch and build contact map from multiple JID formats
    const fetchContactsMap = async (): Promise<Map<string, string>> => {
      const contactMap = new Map<string, string>();
      try {
        const result = await evolutionFetch(`/chat/findContacts/${instanceName}`, { method: "POST", body: "{}" });
        const contacts = Array.isArray(result) ? result : (result?.contacts || []);
        console.log(`[Evolution API] Found ${contacts.length} contacts`);
        
        // Log first 3 contacts to understand structure
        for (let i = 0; i < Math.min(3, contacts.length); i++) {
          console.log(`[Evolution API] Sample contact ${i}: ${JSON.stringify(contacts[i]).substring(0, 300)}`);
        }
        
        for (const c of contacts) {
          const name = c.pushName || c.name || c.notify || c.verifiedName;
          if (!name) continue;
          
          // Map all possible JID formats
          const jids = [c.id, c.remoteJid, c.lid, c.pnJid, c.phoneNumber].filter(Boolean);
          for (const jid of jids) {
            contactMap.set(jid, name);
            // Also map without domain
            const baseId = jid.split("@")[0];
            if (baseId) contactMap.set(baseId, name);
          }
        }
        
        console.log(`[Evolution API] Contact map has ${contactMap.size} entries`);
      } catch (e) {
        console.error("[Evolution API] Error fetching contacts:", e);
      }
      return contactMap;
    };

    // Try to resolve a @lid chat to a phone-number JID using targeted findContacts queries.
    // Some Evolution deployments can resolve a contact when queried by remoteJid/id even if findContacts (bulk) doesn't return the LID.
    const resolveLidContact = async (lidJid: string): Promise<{ pnJid: string | null; pushName: string | null; profilePicUrl: string | null } | null> => {
      if (!lidJid || !lidJid.includes("@lid")) return null;

      const attempts: any[] = [
        { where: { id: lidJid } },
        { where: { remoteJid: lidJid } },
        { where: { id: lidJid.split("@")[0] } },
        { where: { remoteJid: lidJid.split("@")[0] } },
      ];

      for (const a of attempts) {
        try {
          const result = await evolutionFetch(`/chat/findContacts/${instanceName}`, {
            method: "POST",
            body: JSON.stringify(a),
          });

          const arr = Array.isArray(result)
            ? result
            : (Array.isArray(result?.contacts) ? result.contacts : []);

          if (!arr || arr.length === 0) continue;

          const q1 = lidJid;
          const q2 = lidJid.split("@")[0];

          const c = arr.find((x: any) =>
            x?.id === q1 ||
            x?.remoteJid === q1 ||
            x?.id === q2 ||
            x?.remoteJid === q2,
          );

          // Se a API ignorar o filtro e devolver contatos aleatórios, não podemos usar o primeiro item.
          if (!c) {
            if (arr.length > 1) {
              console.log(`[Evolution API] resolveLidContact: no exact match for ${lidJid} (returned ${arr.length} contacts)`);
            }
            continue;
          }

          const rawPn =
            c.pnJid ||
            c.remoteJidAlt ||
            c.pnJidAlt ||
            (typeof c.remoteJid === "string" && c.remoteJid.includes("@s.whatsapp.net") ? c.remoteJid : null) ||
            null;

          const pnJid = (typeof rawPn === "string" && rawPn.includes("@s.whatsapp.net"))
            ? rawPn.replace("@c.us", "@s.whatsapp.net")
            : null;

          const pushName = c.pushName || c.name || c.notify || c.verifiedName || null;
          const profilePicUrl = c.profilePicUrl || null;

          if (pnJid || pushName || profilePicUrl) {
            console.log(`[Evolution API] Resolved LID contact for ${lidJid}: pnJid=${pnJid} name=${pushName}`);
            return { pnJid, pushName, profilePicUrl };
          }
        } catch {
          // ignore and try next
        }
      }

      console.log(`[Evolution API] Could not resolve LID contact for ${lidJid}`);
      return null;
    };

    if (action === "create_instance") {
      const newName = `${params.client_slug || "whatsapp"}-${Date.now()}`;
      const result = await evolutionFetch("/instance/create", {
        method: "POST",
        body: JSON.stringify({ instanceName: newName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
      });

      console.log(`[Evolution API] create_instance response keys: ${Object.keys(result || {}).join(",")}`);

      let { qrcode, pairingCode } = extractQrPayload(result);

      if (!qrcode) {
        try {
          const connectResult = await evolutionFetch(`/instance/connect/${newName}`);
          const payload = extractQrPayload(connectResult);
          qrcode = payload.qrcode;
          pairingCode = pairingCode || payload.pairingCode;
        } catch (e) {
          console.error("[Evolution API] Failed to fetch QR via connect:", e);
        }
      }

      await supabase
        .from("whatsapp_instances")
        .upsert({ instance_name: newName, is_connected: false }, { onConflict: "instance_name" });

      return new Response(
        JSON.stringify({ success: true, instance_name: newName, qrcode, pairingCode }),
        { headers: corsHeaders },
      );
    }

    if (action === "get_qrcode") {
      const result = await evolutionFetch(`/instance/connect/${instanceName}`);
      const { qrcode, pairingCode } = extractQrPayload(result);
      return new Response(JSON.stringify({ success: true, qrcode, pairingCode }), { headers: corsHeaders });
    }

    if (action === "check_connection") {
      try {
        const result = await evolutionFetch(`/instance/connectionState/${instanceName}`);
        const connected = result?.instance?.state === "open" || result?.state === "open";
        return new Response(JSON.stringify({ success: true, connected }), { headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({ success: true, connected: false }), { headers: corsHeaders });
      }
    }

    if (action === "logout") {
      try { await evolutionFetch(`/instance/logout/${instanceName}`, { method: "DELETE" }); } catch {}
      await supabase.from("evolution_messages").delete().eq("instance_name", instanceName);
      await supabase.from("evolution_chats").delete().eq("instance_name", instanceName);
      await supabase.from("whatsapp_instances").update({ is_connected: false }).eq("instance_name", instanceName);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "find_chats") {
      const result = await evolutionFetch(`/chat/findChats/${instanceName}`, { method: "POST", body: "{}" });
      const chats = Array.isArray(result) ? result : [];

      console.log(`[Evolution API] Found ${chats.length} chats from Evolution`);

      // Log first 3 chats to understand structure (helps mapping @lid -> @s.whatsapp.net)
      for (let i = 0; i < Math.min(3, chats.length); i++) {
        console.log(`[Evolution API] Sample chat ${i}: ${JSON.stringify(chats[i]).substring(0, 500)}`);
      }

      // Fetch contacts to enrich push_name
      const contactMap = await fetchContactsMap();

      for (const chat of chats) {
        const remoteJid = chat.remoteJid || chat.id;
        if (!remoteJid || remoteJid === "status@broadcast") continue;

        const altJid =
          chat.remoteJidAlt ||
          chat.pnJid ||
          chat.pnJidAlt ||
          chat.participantAlt ||
          chat.phoneNumber ||
          (typeof chat.id === "string" && chat.id !== remoteJid ? chat.id : null) ||
          null;

        let normalized = normalizeToCanonical(remoteJid, altJid);
        const canonicalJid = normalized.canonicalJid || remoteJid;

        let pnJid = normalized.pnJid;
        let phoneNumber = normalized.phoneNumber;
        let profilePicUrl = chat.profilePicUrl || chat.profilePictureUrl || null;

        // If this is a LID chat, try to resolve it to a phone-number JID so we can map names.
        if (remoteJid.includes("@lid") && !pnJid) {
          const resolved = await resolveLidContact(remoteJid);
          if (resolved?.pnJid) {
            pnJid = resolved.pnJid;
            phoneNumber = resolved.pnJid.split("@")[0];
          }
          if (resolved?.profilePicUrl && !profilePicUrl) profilePicUrl = resolved.profilePicUrl;

          // If we resolved a pnJid, keep lid_jid and store pn_jid/phone_number for display + matching.
          if (resolved?.pnJid) {
            normalized = { ...normalized, pnJid: resolved.pnJid, phoneNumber, lidJid: remoteJid };
          }
        }

        // Try to get name from multiple sources
        let pushName = chat.pushName || chat.name || chat.notify || null;
        if (!pushName) {
          pushName =
            contactMap.get(remoteJid) ||
            contactMap.get(canonicalJid) ||
            (pnJid ? contactMap.get(pnJid) : null) ||
            contactMap.get(remoteJid.split("@")[0]) ||
            null;
        }

        // Last resort: sometimes lastMessage.pushName is the best we have.
        const lmPush = chat.lastMessage?.pushName;
        if (!pushName && lmPush && lmPush !== "Você") {
          pushName = lmPush;
        }

        const lastMessage = extractLastMessage(chat);
        const lastMessageAt = extractTimestamp(chat);

        console.log(`[Evolution API] Chat: ${remoteJid}, name: ${pushName}, lastMsg: ${lastMessage?.substring(0, 30)}`);

        const { error: upsertError } = await supabase.from("evolution_chats").upsert({
          instance_name: instanceName,
          remote_jid: remoteJid,
          canonical_jid: canonicalJid,
          lid_jid: normalized.lidJid,
          pn_jid: pnJid,
          phone_number: phoneNumber,
          push_name: pushName,
          is_group: normalized.isGroup,
          profile_pic_url: profilePicUrl,
          last_message: lastMessage?.substring(0, 200) || null,
          last_message_at: lastMessageAt,
        }, { onConflict: "instance_name,canonical_jid" });

        if (upsertError) {
          console.error(`[Evolution API] Error upserting chat ${remoteJid}:`, upsertError);
        }
      }

      const { data: dbChats } = await supabase.from("evolution_chats").select("*").eq("instance_name", instanceName).order("last_message_at", { ascending: false, nullsFirst: false });
      return new Response(JSON.stringify({ success: true, chats: dbChats || [] }), { headers: corsHeaders });
    }

    if (action === "find_messages") {
      const { chatId } = params;
      const { data: chat } = await supabase.from("evolution_chats").select("*").eq("id", chatId).single();
      if (!chat) return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404, headers: corsHeaders });

      const jidsToFetch = [chat.canonical_jid, chat.lid_jid, chat.pn_jid, chat.remote_jid].filter(Boolean);
      const allMessages: any[] = [];

      for (const jid of [...new Set(jidsToFetch)]) {
        try {
          const result = await evolutionFetch(`/chat/findMessages/${instanceName}`, {
            method: "POST",
            body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit: 100 }),
          });
          const msgs = result?.messages?.records || result?.messages || result || [];
          if (Array.isArray(msgs)) allMessages.push(...msgs);
        } catch {}
      }

      const seenIds = new Set<string>();
      let loggedKeySample = false;
      for (const msg of allMessages) {
        const key = msg.key;
        if (!loggedKeySample && key) {
          console.log(`[Evolution API] Sample message key: ${JSON.stringify(key).substring(0, 400)}`);
          loggedKeySample = true;
        }
        if (!key?.id || seenIds.has(key.id)) continue;
        seenIds.add(key.id);

        // If Evolution/Baileys provides an alternate JID, store it to enable name/phone matching.
        const alt = (key.remoteJidAlt || key.participantAlt || msg.remoteJidAlt || msg.participantAlt) as string | undefined;
        if (alt && typeof alt === "string" && alt.includes("@s.whatsapp.net")) {
          try {
            await supabase
              .from("evolution_chats")
              .update({ pn_jid: alt.replace("@c.us", "@s.whatsapp.net"), phone_number: alt.split("@")[0] })
              .eq("id", chat.id);
          } catch {}
        }
        const message = msg.message || {};
        let body = message.conversation || message.extendedTextMessage?.text || "";
        let messageType = "text";
        if (message.imageMessage) { messageType = "image"; body = message.imageMessage.caption || "[Imagem]"; }
        else if (message.videoMessage) { messageType = "video"; body = "[Vídeo]"; }
        else if (message.audioMessage) { messageType = "audio"; body = "[Áudio]"; }
        else if (message.documentMessage) { messageType = "document"; body = message.documentMessage.fileName || "[Doc]"; }

        await supabase.from("evolution_messages").upsert({
          instance_name: instanceName,
          remote_jid: chat.canonical_jid,
          source_remote_jid: key.remoteJid,
          chat_id: chat.id,
          message_id: key.id,
          from_me: key.fromMe || false,
          body,
          message_type: messageType,
          timestamp: msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString(),
          status: key.fromMe ? "sent" : "received",
        }, { onConflict: "message_id,instance_name" });
      }

      const { data: dbMessages } = await supabase.from("evolution_messages").select("*").eq("chat_id", chat.id).order("timestamp", { ascending: true });
      await supabase.from("evolution_chats").update({ unread_count: 0 }).eq("id", chat.id);
      return new Response(JSON.stringify({ success: true, messages: dbMessages || [] }), { headers: corsHeaders });
    }

    if (action === "send_message") {
      const { chatId, text } = params;
      const { data: chat } = await supabase.from("evolution_chats").select("*").eq("id", chatId).single();
      if (!chat) return new Response(JSON.stringify({ error: "Chat not found" }), { status: 404, headers: corsHeaders });

      const sendTo = chat.lid_jid || chat.phone_number || chat.canonical_jid;
      const result = await evolutionFetch(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({ number: sendTo, text }),
      });

      if (result.key?.id) {
        await supabase.from("evolution_messages").insert({
          instance_name: instanceName,
          remote_jid: chat.canonical_jid,
          chat_id: chat.id,
          message_id: result.key.id,
          from_me: true,
          body: text,
          message_type: "text",
          timestamp: new Date().toISOString(),
          status: "sent",
        });
        await supabase.from("evolution_chats").update({ last_message: text.substring(0, 200), last_message_at: new Date().toISOString() }).eq("id", chat.id);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "delete_chat") {
      const { chatId } = params;
      await supabase.from("evolution_messages").delete().eq("chat_id", chatId);
      await supabase.from("evolution_chats").delete().eq("id", chatId);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "sync_contacts") {
      const contactMap = await fetchContactsMap();
      let updated = 0;

      for (const [jid, pushName] of contactMap) {
        const { data } = await supabase.from("evolution_chats")
          .update({ push_name: pushName })
          .eq("instance_name", instanceName)
          .or(`canonical_jid.eq.${jid},lid_jid.eq.${jid},pn_jid.eq.${jid},remote_jid.eq.${jid}`)
          .select("id");
        if (data && data.length > 0) updated += data.length;
      }

      return new Response(JSON.stringify({ success: true, updated }), { headers: corsHeaders });
    }

    if (action === "rebuild_chats") {
      console.log(`[Evolution API] Rebuilding chats for ${instanceName}`);
      
      // Delete existing data
      await supabase.from("evolution_messages").delete().eq("instance_name", instanceName);
      await supabase.from("evolution_chats").delete().eq("instance_name", instanceName);
      
      // Fetch contacts first
      const contactMap = await fetchContactsMap();
      
      // Fetch chats
      const result = await evolutionFetch(`/chat/findChats/${instanceName}`, { method: "POST", body: "{}" });
      const chats = Array.isArray(result) ? result : [];

      console.log(`[Evolution API] Rebuilding with ${chats.length} chats, ${contactMap.size} contacts`);

      // Log first 3 chats to understand structure (helps mapping @lid -> @s.whatsapp.net)
      for (let i = 0; i < Math.min(3, chats.length); i++) {
        console.log(`[Evolution API] Sample rebuild chat ${i}: ${JSON.stringify(chats[i]).substring(0, 500)}`);
      }

      for (const chat of chats) {
        const remoteJid = chat.remoteJid || chat.id;
        if (!remoteJid || remoteJid === "status@broadcast") continue;

        const altJid =
          chat.remoteJidAlt ||
          chat.pnJid ||
          chat.pnJidAlt ||
          chat.participantAlt ||
          chat.phoneNumber ||
          (typeof chat.id === "string" && chat.id !== remoteJid ? chat.id : null) ||
          null;

        let normalized = normalizeToCanonical(remoteJid, altJid);
        const canonicalJid = normalized.canonicalJid || remoteJid;

        let pnJid = normalized.pnJid;
        let phoneNumber = normalized.phoneNumber;
        let profilePicUrl = chat.profilePicUrl || chat.profilePictureUrl || null;

        if (remoteJid.includes("@lid") && !pnJid) {
          const resolved = await resolveLidContact(remoteJid);
          if (resolved?.pnJid) {
            pnJid = resolved.pnJid;
            phoneNumber = resolved.pnJid.split("@")[0];
          }
          if (resolved?.profilePicUrl && !profilePicUrl) profilePicUrl = resolved.profilePicUrl;
          if (resolved?.pnJid) {
            normalized = { ...normalized, pnJid: resolved.pnJid, phoneNumber, lidJid: remoteJid };
          }
        }

        // Get name from chat or contacts
        let pushName = chat.pushName || chat.name || chat.notify || null;
        if (!pushName) {
          pushName =
            contactMap.get(remoteJid) ||
            contactMap.get(canonicalJid) ||
            (pnJid ? contactMap.get(pnJid) : null) ||
            contactMap.get(remoteJid.split("@")[0]) ||
            null;
        }

        const lmPush = chat.lastMessage?.pushName;
        if (!pushName && lmPush && lmPush !== "Você") {
          pushName = lmPush;
        }

        const lastMessage = extractLastMessage(chat);
        const lastMessageAt = extractTimestamp(chat);

        console.log(`[Evolution API] Rebuild chat: ${remoteJid}, name: ${pushName}, msg: ${lastMessage?.substring(0, 20)}`);

        // Use UPSERT to avoid duplicates
        const { error: insertError } = await supabase.from("evolution_chats").upsert({
          instance_name: instanceName,
          remote_jid: remoteJid,
          canonical_jid: canonicalJid,
          lid_jid: normalized.lidJid,
          pn_jid: pnJid,
          phone_number: phoneNumber,
          push_name: pushName,
          is_group: normalized.isGroup,
          profile_pic_url: profilePicUrl,
          last_message: lastMessage?.substring(0, 200) || null,
          last_message_at: lastMessageAt,
        }, { onConflict: "instance_name,canonical_jid" });

        if (insertError) {
          console.error(`[Evolution API] Error inserting chat ${remoteJid}:`, insertError);
        }
      }

      const { data: dbChats } = await supabase.from("evolution_chats").select("*").eq("instance_name", instanceName).order("last_message_at", { ascending: false, nullsFirst: false });
      return new Response(JSON.stringify({ success: true, chats: dbChats || [] }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error("[Evolution API] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
