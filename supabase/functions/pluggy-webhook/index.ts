import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Pluggy webhook received:', JSON.stringify(body));

    const { event, itemId } = body;

    if (!['item/updated', 'item/created'].includes(event)) {
      console.log(`Ignoring event: ${event}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing itemId' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if ANY cards are linked to this item (multiple cards possible)
    const { data: mappings } = await supabaseAdmin
      .from('pluggy_items')
      .select('credit_card_id')
      .eq('pluggy_item_id', itemId);

    if (!mappings || mappings.length === 0) {
      console.log(`No mapping found for Pluggy item ${itemId}`);
      return new Response(JSON.stringify({ ok: true, noMapping: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Trigger sync for the entire item (will sync all linked cards)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const syncResponse = await fetch(`${supabaseUrl}/functions/v1/pluggy-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        pluggyItemId: itemId,
        isWebhook: true,
      }),
    });

    const syncResult = await syncResponse.json();
    console.log('Sync result:', JSON.stringify(syncResult));

    return new Response(JSON.stringify({ ok: true, syncResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Pluggy webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
