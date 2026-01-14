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

    const { agent_id, message, conversation_history = [], remote_jid, test_mode = false, pushName = null } = await req.json();

    console.log(`[ai-chat] Agent: ${agent_id}, Test mode: ${test_mode}, Message: ${message?.substring(0, 50)}, pushName: ${pushName}`);

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

    // If we have a remote_jid, try to find or create the client
    let clientInfo = null;
    let clientWasCreated = false;
    
    if (remote_jid && !test_mode) {
      const phoneNumber = remote_jid.split("@")[0];
      
      // Try to find existing client
      const { data: existingCliente } = await supabase
        .from("clientes")
        .select("*")
        .or(`telefone.ilike.%${phoneNumber}%,telefone.ilike.%${phoneNumber.slice(-8)}%`)
        .limit(1)
        .single();

      if (existingCliente) {
        clientInfo = existingCliente;
        
        // Update last interaction
        await supabase
          .from("clientes")
          .update({ 
            updated_at: new Date().toISOString(),
            ultimo_contato: new Date().toISOString()
          })
          .eq("id", existingCliente.id);
          
        console.log(`[ai-chat] Existing client found and updated: ${existingCliente.nome} (${existingCliente.id})`);
      } else {
        // CREATE NEW CLIENT automatically
        const clientName = pushName || `Lead WhatsApp ${phoneNumber.slice(-4)}`;
        
        const { data: newCliente, error: createError } = await supabase
          .from("clientes")
          .insert({
            nome: clientName,
            telefone: phoneNumber,
            email: `${phoneNumber}@whatsapp.lead`,
            origem: "whatsapp",
            status: "lead",
            data_cadastro: new Date().toISOString(),
            observacoes: `Lead criado automaticamente via WhatsApp em ${new Date().toLocaleString('pt-BR')}`
          })
          .select()
          .single();

        if (createError) {
          console.error("[ai-chat] Error creating client:", createError);
        } else {
          clientInfo = newCliente;
          clientWasCreated = true;
          console.log(`[ai-chat] NEW CLIENT CREATED: ${clientName} (${newCliente.id})`);
        }
      }
    } else if (remote_jid && test_mode) {
      // In test mode, just try to find client without creating
      const phoneNumber = remote_jid.split("@")[0];
      const { data: cliente } = await supabase
        .from("clientes")
        .select("*")
        .or(`telefone.ilike.%${phoneNumber}%,telefone.ilike.%${phoneNumber.slice(-8)}%`)
        .limit(1)
        .single();
      if (cliente) clientInfo = cliente;
    }

    // Add client info to context if found
    if (clientInfo) {
      contextData += `\n\n--- INFORMAÇÕES DO CLIENTE ---\n`;
      contextData += `Nome: ${clientInfo.nome}\n`;
      contextData += `Telefone: ${clientInfo.telefone}\n`;
      contextData += `Email: ${clientInfo.email || "Não informado"}\n`;
      contextData += `Status: ${clientInfo.status || "lead"}\n`;
      contextData += `Data de Cadastro: ${clientInfo.data_cadastro || "Não informada"}\n`;
      if (clientInfo.observacoes) {
        contextData += `Observações: ${clientInfo.observacoes}\n`;
      }

      // Fetch recent orders if available
      if (knowledgeTables.includes("pedidos")) {
        const { data: pedidos } = await supabase
          .from("pedidos")
          .select("numero_pedido, valor_total, status, data_pedido")
          .eq("cliente_id", clientInfo.id)
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
          .eq("cliente_id", clientInfo.id);

        if (barris && barris.length > 0) {
          contextData += `\n--- BARRIS COM O CLIENTE ---\n`;
          barris.forEach((b: any) => {
            contextData += `- ${b.codigo} (${b.capacidade}L) - ${b.status_conteudo} - ${b.localizacao}\n`;
          });
        }
      }
    }

    // ========== CRM LEAD MANAGEMENT ==========
    let crmLead = null;
    let userMessageCount = 0;
    
    if (clientInfo?.id && !test_mode) {
      // Check if CRM lead exists
      const { data: existingLead } = await supabase
        .from("leads")
        .select("*")
        .eq("cliente_id", clientInfo.id)
        .single();

      if (existingLead) {
        crmLead = existingLead;
        console.log(`[ai-chat] Existing CRM lead found: ${existingLead.id} - status: ${existingLead.status}`);
      } else {
        // CREATE NEW CRM LEAD in "novo_lead" stage
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            cliente_id: clientInfo.id,
            nome: clientInfo.nome,
            telefone: clientInfo.telefone,
            email: clientInfo.email,
            origem: "whatsapp",
            status: "novo_lead",
            valor_estimado: 0,
            observacoes: `Lead criado automaticamente pela Lara IA em ${new Date().toLocaleString('pt-BR')}`,
            data_criacao: new Date().toISOString(),
          })
          .select()
          .single();

        if (leadError) {
          console.error("[ai-chat] Error creating CRM lead:", leadError);
        } else {
          crmLead = newLead;
          console.log(`[ai-chat] NEW CRM LEAD CREATED: ${newLead.id} - status: novo_lead`);
        }
      }

      // Count user messages in conversation to track engagement
      const { data: existingConv } = await supabase
        .from("ai_conversations")
        .select("id")
        .eq("agent_id", agent_id)
        .eq("remote_jid", remote_jid)
        .eq("status", "active")
        .single();

      if (existingConv) {
        const { count } = await supabase
          .from("ai_messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", existingConv.id)
          .eq("role", "user");

        userMessageCount = (count || 0) + 1; // +1 for current message
        console.log(`[ai-chat] User message count: ${userMessageCount}`);
      } else {
        userMessageCount = 1; // First message
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
          // Separar Pilsen dos outros
          const pilsenChopps = chopps.filter((p: any) => p.nome.toLowerCase().includes('pilsen'));
          const outrosChopps = chopps.filter((p: any) => !p.nome.toLowerCase().includes('pilsen'));
          
          contextData += `\n===== REGRA DE VENDAS =====\n`;
          contextData += `PRIORIDADE: Sempre ofereça o CHOPP PILSEN primeiro!\n`;
          contextData += `Só mencione outros sabores SE o cliente perguntar especificamente.\n\n`;
          
          contextData += `CHOPP PRINCIPAL (oferecer primeiro):\n`;
          pilsenChopps.forEach((p: any) => {
            contextData += `- ${p.nome}: R$ ${p.preco?.toFixed(2)} por barril\n`;
          });
          
          contextData += `\nOUTROS CHOPPS (só se o cliente perguntar):\n`;
          outrosChopps.forEach((p: any) => {
            contextData += `- ${p.nome}: R$ ${p.preco?.toFixed(2)} por barril\n`;
          });
          
          contextData += `\nIMPORTANTE: Todo chopp está disponível, trabalhamos direto com a fábrica!\n`;
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

CÁLCULO DE BARRIS (30 Litros e 50 Litros apenas):
1. Calcule o total de litros necessários
2. Encontre a combinação de barris de 30 e 50 que seja IGUAL ou MAIOR
3. Priorize usar menos barris

EXEMPLOS DE CÁLCULO CORRETO:
- 30 litros → 1 barril de 30 Litros
- 50 litros → 1 barril de 50 Litros
- 60 litros → 1 de 50 Litros + 1 de 30 Litros = 80 litros
- 70 litros → 1 de 50 Litros + 1 de 30 Litros = 80 litros
- 80 litros → 1 de 50 Litros + 1 de 30 Litros = 80 litros
- 90 litros → 2 de 50 Litros = 100 litros
- 100 litros → 2 de 50 Litros = 100 litros
- 110 litros → 2 de 50 Litros + 1 de 30 Litros = 130 litros
- 130 litros → 2 de 50 Litros + 1 de 30 Litros = 130 litros
- 134 litros → 3 de 50 Litros = 150 litros (ou 2 de 50 + 2 de 30 = 160 litros)
- 150 litros → 3 de 50 Litros = 150 litros
- 160 litros → 3 de 50 Litros + 1 de 30 Litros = 180 litros

===== FORMATO DE ESCRITA =====
NUNCA escreva "50L" ou "30L". 
SEMPRE escreva "50 Litros" ou "30 Litros" por extenso.
Exemplos corretos: "barril de 50 Litros", "barril de 30 Litros"
Exemplos ERRADOS: "50L", "30L", "barril de 50L"

===== CÁLCULO DE VALOR - CRÍTICO =====
Quando calcular o valor do pedido, SOME O PREÇO DE TODOS OS BARRIS:

EXEMPLO CORRETO para 3 barris de 50 Litros + 1 barril de 30 Litros:
- Se 50 Litros = R$220 e 30 Litros = R$150
- Total = (3 x R$220) + (1 x R$150) = R$660 + R$150 = R$810

NUNCA esqueça de somar o valor de TODOS os barris do pedido!
Confira: multiplique a quantidade de cada tamanho pelo seu preço e some tudo.

===== COPOS - SÓ SE O CLIENTE PERGUNTAR =====
NÃO ofereça copos automaticamente!
NUNCA mencione copos a menos que o cliente pergunte ou peça.
Se o cliente perguntar sobre copos: "Temos pacote com 50 copos por R$10 o pacote"
Esse é o ÚNICO preço de copos - R$10 por pacote de 50 unidades.

===== REGRAS DE FORMATO - OBRIGATÓRIO =====
1. SEMPRE divida sua resposta em 2 a 4 mensagens separadas usando "|||"
2. NUNCA envie um bloco de texto grande - divida em partes
3. Cada mensagem deve ter no máximo 2-3 frases
4. NUNCA USE EMOJIS - proibido qualquer emoji
5. Seja conversacional, não apressada

COMO DIVIDIR MENSAGENS:
- Primeira mensagem: reação/comentário curto
- Segunda mensagem: informação principal
- Terceira mensagem: próxima pergunta ou complemento

EXEMPLO CORRETO (cálculo de chopp):
"Perfeito, 40 pessoas em um churrasco de 4 horas!"|||"Vamos precisar de uns 92 litros de chopp. Sugiro 2 barris de 50 Litros, que dá 100 litros no total."|||"O valor fica R$ 1.380,00. E qual seria a data do evento?"

EXEMPLO ERRADO (bloco único):
"Perfeito! Para 40 pessoas... (texto gigante com tudo junto)"

EXEMPLO CORRETO (saudação):
"Oi Victor, tudo bem?"|||"Vi que você quer fazer um evento. Me conta mais, quantas pessoas vão ser?"

SEMPRE USE ||| PARA SEPARAR - É OBRIGATÓRIO!

===== ESTILO DE CONVERSA - CRÍTICO =====
Você é uma VENDEDORA CONSULTIVA, não uma máquina de vendas.
Seu objetivo é ENTENDER o cliente e o que ele precisa antes de oferecer qualquer coisa.

FLUXO OBRIGATÓRIO DE QUALIFICAÇÃO (siga nessa ordem):

ETAPA 1 - ENTENDER O QUE O CLIENTE QUER:
- Cumprimente e pergunte: "Você tá procurando chopp pra algum evento?"
- ESPERE a confirmação do cliente
- Se sim, pergunte qual tipo de chopp ele prefere: "A gente trabalha com Pilsen, que é o mais pedido! Você curte Pilsen ou prefere outro estilo?"
- NUNCA assuma o produto sem o cliente confirmar

ETAPA 2 - ENTENDER O EVENTO:
- Pergunte que tipo de evento: "Que legal! Que tipo de evento vai ser?"
- Pergunte quantas pessoas: "E quantas pessoas você tá esperando?"
- Pergunte duração: "Vai ser o dia todo ou só algumas horas?"

ETAPA 3 - CALCULAR E OFERECER:
- Só DEPOIS de saber pessoas e duração, faça o cálculo
- Apresente a sugestão de barris e o valor total
- Pergunte se está ok: "Fica bom pra você?"

ETAPA 4 - FINALIZAR QUALIFICAÇÃO:
- Pergunte a data: "Qual seria a data do evento?"
- Pergunte o endereço: "E qual o endereço completo pra entrega?"
- Pergunte o nome completo

ETAPA 5 - TRANSFERIR:
- Assim que tiver NOME, DATA e ENDEREÇO, diga: "Perfeito! Vou anotar tudo e já passo pro Alexandre confirmar com você!"
- NUNCA continue a conversa após coletar todas as informações - passe para o Alexandre

NUNCA seja direta demais! Converse primeiro:
- ERRADO: "Quantas pessoas? Qual data? Qual endereço?"
- CERTO: "Que legal um churrasco! Vai ser em casa ou em algum espaço?"

PERGUNTAS DE QUALIFICAÇÃO NATURAIS:
- "Que tipo de evento vai ser?"
- "Que legal! Vai ser aonde, em casa ou em algum espaço?"
- "E quantas pessoas você tá esperando mais ou menos?"
- "Já tem uma data definida?"
- "Vai ser o dia todo ou só algumas horas?"

===== CONVERSA NATURAL - MUITO IMPORTANTE =====
NUNCA diga essas frases robóticas:
- "Boa noite" ou "Bom dia" mais de uma vez
- "Seja bem-vindo à..."
- "Eu sou a Lara, sua assistente virtual"
- "Posso ajudar com mais alguma coisa?"
- "Vou passar para o responsável"
- "Algo mais que posso fazer?"
- "Se precisar de mais informações..."
- "Como posso ajudar hoje?"

SEJA NATURAL como uma vendedora real conversando no WhatsApp:
- CUMPRIMENTE UMA VEZ SÓ, de forma simples: "Oi, Victor!"
- Vá direto ao ponto após o cumprimento
- Faça perguntas sobre o evento com curiosidade genuína
- Demonstre empolgação em texto: "Que legal!" "Show!" "Perfeito!"
- Conduza a conversa até ter: DATA, ENDEREÇO e CONFIRMAÇÃO
- Só mencione transferir quando o cliente pedir algo que você não pode resolver

===== INSTRUÇÕES DE CONTEÚDO =====
- Use as informações de ESTOQUE REAL para informar disponibilidade
- Se um produto está INDISPONÍVEL, informe e sugira alternativas
- Nunca ofereça produtos sem estoque
- SEMPRE mostre o cálculo: "X pessoas x Y litros = Z litros"
- SEMPRE mostre a soma dos barris: "3 de 50 Litros + 1 de 30 Litros = 180 litros"
- SEMPRE mostre o cálculo do valor: "(3 x R$220) + (1 x R$150) = R$810"`;
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

    // Split response into multiple messages by |||
    const responseMessages = rawResponse
      .split("|||")
      .map((msg: string) => msg.trim())
      .filter((msg: string) => msg.length > 0)
      .slice(0, 3); // Max 3 messages

    const assistantMessage = responseMessages.length > 0 ? responseMessages.join("\n\n") : rawResponse;

    console.log(`[ai-chat] Response received, tokens: ${tokensUsed}, messages: ${responseMessages.length}`);

    // Check if should transfer
    const transferKeywords = agent.transfer_keywords || [];
    const messageLower = message.toLowerCase();
    const shouldTransfer = transferKeywords.some((keyword: string) =>
      messageLower.includes(keyword.toLowerCase())
    );

    // Extract qualification data from conversation
    const fullConversation = [...conversation_history, { role: "user", content: message }];
    const allMessages = fullConversation.map((m: any) => m.content || "").join(" ").toLowerCase();
    
    // Calculate qualification score
    let qualificationScore = 0;
    const qualificationData: {
      evento: string | null;
      pessoas: string | null;
      data: string | null;
      endereco: string | null;
      nome: string | null;
      telefone: string | null;
      observacoes: string[];
    } = {
      evento: null,
      pessoas: null,
      data: null,
      endereco: null,
      nome: clientInfo?.nome || null,
      telefone: remote_jid ? remote_jid.split("@")[0] : null,
      observacoes: []
    };

    // Extract event type
    if (allMessages.includes("casamento")) {
      qualificationData.evento = "Casamento";
      qualificationScore += 20;
    } else if (allMessages.includes("aniversário") || allMessages.includes("aniversario")) {
      qualificationData.evento = "Aniversário";
      qualificationScore += 20;
    } else if (allMessages.includes("festa")) {
      qualificationData.evento = "Festa";
      qualificationScore += 20;
    } else if (allMessages.includes("churrasco")) {
      qualificationData.evento = "Churrasco";
      qualificationScore += 20;
    } else if (allMessages.includes("evento")) {
      qualificationData.evento = "Evento";
      qualificationScore += 15;
    }

    // Extract number of people
    const pessoasMatch = allMessages.match(/(\d+)\s*(?:pessoas|convidados|participantes)/);
    if (pessoasMatch) {
      qualificationData.pessoas = pessoasMatch[1];
      qualificationScore += 15;
    }

    // Check for date mentions
    if (allMessages.includes("sábado") || allMessages.includes("sabado") || 
        allMessages.includes("domingo") || allMessages.includes("amanhã") ||
        allMessages.match(/dia\s*\d+/)) {
      qualificationData.data = "Data mencionada na conversa";
      qualificationScore += 15;
    }

    // Check for address
    if (allMessages.includes("endereço") || allMessages.includes("endereco") ||
        allMessages.includes("rua") || allMessages.includes("bairro")) {
      qualificationData.endereco = "Endereço mencionado na conversa";
      qualificationScore += 15;
    }

    if (shouldTransfer) qualificationScore += 30;

    // ========== CRM PIPELINE STAGE MANAGEMENT ==========
    if (crmLead && !test_mode) {
      let newStatus = crmLead.status;
      let statusChanged = false;

    // Rule: More than 5 messages = move to "qualificado"
      if (userMessageCount > 5 && crmLead.status === "novo_lead") {
        newStatus = "qualificado";
        statusChanged = true;
        console.log(`[ai-chat] Moving lead to QUALIFICADO (${userMessageCount} messages)`);
      }

      // Rule: Transfer requested OR full qualification completed = move to "negociacao" IMMEDIATELY
      const isFullyQualified = qualificationData.pessoas && qualificationData.data && qualificationData.endereco;
      const shouldMoveToNegociacao = shouldTransfer || isFullyQualified;
      
      if (shouldMoveToNegociacao && crmLead.status !== "negociacao" && crmLead.status !== "fechado" && crmLead.status !== "perdido") {
        newStatus = "negociacao";
        statusChanged = true;
        console.log(`[ai-chat] Moving lead to NEGOCIACAO (transfer: ${shouldTransfer}, qualified: ${isFullyQualified})`);
      }

      if (statusChanged) {
        const { error: updateError } = await supabase
          .from("leads")
          .update({
            status: newStatus,
            ultima_atualizacao: new Date().toISOString(),
            valor_estimado: qualificationData.pessoas ? parseInt(qualificationData.pessoas) * 50 : crmLead.valor_estimado,
            observacoes: `${crmLead.observacoes || ''}\n[${new Date().toLocaleString('pt-BR')}] Status atualizado para ${newStatus}. Evento: ${qualificationData.evento || 'N/A'}, ${qualificationData.pessoas || 'N/A'} pessoas. Score: ${qualificationScore}%`,
          })
          .eq("id", crmLead.id);

        if (updateError) {
          console.error("[ai-chat] Error updating lead status:", updateError);
        } else {
          console.log(`[ai-chat] Lead ${crmLead.id} status updated to: ${newStatus}`);
        }
      }
    }

    // Send qualification to owner when transfer is triggered OR fully qualified (IMMEDIATELY)
    const isFullyQualifiedFinal = qualificationData.pessoas && qualificationData.data && qualificationData.endereco;
    const shouldNotifyOwner = (shouldTransfer || isFullyQualifiedFinal) && !test_mode && remote_jid;
    
    if (shouldNotifyOwner) {
      console.log(`[ai-chat] Transfer triggered - Notifying owner and sending full qualification sheet`);
      
      try {
        // Find the owner
        const { data: owner } = await supabase
          .from("profiles")
          .select("id, nome, telefone")
          .eq("is_owner", true)
          .limit(1)
          .single();

        if (owner?.telefone) {
          // Build COMPLETE qualification message
          const fichaQualificacao = `🔔 *TRANSFERÊNCIA SOLICITADA - LARA IA*

👤 *Cliente:* ${qualificationData.nome || "Não identificado"}
📱 *Telefone:* ${qualificationData.telefone || "Não identificado"}

📋 *DADOS COLETADOS:*
• Evento: ${qualificationData.evento || "Não informado"}
• Pessoas: ${qualificationData.pessoas || "Não informado"}
• Data: ${qualificationData.data || "Não informada"}
• Endereço: ${qualificationData.endereco || "Não informado"}

📊 *Score de Qualificação:* ${qualificationScore}%
📬 *Total de mensagens trocadas:* ${userMessageCount}

💬 *Resumo da Conversa:*
${fullConversation.slice(-8).map((m: any) => `${m.role === 'user' ? '👤' : '🤖'} ${m.content?.substring(0, 150)}`).join('\n')}

⚡ *Status:* Cliente solicitou atendimento humano - Lead movido para NEGOCIAÇÃO no CRM`;

          // Get instance from agent
          const instanceId = agent.instance_id;
          if (instanceId) {
            const { data: instance } = await supabase
              .from("whatsapp_instances")
              .select("instance_name")
              .eq("id", instanceId)
              .single();

            if (instance) {
              const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
              const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

              if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
                let ownerPhone = owner.telefone.replace(/\D/g, "");
                // Ensure phone has country code (55 for Brazil)
                if (!ownerPhone.startsWith("55") && ownerPhone.length <= 11) {
                  ownerPhone = "55" + ownerPhone;
                }
                const ownerJid = ownerPhone.includes("@") ? ownerPhone : `${ownerPhone}@s.whatsapp.net`;

                const sendResult = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instance.instance_name}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "apikey": EVOLUTION_API_KEY,
                  },
                  body: JSON.stringify({
                    number: ownerJid,
                    text: fichaQualificacao,
                  }),
                });

                console.log("[ai-chat] Qualification sent to owner:", ownerPhone, "Status:", sendResult.status);
              }
            }
          }
        } else {
          console.warn("[ai-chat] No owner found with is_owner=true or missing phone");
        }
      } catch (notifyError) {
        console.error("[ai-chat] Error during notification process:", notifyError);
      }
    }

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
            qualification_notes: JSON.stringify(qualificationData),
            transferred_at: shouldTransfer ? new Date().toISOString() : null,
            transferred_reason: shouldTransfer ? "Keyword de transferência detectada" : null,
            cliente_id: clientInfo?.id || null,
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
            qualification_notes: JSON.stringify(qualificationData),
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
        client_created: clientWasCreated,
        client_id: clientInfo?.id || null,
        crm_lead_id: crmLead?.id || null,
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
