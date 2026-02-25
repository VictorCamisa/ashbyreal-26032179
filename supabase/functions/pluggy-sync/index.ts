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
  resync: boolean = false,
) {
  const { data: card } = await supabaseAdmin
    .from('credit_cards')
    .select('*')
    .eq('id', creditCardId)
    .single();

  if (!card) {
    console.error(`Credit card ${creditCardId} not found`);
    return { inserted: 0, skipped: 0, total: 0, error: 'Card not found' };
  }

  const closingDay = card.closing_day || 10;

  // ========== 0. RESYNC: DELETE OLD DATA ==========
  if (resync) {
    console.log(`RESYNC mode: deleting existing Pluggy transactions for card ${creditCardId}`);
    
    const { count: projectedDeleted } = await supabaseAdmin
      .from('credit_card_transactions')
      .delete({ count: 'exact' })
      .eq('credit_card_id', creditCardId)
      .eq('item_status', 'PROJETADO');
    
    // Delete ALL IMPORTADO — Pluggy is the source of truth
    const { count: importedDeleted } = await supabaseAdmin
      .from('credit_card_transactions')
      .delete({ count: 'exact' })
      .eq('credit_card_id', creditCardId)
      .eq('item_status', 'IMPORTADO');
    
    console.log(`Resync deleted: ${projectedDeleted || 0} projected, ${importedDeleted || 0} imported`);
    
    // Delete invoices with no remaining transactions
    const { data: invoices } = await supabaseAdmin
      .from('credit_card_invoices')
      .select('id, competencia')
      .eq('credit_card_id', creditCardId);
    
    if (invoices && invoices.length > 0) {
      // Single query to check all competencias
      const { data: txWithComp } = await supabaseAdmin
        .from('credit_card_transactions')
        .select('competencia')
        .eq('credit_card_id', creditCardId);
      
      const activeComps = new Set((txWithComp || []).map((t: any) => t.competencia));
      const emptyInvoiceIds = invoices
        .filter((inv: any) => !activeComps.has(inv.competencia))
        .map((inv: any) => inv.id);
      
      if (emptyInvoiceIds.length > 0) {
        await supabaseAdmin
          .from('credit_card_invoices')
          .delete()
          .in('id', emptyInvoiceIds);
      }
    }
  }

  // ========== 1. FETCH TRANSACTIONS ==========
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

  // ========== 2. FETCH BILLS ==========
  let bills: any[] = [];
  try {
    const billsRes = await fetch(
      `${PLUGGY_API_URL}/bills?accountId=${pluggyAccountId}`,
      { headers: { 'X-API-KEY': apiKey } }
    );
    if (billsRes.ok) {
      const billsData = await billsRes.json();
      bills = billsData.results || [];
      console.log(`Fetched ${bills.length} bills from Pluggy`);
    }
  } catch (e) {
    console.warn('Bills API failed:', e);
  }

  // ========== 3. BATCH INSERT TRANSACTIONS ==========
  // First, get ALL existing dedupe keys for this card in one query
  const { data: existingKeys } = await supabaseAdmin
    .from('credit_card_transactions')
    .select('dedupe_key')
    .eq('credit_card_id', creditCardId)
    .not('dedupe_key', 'is', null);

  const existingKeySet = new Set((existingKeys || []).map((r: any) => r.dedupe_key));

  let inserted = 0;
  let skipped = 0;
  let paymentsFiltered = 0;

  const toInsert: any[] = [];
  const installmentPurchases: Array<{
    description: string;
    amount: number;
    purchaseDate: string;
    installmentNumber: number;
    totalInstallments: number;
    competencia: string;
  }> = [];

  for (const tx of transactions) {
    const purchaseDate = tx.date?.split('T')[0];
    if (!purchaseDate) continue;

    const amount = Math.abs(tx.amount || 0);
    const description = tx.description || tx.descriptionRaw || 'Sem descrição';

    if (isPaymentLine(description)) {
      paymentsFiltered++;
      console.log(`Filtered payment: ${description} | ${amount}`);
      continue;
    }

    const competencia = calculateCompetencia(purchaseDate, closingDay);
    const dedupeKey = generateDedupeKey(description, amount, purchaseDate);

    if (existingKeySet.has(dedupeKey)) { skipped++; continue; }

    const installmentNumber = tx.creditCardMetadata?.installmentNumber || 1;
    const totalInstallments = tx.creditCardMetadata?.totalInstallments || 1;

    toInsert.push({
      credit_card_id: creditCardId,
      description,
      amount,
      purchase_date: purchaseDate,
      competencia,
      dedupe_key: dedupeKey,
      installment_number: installmentNumber,
      total_installments: totalInstallments,
      item_status: 'IMPORTADO',
      notes: `Pluggy sync - ${tx.id}`,
    });

    // Mark dedupe key as used to avoid duplicates within batch
    existingKeySet.add(dedupeKey);

    if (totalInstallments > 1 && installmentNumber < totalInstallments) {
      installmentPurchases.push({
        description, amount, purchaseDate,
        installmentNumber, totalInstallments, competencia,
      });
    }
  }

  // Batch insert in chunks of 50
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error: batchError } = await supabaseAdmin
      .from('credit_card_transactions')
      .insert(chunk);
    
    if (batchError) {
      console.error('Batch insert error:', batchError);
    }
  }
  inserted = toInsert.length;

  console.log(`Transactions: ${inserted} inserted, ${skipped} skipped, ${paymentsFiltered} payments filtered`);

  // ========== 4. GENERATE FUTURE INSTALLMENTS (BATCH) ==========
  const futureToInsert: any[] = [];

  for (const purchase of installmentPurchases) {
    const remaining = purchase.totalInstallments - purchase.installmentNumber;
    
    for (let i = 1; i <= remaining; i++) {
      const futureInstallment = purchase.installmentNumber + i;
      
      const baseComp = new Date(purchase.competencia + 'T12:00:00Z');
      const futureMonth = baseComp.getUTCMonth() + i;
      const futureYear = baseComp.getUTCFullYear() + Math.floor(futureMonth / 12);
      const futureMonthNorm = futureMonth % 12;
      const futureCompetencia = `${futureYear}-${String(futureMonthNorm + 1).padStart(2, '0')}-01`;

      const futureDedupeKey = `${cleanDescription(purchase.description).toLowerCase().replace(/\s+/g, '_')}|${Math.abs(purchase.amount).toFixed(2)}|${purchase.purchaseDate}|inst${futureInstallment}`;

      if (existingKeySet.has(futureDedupeKey)) continue;
      existingKeySet.add(futureDedupeKey);

      futureToInsert.push({
        credit_card_id: creditCardId,
        description: purchase.description,
        amount: purchase.amount,
        purchase_date: purchase.purchaseDate,
        competencia: futureCompetencia,
        dedupe_key: futureDedupeKey,
        installment_number: futureInstallment,
        total_installments: purchase.totalInstallments,
        item_status: 'PROJETADO',
        notes: `Pluggy sync - parcela futura ${futureInstallment}/${purchase.totalInstallments}`,
      });
    }
  }

  // Batch insert future installments
  for (let i = 0; i < futureToInsert.length; i += 50) {
    const chunk = futureToInsert.slice(i, i + 50);
    const { error } = await supabaseAdmin
      .from('credit_card_transactions')
      .insert(chunk);
    if (error) console.error('Future batch error:', error);
  }

  console.log(`Future installments created: ${futureToInsert.length}`);

  // ========== 5. CREATE/UPDATE INVOICES (BATCH) ==========
  // Fetch all transactions with status to separate IMPORTADO vs PROJETADO
  const { data: allTx } = await supabaseAdmin
    .from('credit_card_transactions')
    .select('competencia, amount, item_status')
    .eq('credit_card_id', creditCardId);

  // Build two maps: one for IMPORTADO totals, one for all totals
  const importadoMap = new Map<string, number>();
  const allMap = new Map<string, number>();
  for (const t of (allTx || [])) {
    allMap.set(t.competencia, (allMap.get(t.competencia) || 0) + (t.amount || 0));
    if (t.item_status === 'IMPORTADO') {
      importadoMap.set(t.competencia, (importadoMap.get(t.competencia) || 0) + (t.amount || 0));
    }
  }

  // For invoice totals: prefer IMPORTADO-only total when real data exists,
  // otherwise fall back to all (which means only PROJETADO for future months)
  const compMap = new Map<string, number>();
  for (const [comp, total] of allMap) {
    const importadoTotal = importadoMap.get(comp);
    compMap.set(comp, importadoTotal != null ? importadoTotal : total);
  }

  const billTotalByComp = new Map<string, number>();
  for (const bill of bills) {
    if (!bill.dueDate || bill.totalAmount == null) continue;
    const dueDate = new Date(bill.dueDate);
    const comp = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
    billTotalByComp.set(comp, Math.abs(bill.totalAmount));
  }

  // Get all existing invoices in one query
  const { data: existingInvoices } = await supabaseAdmin
    .from('credit_card_invoices')
    .select('id, competencia')
    .eq('credit_card_id', creditCardId);

  const invoiceByComp = new Map<string, string>();
  for (const inv of (existingInvoices || [])) {
    invoiceByComp.set(inv.competencia, inv.id);
  }

  const invoicesToUpdate: Array<{ id: string; total_value: number }> = [];
  const invoicesToCreate: any[] = [];

  for (const [comp, txTotal] of compMap) {
    const invoiceTotal = billTotalByComp.get(comp) ?? txTotal;
    const existingId = invoiceByComp.get(comp);

    if (existingId) {
      invoicesToUpdate.push({ id: existingId, total_value: invoiceTotal });
    } else {
      const compDate = new Date(comp);
      const dueDay = card.due_day || 20;
      const dueDate = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
      invoicesToCreate.push({
        credit_card_id: creditCardId,
        competencia: comp,
        total_value: invoiceTotal,
        due_date: dueDate,
        status: 'ABERTA',
      });
    }
  }

  // Batch update existing invoices
  for (const upd of invoicesToUpdate) {
    await supabaseAdmin
      .from('credit_card_invoices')
      .update({ total_value: upd.total_value, updated_at: new Date().toISOString() })
      .eq('id', upd.id);
  }

  // Batch insert new invoices
  if (invoicesToCreate.length > 0) {
    const { data: newInvoices } = await supabaseAdmin
      .from('credit_card_invoices')
      .insert(invoicesToCreate)
      .select('id, competencia');

    for (const inv of (newInvoices || [])) {
      invoiceByComp.set(inv.competencia, inv.id);
    }
  }

  // Link transactions to invoices in batch (one update per competencia)
  for (const [comp] of compMap) {
    const invoiceId = invoiceByComp.get(comp);
    if (invoiceId) {
      await supabaseAdmin
        .from('credit_card_transactions')
        .update({ invoice_id: invoiceId })
        .eq('credit_card_id', creditCardId)
        .eq('competencia', comp)
        .is('invoice_id', null);
    }
  }

  return {
    inserted,
    skipped,
    paymentsFiltered,
    futureInstallmentsCreated: futureToInsert.length,
    total: transactions.length,
    billsFound: bills.length,
    competencias: compMap.size,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pluggyItemId, creditCardId, isWebhook, resync } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    // CASE 1: Sync a specific card
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

      const result = await syncSingleCard(supabaseAdmin, apiKey, mapping.pluggy_item_id, accountId, creditCardId, resync);

      await supabaseAdmin
        .from('pluggy_items')
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'SUCCESS', sync_error: null })
        .eq('credit_card_id', creditCardId);

      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CASE 2: Sync ALL cards linked to a pluggyItemId
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
            supabaseAdmin, apiKey, pluggyItemId, mapping.pluggy_account_id, mapping.credit_card_id!, resync
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
