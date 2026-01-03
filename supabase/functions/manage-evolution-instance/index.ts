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
    const { action, instanceName, name } = await req.json();

    console.log(`[manage-evolution-instance] Action: ${action}, Instance: ${instanceName}`);

    const evolutionFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${EVOLUTION_API_URL}${endpoint}`;
      console.log(`[Evolution API] ${options.method || 'GET'} ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          "apikey": EVOLUTION_API_KEY,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      
      const text = await response.text();
      console.log(`[Evolution API] Response: ${text.substring(0, 500)}`);
      
      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status} - ${text}`);
      }
      
      return text ? JSON.parse(text) : null;
    };

    // Webhook URL for this project
    const webhookUrl = `${SUPABASE_URL}/functions/v1/webhook-evolution`;

    switch (action) {
      case "create": {
        if (!instanceName || !name) {
          throw new Error("instanceName and name are required");
        }

        // Create instance in Evolution API
        const createResult = await evolutionFetch("/instance/create", {
          method: "POST",
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        console.log("[manage-evolution-instance] Instance created:", createResult);

        // Configure webhook automatically
        const webhookConfig = await evolutionFetch(`/webhook/set/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: true,
              webhookBase64: true,
              events: [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "CONNECTION_UPDATE",
                "QRCODE_UPDATED",
              ],
            },
          }),
        });

        console.log("[manage-evolution-instance] Webhook configured:", webhookConfig);

        // Save to database
        const { data: dbInstance, error: dbError } = await supabase
          .from("whatsapp_instances")
          .insert({
            name,
            instance_name: instanceName,
            status: "disconnected",
            webhook_url: webhookUrl,
            webhook_enabled: true,
            qr_code: createResult?.qrcode?.base64 || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error("[manage-evolution-instance] DB error:", dbError);
          throw dbError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            instance: dbInstance,
            qrCode: createResult?.qrcode?.base64 || null,
            pairingCode: createResult?.qrcode?.pairingCode || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "qrcode": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const qrResult = await evolutionFetch(`/instance/connect/${instanceName}`, {
          method: "GET",
        });

        // Update QR code in database
        if (qrResult?.base64) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrResult.base64 })
            .eq("instance_name", instanceName);
        }

        return new Response(
          JSON.stringify({
            success: true,
            qrCode: qrResult?.base64 || null,
            pairingCode: qrResult?.pairingCode || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "connect": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        const stateResult = await evolutionFetch(`/instance/connectionState/${instanceName}`, {
          method: "GET",
        });

        const isConnected = stateResult?.state === "open" || stateResult?.instance?.state === "open";
        
        // Update status in database
        await supabase
          .from("whatsapp_instances")
          .update({ 
            status: isConnected ? "connected" : "disconnected",
          })
          .eq("instance_name", instanceName);

        return new Response(
          JSON.stringify({
            success: true,
            isConnected,
            state: stateResult?.state || stateResult?.instance?.state,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        // Delete from Evolution API
        try {
          await evolutionFetch(`/instance/delete/${instanceName}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.warn("[manage-evolution-instance] Error deleting from Evolution (may not exist):", e);
        }

        // Delete from database
        await supabase
          .from("whatsapp_instances")
          .delete()
          .eq("instance_name", instanceName);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "logout": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        await evolutionFetch(`/instance/logout/${instanceName}`, {
          method: "DELETE",
        });

        // Update status in database
        await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected", phone_number: null })
          .eq("instance_name", instanceName);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reconfigure": {
        if (!instanceName) {
          throw new Error("instanceName is required");
        }

        // Reconfigure webhook
        const webhookConfig = await evolutionFetch(`/webhook/set/${instanceName}`, {
          method: "POST",
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              webhookByEvents: true,
              webhookBase64: true,
              events: [
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "CONNECTION_UPDATE",
                "QRCODE_UPDATED",
              ],
            },
          }),
        });

        return new Response(
          JSON.stringify({ success: true, webhook: webhookConfig }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("[manage-evolution-instance] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
