import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { agent_id, message, conversation_history = [], remote_jid, test_mode = false } = await req.json();

    console.log(`[ai-chat] Agent: ${agent_id}, Test mode: ${test_mode}, Message: ${message?.substring(0, 50)}`);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      throw new Error("Agent not found: " + (agentError?.message || "Unknown"));
    }

    // Build context from knowledge tables
    let contextData = "";
    const knowledgeTables = agent.knowledge_tables || [];

    // If we have a remote_jid, try to find the client
    let clientInfo = null;
    if (remote_jid) {
      const phoneNumber = remote_jid.split("@")[0];
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .or(`telefone.ilike.%${phoneNumber}%,telefone.ilike.%${phoneNumber.slice(-8)}%`)
        .limit(1)
        .single();

      if (cliente) {
        clientInfo = cliente;
        contextData += `\n\n--- INFORMAÇÕES DO CLIENTE ---\n`;
        contextData += `Nome: ${cliente.nome}\n`;
        contextData += `Telefone: ${cliente.telefone}\n`;
        contextData += `Email: ${cliente.email || "Não informado"}\n`;
        contextData += `Status: ${cliente.status || "lead"}\n`;
        contextData += `Data de Cadastro: ${cliente.data_cadastro || "Não informada"}\n`;
        if (cliente.observacoes) {
          contextData += `Observações: ${cliente.observacoes}\n`;
        }

        // Fetch recent orders if available
        if (knowledgeTables.includes("pedidos")) {
          const { data: pedidos } = await supabase
            .from("pedidos")
            .select("numero_pedido, valor_total, status, data_pedido")
            .eq("cliente_id", cliente.id)
            .order("data_pedido", { ascending: false })
            .limit(5);

          if (pedidos && pedidos.length > 0) {
            contextData += `\n--- ÚLTIMOS PEDIDOS ---\n`;
            pedidos.forEach((p: any) => {
              contextData += `- Pedido #${p.numero_pedido}: R$ ${p.valor_total?.toFixed(2)} (${p.status}) em ${p.data_pedido}\n`;
            });
          } else {
            contextData += `\n--- ÚLTIMOS PEDIDOS ---\nNenhum pedido anterior encontrado.\n`;
          }
        }

        // Fetch barrels if available
        if (knowledgeTables.includes("barris")) {
          const { data: barris } = await supabase
            .from("barris")
            .select("codigo, capacidade, status_conteudo, localizacao")
            .eq("cliente_id", cliente.id);

          if (barris && barris.length > 0) {
            contextData += `\n--- BARRIS COM O CLIENTE ---\n`;
            barris.forEach((b: any) => {
              contextData += `- ${b.codigo} (${b.capacidade}L) - ${b.status_conteudo} - ${b.localizacao}\n`;
            });
          }
        }
      }
    }

    // Fetch products with REAL stock from system
    if (knowledgeTables.includes("produtos")) {
      const { data: produtos } = await supabase
        .from("produtos")
        .select("nome, preco, categoria, tipo_produto, estoque, estoque_litros, estoque_minimo")
        .eq("ativo", true)
        .order("nome");

      if (produtos && produtos.length > 0) {
        contextData += `\n--- ESTOQUE REAL DO SISTEMA ---\n`;
        const chopps = produtos.filter((p: any) => p.tipo_produto === "CHOPP");
        const outros = produtos.filter((p: any) => p.tipo_produto !== "CHOPP");
        
      if (chopps.length > 0) {
          contextData += `\nCHOPPS DISPONÍVEIS:\n`;
          chopps.forEach((p: any) => {
            const estoque = p.estoque_litros || p.estoque || 0;
            const disponivel = estoque > 0;
            const status = disponivel ? `✓ DISPONÍVEL (${estoque} LITROS em estoque)` : `✗ SEM ESTOQUE (disponível sob encomenda)`;
            contextData += `- ${p.nome}: R$ ${p.preco?.toFixed(2)} por barril - ${status}\n`;
          });
          contextData += `\nIMPORTANTE: Todo chopp pode ser solicitado, pois trabalhamos com a fábrica. Informe o cliente que está disponível!\n`;
        }
        
        if (outros.length > 0) {
          contextData += `\nOUTROS PRODUTOS:\n`;
          outros.forEach((p: any) => {
            const estoque = p.estoque || 0;
            const disponivel = estoque > 0;
            const status = disponivel ? `✓ DISPONÍVEL (${estoque} unid)` : `✗ INDISPONÍVEL`;
            contextData += `- ${p.nome}: R$ ${p.preco?.toFixed(2)} - ${status}\n`;
          });
        }
      }
    }

    // Get current date info for the AI
    const now = new Date();
    const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    const diaAtual = now.getDate();
    const mesAtual = meses[now.getMonth()];
    const anoAtual = now.getFullYear();
    const diaSemanaAtual = diasSemana[now.getDay()];
    
    // Calculate next Saturday and Sunday
    const diasAteProximoSabado = (6 - now.getDay() + 7) % 7 || 7;
    const proximoSabado = new Date(now);
    proximoSabado.setDate(now.getDate() + diasAteProximoSabado);
    const proximoDomingo = new Date(proximoSabado);
    proximoDomingo.setDate(proximoSabado.getDate() + 1);
    
    // Calculate tomorrow
    const amanha = new Date(now);
    amanha.setDate(now.getDate() + 1);

    const dateContext = `
===== DATA E HORA ATUAL =====
- Hoje é ${diaSemanaAtual}, dia ${diaAtual} de ${mesAtual} de ${anoAtual}
- Amanhã será ${diasSemana[amanha.getDay()]}, dia ${amanha.getDate()} de ${meses[amanha.getMonth()]}
- Próximo sábado: dia ${proximoSabado.getDate()} de ${meses[proximoSabado.getMonth()]}
- Próximo domingo: dia ${proximoDomingo.getDate()} de ${meses[proximoDomingo.getMonth()]}

USE ESTAS DATAS quando o cliente mencionar "amanhã", "fim de semana", "próximo sábado", etc.`;

    // Build messages array for OpenAI with multi-message instruction
    const systemPrompt = `${agent.system_prompt}

${dateContext}
${contextData ? `\n\nCONTEXTO DO BANCO DE DADOS:\n${contextData}` : ""}

===== REGRAS DE CÁLCULO - SIGA EXATAMENTE =====

CÁLCULO DE LITROS:
- Evento curto (até 3h): 1 litro por pessoa
- Evento longo (4-5h): 2.3 litros por pessoa
- Fórmula: PESSOAS x LITROS_POR_PESSOA = TOTAL_LITROS

CÁLCULO DE BARRIS (30L e 50L apenas):
1. Calcule o total de litros necessários
2. Encontre a combinação de barris de 30 e 50 que seja IGUAL ou MAIOR
3. Priorize usar menos barris

EXEMPLOS DE CÁLCULO CORRETO:
- 30 litros → 1 barril de 30L
- 50 litros → 1 barril de 50L
- 60 litros → 1 de 50L + 1 de 30L = 80L
- 70 litros → 1 de 50L + 1 de 30L = 80L
- 80 litros → 1 de 50L + 1 de 30L = 80L
- 90 litros → 2 de 50L = 100L
- 100 litros → 2 de 50L = 100L
- 110 litros → 2 de 50L + 1 de 30L = 130L
- 130 litros → 2 de 50L + 1 de 30L = 130L
- 134 litros → 3 de 50L = 150L (ou 2 de 50L + 2 de 30L = 160L)
- 150 litros → 3 de 50L = 150L
- 160 litros → 3 de 50L + 1 de 30L = 180L

CÁLCULO DE COPOS:
- Sugerir 1 a 2 copos por pessoa no MÁXIMO
- Copos vêm em pacotes de 10 unidades
- Exemplo: 50 pessoas = 5 a 10 pacotes (50 a 100 copos)

===== REGRAS DE FORMATO =====
1. CADA MENSAGEM DEVE TER NO MÁXIMO 15 PALAVRAS
2. Use "|||" para separar CADA mensagem curta
3. Envie de 1 a 3 mensagens separadas por conversa
4. NUNCA escreva parágrafos longos
5. Seja direta e objetiva

EXEMPLOS CORRETOS DE FORMATO:
- "Oi, tudo bem?"
- "Oi, tudo sim!"|||"Tem algum evento chegando?"

===== INSTRUÇÕES DE CONTEÚDO =====
- Use as informações de ESTOQUE REAL para informar disponibilidade
- Se um produto está INDISPONÍVEL, informe e sugira alternativas
- Nunca ofereça produtos sem estoque
- SEMPRE mostre o cálculo: "X pessoas x Y litros = Z litros"
- SEMPRE mostre a soma dos barris: "1 de 50L + 1 de 30L = 80 litros"`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    console.log(`[ai-chat] Sending to OpenAI with ${messages.length} messages`);

    // Call OpenAI
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: agent.model || "gpt-4o-mini",
        messages,
        temperature: agent.temperature || 0.7,
        max_tokens: agent.max_tokens || 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("[ai-chat] OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const rawResponse = openaiData.choices[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Split response into multiple messages
    const responseMessages = rawResponse
      .split("|||")
      .map((msg: string) => msg.trim())
      .filter((msg: string) => msg.length > 0)
      .slice(0, 4); // Max 4 messages

    const assistantMessage = responseMessages.length > 0 ? responseMessages.join("\n\n") : rawResponse;

    console.log(`[ai-chat] Response received, tokens: ${tokensUsed}, messages: ${responseMessages.length}`);

    // Check if should transfer
    const transferKeywords = agent.transfer_keywords || [];
    const messageLower = message.toLowerCase();
    const shouldTransfer = transferKeywords.some((keyword: string) =>
      messageLower.includes(keyword.toLowerCase())
    );

    // Calculate qualification score based on conversation
    let qualificationScore = 0;
    const fullConversation = [...conversation_history, { role: "user", content: message }];
    
    // Simple scoring logic
    if (fullConversation.some((m: any) => m.content?.toLowerCase().includes("evento"))) qualificationScore += 20;
    if (fullConversation.some((m: any) => m.content?.toLowerCase().includes("festa"))) qualificationScore += 20;
    if (fullConversation.some((m: any) => m.content?.toLowerCase().includes("pessoas"))) qualificationScore += 15;
    if (fullConversation.some((m: any) => m.content?.toLowerCase().includes("endereço"))) qualificationScore += 15;
    if (fullConversation.some((m: any) => m.content?.toLowerCase().includes("data"))) qualificationScore += 15;
    if (shouldTransfer) qualificationScore += 30;

    // If not in test mode, save the conversation
    if (!test_mode && remote_jid) {
      // Find or create conversation
      let conversationId: string;
      const { data: existingConv } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("agent_id", agent_id)
        .eq("remote_jid", remote_jid)
        .eq("status", "active")
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
        
        // Update qualification
        await supabase
          .from("ai_conversations")
          .update({
            qualification_score: qualificationScore,
            qualification_status: shouldTransfer ? "qualified" : "pending",
            transferred_at: shouldTransfer ? new Date().toISOString() : null,
            transferred_reason: shouldTransfer ? "Keyword de transferência detectada" : null,
          })
          .eq("id", conversationId);
      } else {
        const { data: newConv, error: convError } = await supabase
          .from("ai_conversations")
          .insert({
            agent_id,
            remote_jid,
            cliente_id: clientInfo?.id || null,
            status: "active",
            qualification_status: "pending",
            qualification_score: qualificationScore,
          })
          .select("id")
          .single();

        if (convError) {
          console.error("[ai-chat] Error creating conversation:", convError);
        } else {
          conversationId = newConv.id;
        }
      }

      // Save messages
      if (conversationId!) {
        await supabase.from("ai_messages").insert([
          { conversation_id: conversationId, role: "user", content: message, tokens_used: 0 },
          { conversation_id: conversationId, role: "assistant", content: assistantMessage, tokens_used: tokensUsed },
        ]);
      }
    }

    return new Response(
      JSON.stringify({
        response: assistantMessage,
        messages: responseMessages, // Array of individual messages to send separately
        should_transfer: shouldTransfer,
        qualification_score: qualificationScore,
        tokens_used: tokensUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ai-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
