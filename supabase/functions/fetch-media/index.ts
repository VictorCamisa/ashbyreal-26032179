import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:")) {
      return new Response(JSON.stringify({ error: "invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already a data URL, just return.
    if (url.startsWith("data:")) {
      return new Response(JSON.stringify({ dataUrl: url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[fetch-media] Fetching: ${url.substring(0, 200)}`);

    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error(`[fetch-media] Upstream error ${resp.status}: ${text.substring(0, 300)}`);
      return new Response(JSON.stringify({ error: `upstream ${resp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const buffer = new Uint8Array(await resp.arrayBuffer());
    const b64 = toBase64(buffer);
    const dataUrl = `data:${contentType.split(";")[0]};base64,${b64}`;

    return new Response(JSON.stringify({ dataUrl, contentType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[fetch-media] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
