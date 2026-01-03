import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // GET: Fetch receipt data for signing page
    if (req.method === 'GET') {
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Token obrigatório' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Fetching receipt with token:', token);

      // Get receipt with order data
      const { data: receipt, error: receiptError } = await supabase
        .from('delivery_receipts')
        .select('*')
        .eq('token', token)
        .single();

      if (receiptError || !receipt) {
        console.error('Receipt not found:', receiptError);
        return new Response(
          JSON.stringify({ error: 'Comprovante não encontrado' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get order items
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('numero_pedido, valor_total')
        .eq('id', receipt.pedido_id)
        .single();

      const { data: itens } = await supabase
        .from('pedido_itens')
        .select('quantidade, preco_unitario, subtotal, produtos(nome)')
        .eq('pedido_id', receipt.pedido_id);

      console.log('Receipt found, status:', receipt.status);

      return new Response(
        JSON.stringify({
          receipt: {
            ...receipt,
            numero_pedido: pedido?.numero_pedido,
            valor_total: pedido?.valor_total,
            itens: itens || [],
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // POST: Sign the receipt
    if (req.method === 'POST') {
      const body = await req.json();
      const { token: postToken, signature_data } = body;

      if (!postToken || !signature_data) {
        return new Response(
          JSON.stringify({ error: 'Token e assinatura são obrigatórios' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Signing receipt with token:', postToken);

      // Verify receipt exists and is pending/sent
      const { data: receipt, error: fetchError } = await supabase
        .from('delivery_receipts')
        .select('id, status')
        .eq('token', postToken)
        .single();

      if (fetchError || !receipt) {
        console.error('Receipt not found for signing:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Comprovante não encontrado' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (receipt.status === 'signed') {
        return new Response(
          JSON.stringify({ error: 'Comprovante já foi assinado' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get client IP
      const clientIP = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';

      // Update receipt with signature
      const { error: updateError } = await supabase
        .from('delivery_receipts')
        .update({
          status: 'signed',
          signature_data,
          signed_at: new Date().toISOString(),
          signed_ip: clientIP,
        })
        .eq('id', receipt.id);

      if (updateError) {
        console.error('Error updating receipt:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao salvar assinatura' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Receipt signed successfully');

      return new Response(
        JSON.stringify({ success: true, message: 'Comprovante assinado com sucesso!' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in sign-delivery-receipt:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
