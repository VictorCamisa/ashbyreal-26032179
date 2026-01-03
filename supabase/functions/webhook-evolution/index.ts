import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Helper to call Evolution API to resolve @lid JIDs
    const resolveRealJid = async (lidJid: string, instName: string): Promise<string | null> => {
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return null;
      try {
        // Try /chat/findContacts to get pnJid
        const url = `${EVOLUTION_API_URL}/chat/findContacts/${instName}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ where: { id: lidJid } }),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        // Response can be an array or single object
        const contacts = Array.isArray(data) ? data : data?.contacts || [data];
        for (const c of contacts) {
          const pn = c?.pnJid || c?.id;
          if (pn && pn.includes("@s.whatsapp.net")) {
            return pn;
          }
        }
      } catch (e) {
        console.warn(`[webhook-evolution] resolveRealJid failed for ${lidJid}:`, e);
      }
      return null;
    };

    const payload = await req.json();
    const event = payload.event;
    const instanceName = payload.instance || payload.instanceName;

    // Normalize event name to uppercase
    const normalizedEvent = event?.toUpperCase().replace(/\./g, "_");
    
    console.log(`[webhook-evolution] Event: ${event} (normalized: ${normalizedEvent}), Instance: ${instanceName}`);
    console.log(`[webhook-evolution] Payload:`, JSON.stringify(payload).substring(0, 1000));

    // Get instance from database
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("instance_name", instanceName)
      .single();

    if (!instance) {
      console.warn(`[webhook-evolution] Instance not found in database: ${instanceName}`);
      return new Response(JSON.stringify({ received: true, warning: "Instance not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (normalizedEvent) {
      case "QRCODE_UPDATED": {
        const qrCode = payload.data?.qrcode?.base64 || payload.qrcode?.base64;
        
        if (qrCode) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrCode })
            .eq("id", instance.id);
          
          console.log(`[webhook-evolution] QR Code updated for instance ${instanceName}`);
        }
        break;
      }

      case "CONNECTION_UPDATE": {
        const state = payload.data?.state || payload.state;
        const isConnected = state === "open";
        
        // Extract phone number from instance data
        let phoneNumber = null;
        if (payload.data?.instance?.owner) {
          phoneNumber = payload.data.instance.owner.split("@")[0];
        } else if (payload.data?.wuid) {
          phoneNumber = payload.data.wuid.split("@")[0];
        }

        await supabase
          .from("whatsapp_instances")
          .update({
            status: isConnected ? "connected" : "disconnected",
            phone_number: phoneNumber,
            qr_code: isConnected ? null : undefined, // Clear QR code when connected
          })
          .eq("id", instance.id);

        console.log(`[webhook-evolution] Connection updated: ${state}, phone: ${phoneNumber}`);
        break;
      }

      case "MESSAGES_UPSERT": {
        // Evolution can send this event in two formats:
        // 1) payload.data.messages = [] (history/batch)
        // 2) payload.data = single message object
        const data = payload.data;
        let messages: any[] = [];

        if (Array.isArray(data?.messages)) {
          messages = data.messages;
        } else if (Array.isArray(payload.messages)) {
          messages = payload.messages;
        } else if (data && (data.key || data.message)) {
          messages = [data];
        } else if (payload && (payload.key || payload.message)) {
          messages = [payload];
        }

        console.log(`[webhook-evolution] MESSAGES_UPSERT parsed messages: ${messages.length}`);

        for (const msg of messages) {
          const remoteJidRaw = msg.key?.remoteJid || "";
          let remoteJidAlt = msg.key?.remoteJidAlt || msg.remoteJidAlt || msg.key?.pnJid || msg.pnJid || null;

          // If we have @lid and no alt, try to resolve via Evolution API
          if (remoteJidRaw.includes("@lid") && !remoteJidAlt) {
            const resolved = await resolveRealJid(remoteJidRaw, instanceName);
            if (resolved) {
              remoteJidAlt = resolved;
              console.log(`[webhook-evolution] Resolved ${remoteJidRaw} -> ${resolved}`);
            }
          }

          const remoteJid = remoteJidRaw.includes("@lid") && remoteJidAlt ? remoteJidAlt : remoteJidRaw;

          // Ignore group messages
          if (remoteJid.includes("@g.us")) {
            console.log(`[webhook-evolution] Ignoring group message: ${remoteJid}`);
            continue;
          }

          // Ignore status messages
          if (remoteJid === "status@broadcast") {
            continue;
          }

          const fromMe = msg.key?.fromMe || false;
          const messageId = msg.key?.id || `msg_${Date.now()}`;

          // Extract message content and type
          let content = "";
          let messageType = "text";
          let mediaUrl = null;
          let mediaBase64 = null;

          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage) {
            messageType = "image";
            content = msg.message.imageMessage.caption || "[Imagem]";
            mediaUrl = msg.message.imageMessage.url || null;
            // Check for base64 media
            if (msg.message.base64) {
              mediaBase64 = `data:image/jpeg;base64,${msg.message.base64}`;
            }
          } else if (msg.message?.videoMessage) {
            messageType = "video";
            content = msg.message.videoMessage.caption || "[Vídeo]";
            mediaUrl = msg.message.videoMessage.url || null;
          } else if (msg.message?.audioMessage) {
            messageType = "audio";
            content = "[Áudio]";
            mediaUrl = msg.message.audioMessage.url || null;
            // Duration in seconds
            const duration = msg.message.audioMessage.seconds || 0;
            content = `[Áudio ${duration}s]`;
            // Check for base64 audio
            if (msg.message.base64) {
              mediaBase64 = `data:audio/ogg;base64,${msg.message.base64}`;
            }
          } else if (msg.message?.documentMessage) {
            messageType = "document";
            content = msg.message.documentMessage.fileName || "[Documento]";
            mediaUrl = msg.message.documentMessage.url || null;
          } else if (msg.message?.stickerMessage) {
            messageType = "sticker";
            content = "[Figurinha]";
          }

          // Use base64 as media URL if we have it
          if (mediaBase64) {
            mediaUrl = mediaBase64;
          }

          // Extract contact info - THIS IS THE KEY PART!
          // pushName comes from the contact who sent the message
          const pushName = msg.pushName || msg.verifiedBizName || data?.pushName || null;
          const phoneNumber = remoteJid.split("@")[0];

          // Build metadata with sender info
          const metadata: Record<string, any> = {
            sender_name: pushName,
            push_name: pushName,
            phone_number: phoneNumber,
            remote_jid_raw: remoteJidRaw,
            remote_jid_alt: remoteJidAlt,
          };

          // If there's a profile picture, include it
          if (msg.profilePicUrl) {
            metadata.profile_picture = msg.profilePicUrl;
          }

          // Determine direction
          const direction = fromMe ? "outbound" : "inbound";

          // Check if message already exists
          const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("external_id", messageId)
            .single();

          if (existing) {
            console.log(`[webhook-evolution] Message already exists: ${messageId}`);
            continue;
          }

          // Insert message
          const { error: insertError } = await supabase
            .from("whatsapp_messages")
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              direction,
              message_type: messageType,
              content,
              media_url: mediaUrl,
              status: "received",
              external_id: messageId,
              metadata,
              created_at: msg.messageTimestamp 
                ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString(),
            });

          if (insertError) {
            console.error(`[webhook-evolution] Error inserting message:`, insertError);
          } else {
            console.log(`[webhook-evolution] Message saved: ${messageId}, pushName: ${pushName}, direction: ${direction}`);
          }
        }
        break;
      }

      case "MESSAGES_UPDATE": {
        // Evolution can send:
        // - payload.data = []
        // - payload.data = { keyId, messageId, status, ... }
        const raw = payload.data;
        const updates: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

        for (const update of updates) {
          const messageId =
            update.key?.id ||
            update.keyId ||
            update.messageId ||
            update.id ||
            null;

          const statusRaw = update.status || update.update?.status || null;

          // Map both numeric and string statuses
          const statusMapNum: Record<number, string> = {
            1: "pending",
            2: "sent",
            3: "delivered",
            4: "read",
          };

          const statusMapStr: Record<string, string> = {
            PENDING: "pending",
            SENT: "sent",
            SERVER_ACK: "sent",
            DELIVERY_ACK: "delivered",
            DELIVERED: "delivered",
            READ: "read",
          };

          const mappedStatus =
            typeof statusRaw === "number"
              ? statusMapNum[statusRaw]
              : typeof statusRaw === "string"
                ? statusMapStr[statusRaw.toUpperCase()] || "sent"
                : null;

          if (messageId && mappedStatus) {
            await supabase
              .from("whatsapp_messages")
              .update({ status: mappedStatus })
              .eq("external_id", messageId);

            console.log(
              `[webhook-evolution] Message status updated: ${messageId} -> ${mappedStatus}`
            );
          }
        }
        break;
      }

      default:
        console.log(`[webhook-evolution] Unhandled event: ${event}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[webhook-evolution] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
