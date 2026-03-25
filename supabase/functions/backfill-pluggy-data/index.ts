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

function calculateCompetencia(purchaseDate: string, closingDay: number): string {
  const date = new Date(purchaseDate + 'T12:00:00Z');
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  let competenciaMonth: number;
  let competenciaYear: number;

  if (day <= closingDay) {
    competenciaMonth = month + 1;
    competenciaYear = year;
  } else {
    competenciaMonth = month + 2;
    competenciaYear = year;
  }

  if (competenciaMonth > 11) {
    competenciaYear += Math.floor(competenciaMonth / 12);
    competenciaMonth = competenciaMonth % 12;
  }

  return `${competenciaYear}-${String(competenciaMonth + 1).padStart(2, '0')}-01`;
}

function generateDedupeKey(description: string, amount: number, date: string): string {
  const cleaned = cleanDescription(description).toLowerCase().replace(/\s+/g, '_');
  return `${cleaned}|${Math.abs(amount).toFixed(2)}|${date}`;
}

function isPaymentLine(description: string): boolean {
  const d = String(description ?? '').toLowerCase().trim();
  return (
    /^pagamento\b/.test(d) ||
    d.includes('pagto') ||
    d.includes('pgto') ||
    d.includes('pagamento efetuado') ||
    d.includes('pagamento fatura') ||
    d.includes('pagamento da fatura') ||
    d.includes('pagamento de fatura')
  );
}

async function syncSingleCard(
  supabaseAdmin: any,
  apiKey: string,
  pluggyItemId: string,
  pluggyAccountId: string,
  creditCardId: string,
) {
  const { data: card } = await supabaseAdmin
    .from('credit_cards')
    .select('*')
    .eq('id', creditCardId)
    .single();

  if (!card) {
    return { inserted: 0, skipped: 0, total: 0, error: 'Card not found' };
  }

  const closingDay = card.closing_day || 10;

  // Fetch last 90 days to cover the full gap
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 90);
  const from = fromDate.toISOString().split('T')[0];

  const txUrl = `${PLUGGY_API_URL}/transactions?accountId=${pluggyAccountId}&from=${from}&pageSize=500`;
  const txResponse = await fetch(txUrl, { headers: { 'X-API-KEY': apiKey } });

  if (!txResponse.ok) {
    const err = await txResponse.text();
    throw new Error(`Pluggy transactions fetch failed [${txResponse.status}]: ${err}`);
  }

  const txData = await txResponse.json();
  const transactions = txData.results || [];

  let inserted = 0;
  let skipped = 0;
  let paymentsFiltered = 0;
  const toInsert: any[] = [];

  for (const tx of transactions) {
    if (isPaymentLine(tx.description)) {
      paymentsFiltered++;
      continue;
    }

    const purchaseDate = tx.date?.split('T')[0] || tx.date;
    const amount = Math.abs(tx.amount);
    const dedupeKey = generateDedupeKey(tx.description, amount, purchaseDate);
    const competencia = calculateCompetencia(purchaseDate, closingDay);

    const { data: existing } = await supabaseAdmin
      .from('credit_card_transactions')
      .select('id')
      .eq('credit_card_id', creditCardId)
      .eq('dedupe_key', dedupeKey)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    toInsert.push({
      credit_card_id: creditCardId,
      description: cleanDescription(tx.description),
      amount,
      purchase_date: purchaseDate,
      competencia,
      installment_number: tx.installments?.number || 1,
      total_installments: tx.installments?.total || 1,
      is_recurring: false,
      item_status: 'IMPORTADO',
      dedupe_key: dedupeKey,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabaseAdmin
      .from('credit_card_transactions')
      .insert(toInsert);

    if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`);
    inserted = toInsert.length;
  }

  // Update invoices for affected competencias
  const compSet = new Set(toInsert.map(t => t.competencia));
  for (const comp of compSet) {
    const { data: txsInComp } = await supabaseAdmin
      .from('credit_card_transactions')
      .select('amount')
      .eq('credit_card_id', creditCardId)
      .eq('competencia', comp)
      .neq('item_status', 'PROJETADO');

    const invoiceTotal = (txsInComp || []).reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const { data: existingInvoice } = await supabaseAdmin
      .from('credit_card_invoices')
      .select('id')
      .eq('credit_card_id', creditCardId)
      .eq('competencia', comp)
      .maybeSingle();

    if (existingInvoice) {
      await supabaseAdmin
        .from('credit_card_invoices')
        .update({ total_value: invoiceTotal, updated_at: new Date().toISOString() })
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
          total_value: invoiceTotal,
          due_date: dueDate,
          status: 'ABERTA',
        });
    }
  }

  return { inserted, skipped, paymentsFiltered, total: transactions.length };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate user token
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { error: authError } = await supabaseUser.auth.getUser(token);
    if (authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Get all active pluggy items with linked cards
    const { data: items } = await supabaseAdmin
      .from('pluggy_items')
      .select('id, pluggy_item_id, pluggy_account_id, credit_card_id, connector_name')
      .eq('status', 'ACTIVE')
      .not('credit_card_id', 'is', null)
      .not('pluggy_account_id', 'is', null);

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhum cartão ativo com Pluggy', results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = await getPluggyApiKey();
    const results: any[] = [];

    for (const item of items) {
      console.log(`Syncing card ${item.credit_card_id} (${item.connector_name})...`);
      try {
        const result = await syncSingleCard(
          supabaseAdmin,
          apiKey,
          item.pluggy_item_id,
          item.pluggy_account_id,
          item.credit_card_id,
        );
        results.push({ creditCardId: item.credit_card_id, connector: item.connector_name, ...result });

        await supabaseAdmin
          .from('pluggy_items')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'SUCCESS',
            sync_error: null,
          })
          .eq('id', item.id);
      } catch (err: any) {
        console.error(`Sync failed for card ${item.credit_card_id}:`, err);
        results.push({ creditCardId: item.credit_card_id, connector: item.connector_name, error: err.message });

        await supabaseAdmin
          .from('pluggy_items')
          .update({
            last_sync_at: new Date().toISOString(),
            last_sync_status: 'ERROR',
            sync_error: err.message,
          })
          .eq('id', item.id);
      }
    }

    const totalInserted = results.reduce((sum, r) => sum + (r.inserted || 0), 0);

    return new Response(
      JSON.stringify({ success: true, totalInserted, cardsSynced: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Backfill error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
