import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Complete system knowledge base
const SYSTEM_KNOWLEDGE = `
# SISTEMA TAUBATÉ CHOPP - MANUAL COMPLETO

## VISÃO GERAL
Este é um sistema ERP completo para gestão de uma distribuidora de chopp, incluindo:
- Gestão de pedidos e vendas
- Controle de estoque e barris
- Gestão financeira completa
- CRM e gestão de leads
- Integração com WhatsApp
- Contabilidade e notas fiscais
- Agentes de IA para atendimento

---

## MÓDULO: DASHBOARD

### Como funciona
O Dashboard é a página inicial que exibe KPIs em tempo real:
- Receita do mês atual
- Número de pedidos
- Ticket médio
- Clientes ativos

### Como usar
1. Acesse pelo menu principal ou logo
2. Use os filtros de período no topo
3. Clique nos cards para detalhes
4. Acompanhe alertas na lateral

---

## MÓDULO: PEDIDOS

### Criar um novo pedido
1. Clique no botão "Novo Pedido" (canto superior direito)
2. Busque e selecione o cliente
3. Adicione produtos ao carrinho
4. Defina data de entrega
5. Escolha forma de pagamento
6. Confirme o pedido

### Alterar status do pedido
1. Abra o pedido clicando nele
2. Use os botões de status no topo
3. Status disponíveis: Pendente → Em Separação → Em Rota → Entregue

### Registrar devolução
1. Abra o pedido desejado
2. Clique em "Registrar Devolução"
3. Selecione os itens devolvidos
4. Informe a quantidade e motivo
5. Confirme - o estoque será atualizado automaticamente

### Enviar comprovante de entrega
1. No pedido "Entregue", clique em "Comprovante"
2. Defina data e período da entrega
3. Envie para o cliente assinar digitalmente

---

## MÓDULO: CLIENTES

### Cadastrar novo cliente
1. Clique em "Novo Cliente"
2. Preencha: Nome, Telefone, Email
3. Adicione endereço completo (CEP auto-completa)
4. Selecione a origem (WhatsApp, Indicação, etc)
5. Salve

### Importar clientes em massa
1. Clique em "Importar"
2. Baixe o modelo de planilha
3. Preencha com seus dados
4. Faça upload do arquivo
5. Confirme a importação

### Extrair leads do Google Maps
1. Clique em "Extrair Leads"
2. Digite a busca (ex: "bares em Taubaté")
3. Aguarde a extração
4. Revise e importe os contatos encontrados

---

## MÓDULO: FINANCEIRO

### Lançar transação manual
1. Clique em "Nova Transação"
2. Selecione: Receita ou Despesa
3. Preencha descrição e valor
4. Escolha a categoria
5. Defina vencimento e pagamento
6. Salve

### Processar boleto com OCR
1. Clique em "Novo Boleto"
2. Faça upload da foto/PDF
3. O sistema extrai automaticamente os dados
4. Revise: valor, vencimento, beneficiário
5. Aprove para criar a transação

### Importar fatura de cartão
1. Acesse a aba "Cartões"
2. Selecione o cartão
3. Clique em "Importar Fatura"
4. Faça upload do PDF/Excel da fatura
5. Confira os lançamentos e confirme

### Criar despesa recorrente
1. Acesse "Despesas Fixas"
2. Clique em "Nova Despesa Fixa"
3. Preencha: descrição, valor, categoria
4. Defina frequência (mensal, semanal, etc)
5. Escolha o dia do vencimento
6. Salve

---

## MÓDULO: CRM

### Gerenciar pipeline de leads
O CRM usa visualização Kanban com colunas:
- Novo Lead
- Em Contato
- Qualificado
- Proposta
- Negociação
- Convertido

### Mover lead entre etapas
1. Arraste o card do lead para a coluna desejada
2. Ou clique no lead e altere o status manualmente

### Adicionar nova oportunidade
1. Clique em "Nova Oportunidade"
2. Preencha nome, telefone, email
3. Defina valor estimado
4. Adicione observações
5. Salve

---

## MÓDULO: ESTOQUE

### Cadastrar produto
1. Clique em "Novo Produto"
2. Preencha: nome, SKU, categoria
3. Defina preço de venda e custo
4. Configure estoque inicial e mínimo
5. Para chopp: marque tipo e capacidade do barril
6. Salve

### Dar entrada de chopp
1. Clique em "Entrada de Chopp"
2. Selecione o produto (chopp)
3. Informe quantidade em litros
4. Adicione observações se necessário
5. Confirme

### Ajustar estoque manualmente
1. Clique no produto
2. Use "Editar"
3. Altere a quantidade em estoque
4. Salve - uma movimentação será registrada

---

## MÓDULO: BARRIS

### Cadastrar barril
1. Clique em "Novo Barril"
2. Informe o código identificador
3. Defina capacidade (30L, 50L)
4. Selecione localização inicial
5. Salve

### Registrar movimentação
1. Selecione o barril
2. Clique em "Movimentação"
3. Escolha o tipo (saída para cliente, retorno, etc)
4. Defina nova localização
5. Vincule a um cliente/pedido se aplicável
6. Confirme

### Vincular barris a pedido
1. No pedido, acesse aba "Barris"
2. Selecione os barris que serão enviados
3. Eles ficam vinculados ao pedido
4. No retorno, registre a devolução

---

## MÓDULO: WHATSAPP

### Conectar número do WhatsApp
1. Acesse "Instâncias"
2. Clique em "Nova Instância"
3. Nomeie a instância
4. Escaneie o QR Code com o celular
5. Aguarde conexão (ficará verde)

### Enviar mensagem individual
1. Acesse a aba "Chat"
2. Selecione ou busque o contato
3. Digite a mensagem
4. Envie

### Criar campanha de disparo
1. Acesse "Disparos"
2. Clique em "Nova Campanha"
3. Nomeie a campanha
4. Filtre os destinatários (por status, região, etc)
5. Escreva a mensagem
6. Adicione mídia se desejar
7. Agende ou envie imediatamente

### Ativar agente IA (Lara)
1. Acesse o módulo "Agente IA"
2. Verifique se existe um agente configurado
3. Ative o toggle "Ativo"
4. Vincule a uma instância do WhatsApp
5. A Lara começará a responder automaticamente

---

## MÓDULO: CONTABILIDADE

### Criar nota fiscal
1. Acesse "Documentos Fiscais"
2. Clique em "Nova Nota"
3. Selecione o tipo (NF-e, NFC-e, NFS-e)
4. Escolha direção (Entrada ou Saída)
5. Preencha dados do cliente/fornecedor
6. Adicione os itens
7. Revise impostos
8. Emita

### Importar nota de entrada
1. Clique em "Nova Nota"
2. Selecione direção "Entrada"
3. Cole o XML ou preencha manualmente
4. Vincule ao boleto/transação correspondente
5. Salve

### Ver pendências fiscais
1. Acesse a aba "Pendências"
2. Veja transações sem nota vinculada
3. Veja notas com divergência de valor
4. Resolva cada pendência individualmente

---

## MÓDULO: CONFIGURAÇÕES

### Criar novo usuário
1. Acesse "Gestão de Usuários"
2. Clique em "Novo Usuário"
3. Preencha email
4. Defina se é Admin (acesso total)
5. Ou selecione módulos específicos
6. Salve

### Alterar permissões
1. Na lista de usuários, clique no usuário
2. Ative/desative o toggle Admin
3. Ou selecione/deselecione módulos
4. Salve

---

## DICAS GERAIS

### Atalhos úteis
- Use a busca no topo para encontrar clientes/pedidos
- Clique no logo para voltar ao Dashboard
- Use o menu mobile na parte inferior (celular)

### Filtros
- Quase todas as listas têm filtros
- Use período, status, categoria para refinar
- Os filtros são salvos durante a sessão

### Alertas
- Vermelho: ação urgente necessária
- Amarelo: atenção recomendada
- Verde: tudo ok

### Mobile
- O sistema é totalmente responsivo
- Use o menu inferior no celular
- Tabelas têm scroll horizontal quando necessário
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { message, module_name, module_context, conversation_history = [] } = await req.json();

    console.log(`[system-assistant] Module: ${module_name}, Message: ${message?.substring(0, 100)}`);

    // Fetch real-time system stats for context
    let systemStats = "";
    try {
      const { count: pedidosCount } = await supabase
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .gte("data_pedido", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { count: clientesCount } = await supabase
        .from("clientes")
        .select("*", { count: "exact", head: true });

      const { count: produtosCount } = await supabase
        .from("produtos")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      const { count: barrisCount } = await supabase
        .from("barris")
        .select("*", { count: "exact", head: true });

      systemStats = `
