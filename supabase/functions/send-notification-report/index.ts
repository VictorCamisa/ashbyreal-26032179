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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { scheduleId } = await req.json();

    if (!scheduleId) throw new Error("scheduleId is required");

    // Get schedule
    const { data: schedule, error: schedError } = await supabase
      .from("notification_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();

    if (schedError || !schedule) throw new Error("Schedule not found");

    // Get instance - don't check status, it can be stale in DB
    let instanceName = "";
    if (schedule.instance_id) {
      const { data: inst } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("id", schedule.instance_id)
        .single();
      if (!inst) throw new Error("WhatsApp instance not found");
      instanceName = inst.instance_name;
    } else {
      const { data: anyInst } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .limit(1)
        .single();
      if (!anyInst) throw new Error("No WhatsApp instance found. Please create one first.");
      instanceName = anyInst.instance_name;
    }

    // Build report based on type
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const reportType = schedule.report_type;

    let reportMessage = "";

    // ---------- VENDAS DO DIA ----------
    if (reportType === "vendas_dia" || reportType === "relatorio_completo") {
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("id, valor_total, status, cliente_id, clientes(nome)")
        .gte("data_pedido", todayStart)
        .lt("data_pedido", todayEnd);

      const totalVendas = pedidos?.length || 0;
      const valorTotal = pedidos?.reduce((s, p) => s + (p.valor_total || 0), 0) || 0;
      const entregues = pedidos?.filter(p => p.status === "entregue").length || 0;
      const pendentes = pedidos?.filter(p => p.status === "pendente").length || 0;

      reportMessage += `📊 *VENDAS DO DIA*\n`;
      reportMessage += `📅 ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}\n\n`;
      reportMessage += `🛒 Total de pedidos: *${totalVendas}*\n`;
      reportMessage += `💰 Faturamento: *R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
      reportMessage += `✅ Entregues: *${entregues}*\n`;
      reportMessage += `⏳ Pendentes: *${pendentes}*\n`;

      if (pedidos?.length) {
        const ticketMedio = valorTotal / totalVendas;
        reportMessage += `📈 Ticket Médio: *R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
      }
      reportMessage += `\n`;
    }

    // ---------- LEADS NA BASE ----------
    if (reportType === "leads_base" || reportType === "relatorio_completo") {
      const { data: leads } = await supabase.from("leads").select("id, status, valor_estimado");
      const { data: novosHoje } = await supabase
        .from("leads")
        .select("id")
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      const totalLeads = leads?.length || 0;
      const novos = leads?.filter(l => l.status === "novo_lead").length || 0;
      const qualificados = leads?.filter(l => l.status === "qualificado").length || 0;
      const negociacao = leads?.filter(l => l.status === "negociacao").length || 0;
      const fechados = leads?.filter(l => l.status === "fechado").length || 0;
      const valorPipeline = leads?.reduce((s, l) => s + (l.valor_estimado || 0), 0) || 0;

      reportMessage += `🎯 *LEADS & PIPELINE*\n\n`;
      reportMessage += `📊 Total na base: *${totalLeads}*\n`;
      reportMessage += `🆕 Novos hoje: *${novosHoje?.length || 0}*\n`;
      reportMessage += `🔵 Novos: *${novos}* | Qualificados: *${qualificados}*\n`;
      reportMessage += `🟡 Em negociação: *${negociacao}* | Fechados: *${fechados}*\n`;
      reportMessage += `💎 Valor pipeline: *R$ ${valorPipeline.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
    }

    // ---------- PEDIDOS PENDENTES ----------
    if (reportType === "pedidos_pendentes" || reportType === "relatorio_completo") {
      const { data: pendentes } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, valor_total, data_entrega, clientes(nome)")
        .in("status", ["pendente", "confirmado", "em_producao", "pronto"]);

      reportMessage += `📦 *PEDIDOS PENDENTES*\n\n`;
      reportMessage += `Total: *${pendentes?.length || 0}* pedidos\n`;

      if (pendentes?.length) {
        const valorPendente = pendentes.reduce((s, p) => s + (p.valor_total || 0), 0);
        reportMessage += `💰 Valor total: *R$ ${valorPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;

        const top5 = pendentes.slice(0, 5);
        top5.forEach(p => {
          const cliente = (p.clientes as any)?.nome || "S/N";
          reportMessage += `  • #${p.numero_pedido} - ${cliente} - R$ ${(p.valor_total || 0).toFixed(2)}\n`;
        });
        if (pendentes.length > 5) reportMessage += `  _...e mais ${pendentes.length - 5} pedidos_\n`;
      }
      reportMessage += `\n`;
    }

    // ---------- ESTOQUE BAIXO ----------
    if (reportType === "estoque_baixo" || reportType === "relatorio_completo") {
      const { data: produtos } = await supabase
        .from("produtos")
        .select("nome, estoque, estoque_minimo")
        .eq("ativo", true);

      const baixo = produtos?.filter(p => (p.estoque || 0) <= (p.estoque_minimo || 5)) || [];

      reportMessage += `⚠️ *ESTOQUE BAIXO*\n\n`;
      if (!baixo.length) {
        reportMessage += `✅ Todos os produtos estão com estoque adequado!\n\n`;
      } else {
        reportMessage += `🔴 *${baixo.length}* produto(s) com estoque baixo:\n\n`;
        baixo.forEach(p => {
          reportMessage += `  • ${p.nome}: *${p.estoque || 0}* un (mín: ${p.estoque_minimo || 5})\n`;
        });
        reportMessage += `\n`;
      }
    }

    // ---------- RESUMO FINANCEIRO ----------
    if (reportType === "financeiro_resumo" || reportType === "relatorio_completo") {
      const { data: receber } = await supabase
        .from("transactions")
        .select("amount")
        .eq("tipo", "RECEBER")
        .eq("status", "PAGO")
        .gte("payment_date", todayStart)
        .lt("payment_date", todayEnd);

      const { data: pagar } = await supabase
        .from("transactions")
        .select("amount")
        .eq("tipo", "PAGAR")
        .eq("status", "PAGO")
        .gte("payment_date", todayStart)
        .lt("payment_date", todayEnd);

      const entradas = receber?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const saidas = pagar?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
      const saldo = entradas - saidas;

      reportMessage += `💰 *RESUMO FINANCEIRO DO DIA*\n\n`;
      reportMessage += `📈 Entradas: *R$ ${entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
      reportMessage += `📉 Saídas: *R$ ${saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n`;
      reportMessage += `${saldo >= 0 ? "✅" : "🔴"} Saldo: *R$ ${saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}*\n\n`;
    }

    // ---------- BARRIS EM CAMPO ----------
    if (reportType === "barris_campo" || reportType === "relatorio_completo") {
      const { data: barris } = await supabase
        .from("barris")
        .select("codigo, capacidade, localizacao, clientes(nome)")
        .eq("localizacao", "CLIENTE");

      reportMessage += `🍺 *BARRIS EM CAMPO*\n\n`;
      reportMessage += `Total com clientes: *${barris?.length || 0}* barris\n`;

      if (barris?.length) {
        const top5 = barris.slice(0, 5);
        top5.forEach(b => {
          const cliente = (b.clientes as any)?.nome || "S/N";
          reportMessage += `  • ${b.codigo} (${b.capacidade}L) → ${cliente}\n`;
        });
        if (barris.length > 5) reportMessage += `  _...e mais ${barris.length - 5} barris_\n`;
      }
      reportMessage += `\n`;
    }

    // ---------- BOLETOS A VENCER ----------
    if (reportType === "boletos_vencer" || reportType === "relatorio_completo") {
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const { data: boletos } = await supabase
        .from("boletos")
        .select("description, beneficiario, amount, due_date")
        .in("status", ["PENDENTE", "APROVADO"])
        .lte("due_date", in7days)
        .order("due_date");

      reportMessage += `📅 *BOLETOS A VENCER (7 DIAS)*\n\n`;
      if (!boletos?.length) {
        reportMessage += `✅ Nenhum boleto vencendo nos próximos 7 dias.\n\n`;
      } else {
        reportMessage += `⚠️ *${boletos.length}* boleto(s):\n\n`;
        boletos.forEach(b => {
          const desc = b.description || b.beneficiario || "S/D";
          const venc = new Date(b.due_date).toLocaleDateString("pt-BR");
          reportMessage += `  • ${desc} - R$ ${(b.amount || 0).toFixed(2)} (venc: ${venc})\n`;
        });
        reportMessage += `\n`;
      }
    }

    // Final footer
    reportMessage += `─────────────────\n`;
    reportMessage += `🤖 _Relatório automático • Taubaté Chopp_\n`;
    reportMessage += `🕐 _${now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}_`;

    // Send via Evolution API - ensure country code 55 (Brazil)
    let phone = schedule.recipient_phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) {
      phone = "55" + phone;
    }
    const remoteJid = `${phone}@s.whatsapp.net`;

    console.log(`[send-notification-report] Sending ${reportType} to ${phone} via ${instanceName}`);
    console.log(`[send-notification-report] Message length: ${reportMessage.length}`);

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "apikey": EVOLUTION_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: phone,
        text: reportMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send: ${errorText}`);
    }

    // Update last_sent_at
    await supabase
      .from("notification_schedules")
      .update({ last_sent_at: now.toISOString() })
      .eq("id", scheduleId);

    return new Response(
      JSON.stringify({ success: true, message: "Report sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-notification-report] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
