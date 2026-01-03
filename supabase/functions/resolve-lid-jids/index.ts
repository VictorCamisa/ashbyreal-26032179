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

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { instanceName } = await req.json();

    if (!instanceName) {
      throw new Error("instanceName is required");
    }

    console.log(`[resolve-lid-jids] Starting resolution for instance: ${instanceName}`);

    // Get all messages with @lid that haven't been resolved yet
    const { data: lidMessages, error: fetchError } = await supabase
      .from("whatsapp_messages")
      .select("id, remote_jid, metadata")
      .like("remote_jid", "%@lid")
      .is("metadata->remote_jid_alt", null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[resolve-lid-jids] Found ${lidMessages?.length || 0} unresolved @lid messages`);

    if (!lidMessages || lidMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, resolved: 0, message: "No @lid messages to resolve" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by unique remote_jid to avoid duplicate API calls
    const uniqueJids = [...new Set(lidMessages.map((m) => m.remote_jid))];
    console.log(`[resolve-lid-jids] Unique JIDs to resolve: ${uniqueJids.length}`);

    const normalizeLidJid = (jid: string) => jid.replace(/:\d+(?=@lid)/g, "");

    let resolved = 0;
    const results: Record<string, string | null> = {};

    for (const lidJid of uniqueJids) {
      const lidNormalized = normalizeLidJid(lidJid);
      const lidBase = lidNormalized.split("@")[0];

      try {
        // Try /chat/findContacts to get pnJid
        const url = `${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`;
        console.log(`[resolve-lid-jids] Calling ${url} for ${lidJid}`);

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            apikey: EVOLUTION_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ where: { id: lidNormalized } }),
        });

        const responseText = await resp.text();
        console.log(`[resolve-lid-jids] Response for ${lidJid}: ${responseText.substring(0, 500)}`);

        if (!resp.ok) {
          console.warn(`[resolve-lid-jids] API error for ${lidJid}: ${resp.status}`);
          results[lidJid] = null;
          continue;
        }

        const data = responseText ? JSON.parse(responseText) : null;

        // Response can be an array or single object
        const contacts = Array.isArray(data) ? data : data?.contacts || (data ? [data] : []);
        let realJid: string | null = null;
        let contactName: string | null = null;

        for (const c of contacts) {
          const pn = c?.pnJid || c?.id;
          if (pn && pn.includes("@s.whatsapp.net")) {
            realJid = pn;
            contactName = c?.pushName || c?.name || c?.notify || null;
            break;
          }
        }

        if (realJid) {
          console.log(`[resolve-lid-jids] Resolved ${lidJid} -> ${realJid} (${contactName})`);
          results[lidJid] = realJid;

          // Update all messages with this @lid base (handles variants like :48@lid)
          const { error: updateError } = await supabase
            .from("whatsapp_messages")
            .update({
              remote_jid: realJid,
              metadata: {
                remote_jid_raw: lidJid,
                remote_jid_alt: realJid,
                phone_number: realJid.split("@")[0],
                sender_name: contactName,
                push_name: contactName,
              },
            })
            .like("remote_jid", `${lidBase}%@lid`);

          if (updateError) {
            console.error(`[resolve-lid-jids] Error updating ${lidJid}:`, updateError);
          } else {
            resolved++;
          }
        } else {
          console.log(`[resolve-lid-jids] Could not resolve ${lidJid}`);
          results[lidJid] = null;
        }
      } catch (e) {
        console.error(`[resolve-lid-jids] Error processing ${lidJid}:`, e);
        results[lidJid] = null;
      }
    }

    console.log(`[resolve-lid-jids] Completed. Resolved ${resolved}/${uniqueJids.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total: uniqueJids.length,
        resolved,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[resolve-lid-jids] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
