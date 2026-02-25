import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLUGGY_API_URL = 'https://api.pluggy.ai';

async function getPluggyApiKey(): Promise<string> {
  const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID')!;
  const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET')!;

  const authResponse = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });

  if (!authResponse.ok) {
    const err = await authResponse.text();
    throw new Error(`Pluggy auth failed [${authResponse.status}]: ${err}`);
  }

  const { apiKey } = await authResponse.json();
  return apiKey;
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s*\d+\/\d+\s*/g, ' ')
    .replace(/\s*PARCELA\s+\d+\s+DE\s+\d+\s*/gi, ' ')
    .replace(/\s*\d+x\d+\s*/gi, ' ')
    .trim();
}

function generateDedupeKey(description: string, amount: number, date: string): string {
  const cleaned = cleanDescription(description).toLowerCase().replace(/\s+/g, '_');
  return `${cleaned}|${Math.abs(amount).toFixed(2)}|${date}`;
}

async function syncSingleCard(
  supabaseAdmin: any,
  apiKey: string,
  pluggyItemId: string,
  pluggyAccountId: string,
  creditCardId: string,
) {
  // Get credit card details
  const { data: card } = await supabaseAdmin
    .from('credit_cards')
    .select('*')
    .eq('id', creditCardId)
    .single();

  if (!card) {
    console.error(`Credit card ${creditCardId} not found`);
    return { inserted: 0, skipped: 0, total: 0, error: 'Card not found' };
  }

  // Fetch transactions from Pluggy
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const from = threeMonthsAgo.toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];

  const txRes = await fetch(
    `${PLUGGY_API_URL}/transactions?accountId=${pluggyAccountId}&from=${from}&to=${to}&pageSize=500`,
    { headers: { 'X-API-KEY': apiKey } }
  );

  if (!txRes.ok) {
    const err = await txRes.text();
    throw new Error(`Failed to get transactions [${txRes.status}]: ${err}`);
  }

  const txData = await txRes.json();
  const transactions = txData.results || [];

  let inserted = 0;
  let skipped = 0;
  const closingDay = card.closing_day || 10;

  for (const tx of transactions) {
    const purchaseDate = tx.date?.split('T')[0];
    if (!purchaseDate) continue;

    const amount = Math.abs(tx.amount || 0);
    const description = tx.description || tx.descriptionRaw || 'Sem descrição';

    // Calculate competencia
    const pDate = new Date(purchaseDate);
    const pDay = pDate.getDate();
    let compMonth: number, compYear: number;

    if (pDay <= closingDay) {
      compMonth = pDate.getMonth();
      compYear = pDate.getFullYear();
    } else {
      compMonth = pDate.getMonth() + 1;
      compYear = pDate.getFullYear();
      if (compMonth > 11) { compMonth = 0; compYear++; }
    }

    const competencia = `${compYear}-${String(compMonth + 1).padStart(2, '0')}-01`;
    const dedupeKey = generateDedupeKey(description, amount, purchaseDate);

    const { data: existing } = await supabaseAdmin
      .from('credit_card_transactions')
      .select('id')
      .eq('credit_card_id', creditCardId)
      .eq('dedupe_key', dedupeKey)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    const { error: insertError } = await supabaseAdmin
      .from('credit_card_transactions')
      .insert({
        credit_card_id: creditCardId,
        description,
        amount,
        purchase_date: purchaseDate,
        competencia,
        dedupe_key: dedupeKey,
        installment_number: tx.creditCardMetadata?.installmentNumber || 1,
        total_installments: tx.creditCardMetadata?.totalInstallments || 1,
        item_status: 'IMPORTADO',
        notes: `Pluggy sync - ${tx.id}`,
      });

    if (insertError) { console.error('Insert error:', insertError); }
    else { inserted++; }
  }

  // Update/create invoices for affected competencias
  const competencias = [...new Set(transactions.map((tx: any) => {
    const pDate = new Date(tx.date?.split('T')[0]);
    const pDay = pDate.getDate();
    let m = pDay <= closingDay ? pDate.getMonth() : pDate.getMonth() + 1;
    let y = pDate.getFullYear();
    if (m > 11) { m = 0; y++; }
    return `${y}-${String(m + 1).padStart(2, '0')}-01`;
  }))];

  for (const comp of competencias) {
    const { data: txForComp } = await supabaseAdmin
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', creditCardId)
      .eq('competencia', comp);

    const total = (txForComp || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    const { data: existingInvoice } = await supabaseAdmin
      .from('credit_card_invoices')
      .select('id')
      .eq('credit_card_id', creditCardId)
      .eq('competencia', comp)
      .maybeSingle();

    if (existingInvoice) {
      await supabaseAdmin
        .from('credit_card_invoices')
        .update({ total_value: total, updated_at: new Date().toISOString() })
        .eq('id', existingInvoice.id);
    } else {
      const compDate = new Date(comp);
      const dueDay = card.due_day || 20;
      const dueDate = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

      await supabaseAdmin
        .from('credit_card_invoices')
        .insert({
          credit_card_id: creditCardId,
          competencia: comp,
          total_value: total,
          due_date: dueDate,
          status: 'ABERTA',
        });
    }
  }

  return { inserted, skipped, total: transactions.length, competencias: competencias.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pluggyItemId, creditCardId, isWebhook } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If not a webhook call, validate auth
    if (!isWebhook) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { error } = await supabaseUser.auth.getUser(token);
      if (error) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
    }

    const apiKey = await getPluggyApiKey();

    // CASE 1: Sync a specific card by creditCardId
    if (creditCardId && !pluggyItemId) {
      const { data: mapping } = await supabaseAdmin
        .from('pluggy_items')
        .select('pluggy_item_id, pluggy_account_id')
        .eq('credit_card_id', creditCardId)
        .single();

      if (!mapping) {
        return new Response(JSON.stringify({ error: 'No Pluggy item linked to this card' }), {
          status: 400, headers: corsHeaders,
        });
      }

      let accountId = mapping.pluggy_account_id;

      // If no account ID stored, try to find one
      if (!accountId) {
        const accountsRes = await fetch(`${PLUGGY_API_URL}/accounts?itemId=${mapping.pluggy_item_id}&type=CREDIT`, {
          headers: { 'X-API-KEY': apiKey },
        });
        const accountsData = await accountsRes.json();
        accountId = accountsData.results?.[0]?.id;

        if (accountId) {
          await supabaseAdmin
            .from('pluggy_items')
            .update({ pluggy_account_id: accountId })
            .eq('credit_card_id', creditCardId);
        }
      }

      if (!accountId) {
        return new Response(JSON.stringify({ error: 'No credit account found in Pluggy' }), {
          status: 400, headers: corsHeaders,
        });
      }

      const result = await syncSingleCard(supabaseAdmin, apiKey, mapping.pluggy_item_id, accountId, creditCardId);

      await supabaseAdmin
        .from('pluggy_items')
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'SUCCESS', sync_error: null })
        .eq('credit_card_id', creditCardId);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CASE 2: Sync ALL cards linked to a pluggyItemId (webhook or manual)
    if (pluggyItemId) {
      const { data: mappings } = await supabaseAdmin
        .from('pluggy_items')
        .select('credit_card_id, pluggy_account_id')
        .eq('pluggy_item_id', pluggyItemId);

      if (!mappings || mappings.length === 0) {
        return new Response(JSON.stringify({ error: 'No cards linked to this Pluggy item' }), {
          status: 400, headers: corsHeaders,
        });
      }

      const results: any[] = [];

      for (const mapping of mappings) {
        if (!mapping.pluggy_account_id) {
          console.warn(`Skipping card ${mapping.credit_card_id} — no pluggy_account_id`);
          continue;
        }

        try {
          const result = await syncSingleCard(
            supabaseAdmin, apiKey, pluggyItemId, mapping.pluggy_account_id, mapping.credit_card_id!
          );
          results.push({ creditCardId: mapping.credit_card_id, ...result });

          await supabaseAdmin
            .from('pluggy_items')
            .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'SUCCESS', sync_error: null })
            .eq('credit_card_id', mapping.credit_card_id);
        } catch (err: any) {
          console.error(`Sync failed for card ${mapping.credit_card_id}:`, err);
          results.push({ creditCardId: mapping.credit_card_id, error: err.message });

          await supabaseAdmin
            .from('pluggy_items')
            .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'ERROR', sync_error: err.message })
            .eq('credit_card_id', mapping.credit_card_id);
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Provide pluggyItemId or creditCardId' }), {
      status: 400, headers: corsHeaders,
    });

  } catch (error) {
    console.error('Pluggy sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
