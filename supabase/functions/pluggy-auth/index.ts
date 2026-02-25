import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Parse body once
    const body = await req.json().catch(() => ({}));
    const { action, itemId } = body;

    const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID');
    const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET');

    if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: 'Pluggy credentials not configured' }), { status: 500, headers: corsHeaders });
    }

    // Get API Key from Pluggy
    const authResponse = await fetch(`${PLUGGY_API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
    });

    if (!authResponse.ok) {
      const errBody = await authResponse.text();
      throw new Error(`Pluggy auth failed [${authResponse.status}]: ${errBody}`);
    }

    const { apiKey } = await authResponse.json();

    if (action === 'connect-token') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const webhookUrl = `${supabaseUrl}/functions/v1/pluggy-webhook`;

      const connectTokenBody: Record<string, any> = {
        options: {
          webhookUrl,
          clientUserId: claimsData.user.id,
          avoidDuplicates: true,
        },
      };

      if (itemId) {
        connectTokenBody.itemId = itemId;
      }

      const connectResponse = await fetch(`${PLUGGY_API_URL}/connect_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
        body: JSON.stringify(connectTokenBody),
      });

      if (!connectResponse.ok) {
        const errBody = await connectResponse.text();
        throw new Error(`Pluggy connect token failed [${connectResponse.status}]: ${errBody}`);
      }

      const connectData = await connectResponse.json();
      return new Response(JSON.stringify({ accessToken: connectData.accessToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-items') {
      // Try listing items by clientUserId first, fallback to single item retrieval
      const listUrl = `${PLUGGY_API_URL}/items?clientUserId=${claimsData.user.id}`;
      console.log(`Fetching items from: ${listUrl}`);
      
      const itemsResponse = await fetch(listUrl, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (itemsResponse.ok) {
        const items = await itemsResponse.json();
        console.log(`Got ${items.results?.length || 0} items`);
        return new Response(JSON.stringify(items), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If list fails, try to get items from our DB and fetch each one
      const errBody = await itemsResponse.text();
      console.log(`List items failed [${itemsResponse.status}]: ${errBody}, trying individual fetch...`);

      // If a specific itemId was provided, try fetching it directly
      if (body.pluggyItemId) {
        const singleResponse = await fetch(`${PLUGGY_API_URL}/items/${body.pluggyItemId}`, {
          headers: { 'X-API-KEY': apiKey },
        });

        if (!singleResponse.ok) {
          const singleErr = await singleResponse.text();
          throw new Error(`Pluggy get item failed [${singleResponse.status}]: ${singleErr}`);
        }

        const item = await singleResponse.json();
        return new Response(JSON.stringify({ results: [item] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      throw new Error(`Pluggy list items failed [${itemsResponse.status}]: ${errBody}`);
    }

    if (action === 'get-accounts') {
      if (!itemId) {
        return new Response(JSON.stringify({ error: 'itemId required' }), { status: 400, headers: corsHeaders });
      }

      const accountsResponse = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${itemId}`, {
        headers: { 'X-API-KEY': apiKey },
      });

      if (!accountsResponse.ok) {
        const errBody = await accountsResponse.text();
        throw new Error(`Pluggy get accounts failed [${accountsResponse.status}]: ${errBody}`);
      }

      const accounts = await accountsResponse.json();
      return new Response(JSON.stringify(accounts), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ apiKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Pluggy auth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
