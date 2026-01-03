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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { instanceName, remoteJid, message, messageType = "text", mediaUrl, fileName } = await req.json();

    if (!instanceName || !remoteJid || !message) {
      throw new Error("instanceName, remoteJid, and message are required");
    }

    console.log(`[send-message] Sending to ${remoteJid} via ${instanceName}`);

    // Get instance from database
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("id, status")
      .eq("instance_name", instanceName)
      .single();

    if (!instance) {
      throw new Error("Instance not found");
    }

    if (instance.status !== "connected") {
      throw new Error("Instance is not connected");
    }

    let endpoint = "";
    let body: Record<string, any> = {};

    // Clean base64 - remove data URL prefix if present
    const cleanBase64 = (base64: string | undefined) => {
      if (!base64) return base64;
      // Remove data:image/png;base64, or data:audio/ogg;base64, etc.
      const match = base64.match(/^data:[^;]+;base64,(.+)$/);
      return match ? match[1] : base64;
    };

    const cleanedMediaUrl = cleanBase64(mediaUrl);
    const number = remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "");

    switch (messageType) {
      case "text":
        endpoint = `/message/sendText/${instanceName}`;
        body = {
          number,
          text: message,
        };
        break;

      case "image":
        endpoint = `/message/sendMedia/${instanceName}`;
        body = {
          number,
          mediatype: "image",
          media: cleanedMediaUrl,
          caption: message !== '[Imagem]' ? message : undefined,
        };
        break;

      case "audio":
        endpoint = `/message/sendWhatsAppAudio/${instanceName}`;
        body = {
          number,
          audio: cleanedMediaUrl,
        };
        break;

      case "document":
        endpoint = `/message/sendMedia/${instanceName}`;
        body = {
          number,
          mediatype: "document",
          media: cleanedMediaUrl,
          fileName: fileName || "document",
          caption: message,
        };
        break;

      default:
        endpoint = `/message/sendText/${instanceName}`;
        body = {
          number,
          text: message,
        };
    }

    console.log(`[send-message] Type: ${messageType}, Endpoint: ${endpoint}`);
    console.log(`[send-message] Body keys: ${Object.keys(body).join(', ')}`);

    const url = `${EVOLUTION_API_URL}${endpoint}`;
    console.log(`[send-message] POST ${url}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log(`[send-message] Response:`, responseText.substring(0, 500));

    if (!response.ok) {
      throw new Error(`Failed to send message: ${responseText}`);
    }

    const result = responseText ? JSON.parse(responseText) : null;
    const externalId = result?.key?.id || `sent_${Date.now()}`;

    // Save outbound message to database
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        instance_id: instance.id,
        remote_jid: remoteJid,
        direction: "outbound",
        message_type: messageType,
        content: message,
        media_url: mediaUrl || null,
        status: "sent",
        external_id: externalId,
        metadata: {},
      });

    if (insertError) {
      console.error("[send-message] Error saving to database:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: externalId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-message] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
