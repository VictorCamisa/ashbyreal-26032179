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
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY_1") || Deno.env.get("ELEVENLABS_API_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Helper to call Evolution API to resolve @lid JIDs
    const resolveRealJid = async (lidJid: string, instName: string): Promise<string | null> => {
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return null;
      try {
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

    // Helper to generate TTS audio via ElevenLabs
    const generateTTSAudio = async (text: string, voiceId?: string): Promise<string | null> => {
      if (!ELEVENLABS_API_KEY) {
        console.log("[webhook-evolution] ElevenLabs not configured, skipping TTS");
        return null;
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[webhook-evolution] TTS error:", errText);
          return null;
        }

        const data = await response.json();
        return data.audioContent || null;
      } catch (error) {
        console.error("[webhook-evolution] TTS generation failed:", error);
        return null;
      }
    };

    // Helper to send audio via Evolution API
    const sendAudioMessage = async (
      instanceName: string,
      phoneNumber: string,
      audioBase64: string
    ): Promise<boolean> => {
      if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return false;

      try {
        const sendUrl = `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instanceName}`;
        const response = await fetch(sendUrl, {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: phoneNumber,
            audio: `data:audio/mpeg;base64,${audioBase64}`,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error("[webhook-evolution] Send audio error:", errText);
          return false;
        }

        console.log(`[webhook-evolution] Audio sent to ${phoneNumber}`);
        return true;
      } catch (error) {
        console.error("[webhook-evolution] Send audio failed:", error);
        return false;
      }
    };

    const payload = await req.json();
    const event = payload.event;
    const instanceName = payload.instance || payload.instanceName;

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
            qr_code: isConnected ? null : undefined,
          })
          .eq("id", instance.id);

        console.log(`[webhook-evolution] Connection updated: ${state}, phone: ${phoneNumber}`);
        break;
      }

      case "MESSAGES_UPSERT": {
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

          if (remoteJidRaw.includes("@lid") && !remoteJidAlt) {
            const resolved = await resolveRealJid(remoteJidRaw, instanceName);
            if (resolved) {
              remoteJidAlt = resolved;
              console.log(`[webhook-evolution] Resolved ${remoteJidRaw} -> ${resolved}`);
            }
          }

          const remoteJid = remoteJidRaw.includes("@lid") && remoteJidAlt ? remoteJidAlt : remoteJidRaw;

          if (remoteJid.includes("@g.us")) {
            console.log(`[webhook-evolution] Ignoring group message: ${remoteJid}`);
            continue;
          }

          if (remoteJid === "status@broadcast") {
            continue;
          }

          const fromMe = msg.key?.fromMe || false;
          const messageId = msg.key?.id || `msg_${Date.now()}`;

          let content = "";
          let messageType = "text";
          let mediaUrl = null;
          let mediaBase64 = null;
          let isAudioMessage = false;

          if (msg.message?.conversation) {
            content = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage) {
            messageType = "image";
            content = msg.message.imageMessage.caption || "[Imagem]";
            mediaUrl = msg.message.imageMessage.url || null;
            if (msg.message.base64) {
              mediaBase64 = `data:image/jpeg;base64,${msg.message.base64}`;
            }
          } else if (msg.message?.videoMessage) {
            messageType = "video";
            content = msg.message.videoMessage.caption || "[Vídeo]";
            mediaUrl = msg.message.videoMessage.url || null;
          } else if (msg.message?.audioMessage) {
            messageType = "audio";
            isAudioMessage = true;
            const duration = msg.message.audioMessage.seconds || 0;
            content = `[Áudio ${duration}s]`;
            mediaUrl = msg.message.audioMessage.url || null;
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

          if (mediaBase64) {
            mediaUrl = mediaBase64;
          }

          const pushName = msg.pushName || msg.verifiedBizName || data?.pushName || null;
          const phoneNumber = remoteJid.split("@")[0];

          const metadata: Record<string, any> = {
            sender_name: pushName,
            push_name: pushName,
            phone_number: phoneNumber,
            remote_jid_raw: remoteJidRaw,
            remote_jid_alt: remoteJidAlt,
            is_audio_message: isAudioMessage,
          };

          if (msg.profilePicUrl) {
            metadata.profile_picture = msg.profilePicUrl;
          }

          const direction = fromMe ? "outbound" : "inbound";

          const { data: existing } = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("external_id", messageId)
            .single();

          if (existing) {
            console.log(`[webhook-evolution] Message already exists: ${messageId}`);
            continue;
          }

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
            console.log(`[webhook-evolution] Message saved: ${messageId}, pushName: ${pushName}, direction: ${direction}, type: ${messageType}`);
            
            // If inbound message, check for AI agent and respond
            if (direction === "inbound") {
              // Check if there's an active AI agent linked to this instance
              const { data: agent } = await supabase
                .from("ai_agents")
                .select("id, name, is_active, elevenlabs_voice_id")
                .eq("instance_id", instance.id)
                .eq("is_active", true)
                .single();

              if (agent) {
                console.log(`[webhook-evolution] Found active agent: ${agent.name} (${agent.id})`);
                
                // For audio messages, we still need text to process
                // The AI will respond, and we'll convert response to audio
                const messageToProcess = isAudioMessage 
                  ? "[O usuário enviou um áudio. Responda de forma amigável que você recebeu o áudio]"
                  : content;

                if (!messageToProcess || !messageToProcess.trim()) {
                  console.log("[webhook-evolution] Empty message, skipping AI processing");
                  continue;
                }

                try {
                  const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({
                      agent_id: agent.id,
                      remote_jid: remoteJid,
                      message: messageToProcess,
                      test_mode: false,
                    }),
                  });

                  if (!aiResponse.ok) {
                    const errText = await aiResponse.text();
                    console.error(`[webhook-evolution] AI chat error: ${errText}`);
                  } else {
                    const aiData = await aiResponse.json();
                    console.log(`[webhook-evolution] AI response received:`, JSON.stringify(aiData).substring(0, 500));
                    
                    const messagesToSend = aiData.messages || [aiData.response];
                    
                    // If the incoming message was audio, respond with audio
                    const shouldRespondWithAudio = isAudioMessage && ELEVENLABS_API_KEY;

                    for (const msgText of messagesToSend) {
                      if (!msgText || !msgText.trim()) continue;

                      if (shouldRespondWithAudio) {
                        // Generate TTS audio with agent's configured voice
                        const voiceId = agent.elevenlabs_voice_id || undefined;
                        console.log(`[webhook-evolution] Generating TTS for audio response with voice: ${voiceId || 'default'}`);
                        const audioBase64 = await generateTTSAudio(msgText.trim(), voiceId);
                        
                        if (audioBase64) {
                          const audioSent = await sendAudioMessage(instanceName, phoneNumber, audioBase64);
                          
                          if (audioSent) {
                            // Save outbound audio message to DB
                            await supabase.from("whatsapp_messages").insert({
                              instance_id: instance.id,
                              remote_jid: remoteJid,
                              direction: "outbound",
                              message_type: "audio",
                              content: msgText.trim(),
                              status: "sent",
                              metadata: { from_ai_agent: agent.id, tts_generated: true },
                            });
                            continue;
                          }
                        }
                        
                        // Fallback to text if audio fails
                        console.log(`[webhook-evolution] Audio failed, falling back to text`);
                      }
                      
                      // Send text message
                      const sendUrl = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`;
                      const sendResp = await fetch(sendUrl, {
                        method: "POST",
                        headers: {
                          "apikey": EVOLUTION_API_KEY!,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          number: phoneNumber,
                          text: msgText.trim(),
                        }),
                      });
                      
                      if (!sendResp.ok) {
                        const sendErr = await sendResp.text();
                        console.error(`[webhook-evolution] Error sending message: ${sendErr}`);
                      } else {
                        console.log(`[webhook-evolution] AI message sent to ${phoneNumber}`);
                        
                        await supabase.from("whatsapp_messages").insert({
                          instance_id: instance.id,
                          remote_jid: remoteJid,
                          direction: "outbound",
                          message_type: "text",
                          content: msgText.trim(),
                          status: "sent",
                          metadata: { from_ai_agent: agent.id },
                        });
                      }
                      
                      await new Promise(r => setTimeout(r, 800));
                    }
                  }
                } catch (aiError) {
                  console.error(`[webhook-evolution] Error calling AI:`, aiError);
                }
              } else {
                console.log(`[webhook-evolution] No active agent for instance ${instance.id}`);
              }
            }
          }
        }
        break;
      }

      case "MESSAGES_UPDATE": {
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
