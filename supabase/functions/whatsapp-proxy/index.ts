import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QR_CODE_URL = "https://vssolutionscamisa.app.n8n.cloud/webhook/whatsapp/getqrcode";
const STATUS_URL = "https://vssolutionscamisa.app.n8n.cloud/webhook/whatsapp/checkstatus";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    
    let targetUrl: string;
    
    if (action === "qrcode") {
      targetUrl = QR_CODE_URL;
    } else if (action === "status") {
      targetUrl = STATUS_URL;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'qrcode' or 'status'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get body from request if present
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // Validate required fields based on action
    if (action === "qrcode" && !body.client_slug) {
      return new Response(
        JSON.stringify({ error: "client_slug is required for QR code generation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status" && !body.instance_name) {
      // Se não tem instance_name, retorna "não conectado" em vez de erro
      console.log("Status check without instance_name - returning not connected");
      return new Response(
        JSON.stringify({ connected: false, isConnected: false, message: "No instance configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Proxying ${action} request to ${targetUrl} with body:`, JSON.stringify(body));

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log(`Response from ${action}:`, JSON.stringify(data).substring(0, 200));

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Proxy request failed";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
