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

    // Log instance_name status
    if (action === "status") {
      console.log("Status check with instance_name:", body.instance_name || "(empty)");
    }

    console.log(`Proxying ${action} request to ${targetUrl} with body:`, JSON.stringify(body));

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Lê o texto da resposta primeiro
    const responseText = await response.text();
    console.log(`Raw response from ${action}:`, responseText.substring(0, 500));

    // Se resposta vazia, retorna erro
    if (!responseText || responseText.trim() === "") {
      console.log("Empty response from n8n");
      return new Response(
        JSON.stringify({ 
          found: false, 
          is_connected: false, 
          error: "Não foi possível verificar o status da conexão." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tenta fazer parse do JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      return new Response(
        JSON.stringify({ 
          found: false, 
          is_connected: false, 
          error: "Não foi possível verificar o status da conexão." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsed response from ${action}:`, JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ 
        found: false, 
        is_connected: false, 
        error: "Não foi possível verificar o status da conexão." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