--- ESTATÍSTICAS ATUAIS DO SISTEMA ---
- Pedidos nos últimos 30 dias: ${pedidosCount || 0}
- Total de clientes: ${clientesCount || 0}
- Produtos ativos: ${produtosCount || 0}
- Barris cadastrados: ${barrisCount || 0}
`;
    } catch (e) {
      console.error("[system-assistant] Error fetching stats:", e);
    }

    const systemPrompt = `Você é o Assistente do Sistema Taubaté Chopp, um especialista amigável que ajuda os usuários a navegar e usar todas as funcionalidades do sistema.

## SEU PAPEL
Você está no módulo "${module_name}" e deve ajudar o usuário com:
1. DÚVIDAS SOBRE O SISTEMA: Como usar funcionalidades, onde encontrar opções, como realizar tarefas
2. DÚVIDAS SOBRE O NEGÓCIO: Informações sobre produtos, processos da empresa
3. TROUBLESHOOTING: Ajudar a resolver problemas ou erros

## CONTEXTO DO MÓDULO ATUAL
${module_context}

## CONHECIMENTO COMPLETO DO SISTEMA
${SYSTEM_KNOWLEDGE}

${systemStats}

## REGRAS DE RESPOSTA

1. **Seja direto e prático** - Dê instruções passo a passo quando apropriado
2. **Use formatação** - Use **negrito** para destacar botões e ações, \`código\` para campos
3. **Seja amigável** - Use tom conversacional mas profissional
4. **Contextualize** - Considere que o usuário está no módulo ${module_name}
5. **Seja conciso** - Respostas de 2-4 parágrafos no máximo
6. **Ofereça ajuda adicional** - Pergunte se precisa de mais detalhes

## EXEMPLOS DE RESPOSTAS

Pergunta: "Como faço um pedido?"
Resposta: "Para criar um novo pedido, siga estes passos:

1. Clique no botão **Novo Pedido** no canto superior direito
2. Busque e selecione o cliente
3. Adicione os produtos desejados ao carrinho
4. Defina a **data de entrega** e **forma de pagamento**
5. Clique em **Confirmar Pedido**

Quer que eu explique alguma etapa com mais detalhes?"

Pergunta: "O que significa status pendente?"
Resposta: "O status **Pendente** indica que o pedido foi criado mas ainda não começou a ser processado. 

O fluxo completo é: **Pendente** → **Em Separação** → **Em Rota** → **Entregue**

Você pode alterar o status clicando no pedido e usando os botões no topo da tela."`;

    // Build messages for Lovable AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[system-assistant] Lovable AI error:", errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add funds.");
      }
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

    console.log(`[system-assistant] Response generated successfully`);

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[system-assistant] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
