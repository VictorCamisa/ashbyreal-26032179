import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- MODULE TOOLS DEFINITIONS ---

const PEDIDOS_TOOLS = [
  {
    type: "function",
    function: {
      name: "criar_pedido",
      description: "Cria um novo pedido para um cliente. Use quando o usuário pedir para criar/registrar um pedido ou venda.",
      parameters: {
        type: "object",
        properties: {
          cliente_nome: { type: "string", description: "Nome do cliente (busca parcial)" },
          produtos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome_produto: { type: "string", description: "Nome do produto" },
                quantidade: { type: "number", description: "Quantidade" },
              },
              required: ["nome_produto", "quantidade"],
            },
            description: "Lista de produtos e quantidades",
          },
          data_entrega: { type: "string", description: "Data de entrega (YYYY-MM-DD). Se não informado, usa amanhã." },
          observacoes: { type: "string", description: "Observações do pedido" },
        },
        required: ["cliente_nome", "produtos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "alterar_status_pedido",
      description: "Altera o status de um pedido existente. Use quando o usuário pedir para mudar status, marcar como entregue, cancelar, etc.",
      parameters: {
        type: "object",
        properties: {
          pedido_identificador: { type: "string", description: "ID parcial ou número do pedido" },
          novo_status: { type: "string", enum: ["pendente", "em_separacao", "em_rota", "entregue", "cancelado"], description: "Novo status" },
        },
        required: ["pedido_identificador", "novo_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description: "Lista pedidos com filtros. Use quando o usuário perguntar sobre pedidos do dia, pendentes, de um cliente, etc.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pendente", "em_separacao", "em_rota", "entregue", "cancelado"], description: "Filtrar por status" },
          cliente_nome: { type: "string", description: "Filtrar por nome do cliente" },
          periodo: { type: "string", enum: ["hoje", "semana", "mes"], description: "Período. Default: hoje" },
          limite: { type: "number", description: "Máximo de resultados. Default: 10" },
        },
      },
    },
  },
];

const CRM_TOOLS = [
  {
    type: "function",
    function: {
      name: "criar_oportunidade",
      description: "Cria uma nova oportunidade/lead no CRM. Use quando o usuário pedir para registrar lead, oportunidade ou contato de venda.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do contato/empresa" },
          telefone: { type: "string", description: "Telefone" },
          email: { type: "string", description: "Email" },
          valor_estimado: { type: "number", description: "Valor estimado do negócio" },
          observacoes: { type: "string", description: "Notas sobre a oportunidade" },
        },
        required: ["nome"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mover_lead",
      description: "Move um lead para outra etapa do funil. Use quando o usuário pedir para qualificar, avançar ou mover um lead.",
      parameters: {
        type: "object",
        properties: {
          lead_nome: { type: "string", description: "Nome do lead para buscar" },
          nova_etapa: { type: "string", enum: ["novo_lead", "em_contato", "qualificado", "proposta", "negociacao", "convertido", "perdido"], description: "Nova etapa do funil" },
        },
        required: ["lead_nome", "nova_etapa"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_leads",
      description: "Lista leads/oportunidades do CRM com filtros.",
      parameters: {
        type: "object",
        properties: {
          etapa: { type: "string", enum: ["novo_lead", "em_contato", "qualificado", "proposta", "negociacao", "convertido", "perdido"] },
          limite: { type: "number", description: "Máximo de resultados. Default: 10" },
        },
      },
    },
  },
];

const FINANCEIRO_TOOLS = [
  {
    type: "function",
    function: {
      name: "criar_transacao",
      description: "Cria uma nova transação financeira (receita ou despesa). Use quando o usuário pedir para lançar receita, despesa, pagamento, etc.",
      parameters: {
        type: "object",
        properties: {
          descricao: { type: "string", description: "Descrição da transação" },
          valor: { type: "number", description: "Valor em reais" },
          tipo: { type: "string", enum: ["RECEBER", "PAGAR"], description: "RECEBER = receita, PAGAR = despesa" },
          vencimento: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
          categoria_nome: { type: "string", description: "Nome da categoria (ex: Aluguel, Vendas, etc)" },
          status: { type: "string", enum: ["PREVISTO", "PAGO"], description: "Status. Default: PREVISTO" },
        },
        required: ["descricao", "valor", "tipo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resumo_financeiro",
      description: "Retorna resumo financeiro do período (receitas, despesas, saldo). Use quando o usuário perguntar sobre balanço, quanto entrou/saiu, situação financeira.",
      parameters: {
        type: "object",
        properties: {
          periodo: { type: "string", enum: ["semana", "mes", "trimestre"], description: "Período. Default: mes" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_contas_vencer",
      description: "Lista contas a pagar/receber próximas do vencimento. Use quando o usuário perguntar o que tem pra pagar, o que vence essa semana, etc.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["RECEBER", "PAGAR"], description: "Filtrar por tipo" },
          dias: { type: "number", description: "Próximos N dias. Default: 7" },
        },
      },
    },
  },
];

const CONTABILIDADE_TOOLS = [
  {
    type: "function",
    function: {
      name: "listar_pendencias",
      description: "Lista pendências fiscais (transações sem nota, divergências). Use quando o usuário perguntar sobre pendências, problemas fiscais, etc.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["sem_nota", "divergencia", "todas"], description: "Tipo de pendência. Default: todas" },
          status: { type: "string", enum: ["pendente", "resolvido"], description: "Default: pendente" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_documentos_fiscais",
      description: "Lista documentos fiscais (NF-e, NFC-e, NFS-e). Use quando o usuário perguntar sobre notas emitidas, documentos fiscais, etc.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["NFE", "NFCE", "NFSE"] },
          periodo: { type: "string", enum: ["semana", "mes", "trimestre"], description: "Default: mes" },
          limite: { type: "number", description: "Default: 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolver_pendencia",
      description: "Marca uma pendência fiscal como resolvida. Use quando o usuário pedir para resolver, fechar ou ignorar uma pendência.",
      parameters: {
        type: "object",
        properties: {
          pendencia_id: { type: "string", description: "ID da pendência" },
          notas: { type: "string", description: "Notas de resolução" },
        },
        required: ["pendencia_id"],
      },
    },
  },
];

function getToolsForModule(moduleName: string) {
  switch (moduleName) {
    case "Pedidos": return PEDIDOS_TOOLS;
    case "CRM": return CRM_TOOLS;
    case "Financeiro": return FINANCEIRO_TOOLS;
    case "Contabilidade": return CONTABILIDADE_TOOLS;
    default: return [];
  }
}

// --- TOOL EXECUTION ---

async function executeTool(supabase: any, toolName: string, args: any): Promise<string> {
  try {
    switch (toolName) {
      // --- PEDIDOS ---
      case "criar_pedido": {
        // Find client
        const { data: clientes } = await supabase
          .from("clientes")
          .select("id, nome")
          .ilike("nome", `%${args.cliente_nome}%`)
          .limit(1);

        if (!clientes?.length) return JSON.stringify({ error: true, message: `Cliente "${args.cliente_nome}" não encontrado. Verifique o nome.` });
        const cliente = clientes[0];

        // Find products
        const itens = [];
        for (const p of args.produtos) {
          const { data: produtos } = await supabase
            .from("produtos")
            .select("id, nome, preco_venda")
            .ilike("nome", `%${p.nome_produto}%`)
            .eq("ativo", true)
            .limit(1);

          if (!produtos?.length) return JSON.stringify({ error: true, message: `Produto "${p.nome_produto}" não encontrado.` });
          itens.push({ produto: produtos[0], quantidade: p.quantidade });
        }

        const valorTotal = itens.reduce((s, i) => s + (i.produto.preco_venda * i.quantidade), 0);
        const dataEntrega = args.data_entrega || new Date(Date.now() + 86400000).toISOString().split("T")[0];

        // Create order
        const { data: pedido, error: pedidoErr } = await supabase
          .from("pedidos")
          .insert({
            cliente_id: cliente.id,
            valor_total: valorTotal,
            status: "pendente",
            data_pedido: new Date().toISOString(),
            data_entrega: dataEntrega,
            observacoes: args.observacoes || null,
          })
          .select("id")
          .single();

        if (pedidoErr) {
          console.error("[criar_pedido] Insert error:", JSON.stringify(pedidoErr));
          throw pedidoErr;
        }

        // Create items
        for (const item of itens) {
          const { error: itemErr } = await supabase.from("pedido_itens").insert({
            pedido_id: pedido.id,
            produto_id: item.produto.id,
            quantidade: item.quantidade,
            preco_unitario: item.produto.preco_venda,
            subtotal: item.produto.preco_venda * item.quantidade,
          });
          if (itemErr) {
            console.error("[criar_pedido] Item insert error:", JSON.stringify(itemErr));
          }
        }

        return JSON.stringify({
          success: true,
          message: `Pedido criado com sucesso!`,
          pedido_id: pedido.id.slice(0, 8),
          cliente: cliente.nome,
          valor_total: valorTotal,
          itens: itens.map(i => `${i.quantidade}x ${i.produto.nome}`),
          entrega: dataEntrega,
        });
      }

      case "alterar_status_pedido": {
        const { data: pedidos } = await supabase
          .from("pedidos")
          .select("id, cliente_id, status, clientes(nome)")
          .or(`id.ilike.%${args.pedido_identificador}%`)
          .limit(1);

        if (!pedidos?.length) return JSON.stringify({ error: true, message: `Pedido "${args.pedido_identificador}" não encontrado.` });

        const { error } = await supabase
          .from("pedidos")
          .update({ status: args.novo_status })
          .eq("id", pedidos[0].id);

        if (error) throw error;

        const clienteNome = (pedidos[0] as any).clientes?.nome || "Cliente";
        return JSON.stringify({
          success: true,
          message: `Status do pedido #${pedidos[0].id.slice(0, 8)} (${clienteNome}) alterado de "${pedidos[0].status}" para "${args.novo_status}".`,
        });
      }

      case "listar_pedidos": {
        let query = supabase
          .from("pedidos")
          .select("id, nome_cliente, valor_total, status, data_pedido, data_entrega")
          .order("data_pedido", { ascending: false })
          .limit(args.limite || 10);

        if (args.status) query = query.eq("status", args.status);
        if (args.cliente_nome) query = query.ilike("nome_cliente", `%${args.cliente_nome}%`);

        const now = new Date();
        if (args.periodo === "hoje" || !args.periodo) {
          query = query.gte("data_pedido", now.toISOString().split("T")[0]);
        } else if (args.periodo === "semana") {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          query = query.gte("data_pedido", weekAgo.toISOString());
        } else if (args.periodo === "mes") {
          const monthAgo = new Date(now.getTime() - 30 * 86400000);
          query = query.gte("data_pedido", monthAgo.toISOString());
        }

        const { data: pedidos, error } = await query;
        if (error) throw error;

        return JSON.stringify({
          total: pedidos?.length || 0,
          pedidos: (pedidos || []).map((p: any) => ({
            id: p.id.slice(0, 8),
            cliente: p.nome_cliente,
            valor: `R$ ${Number(p.valor_total).toFixed(2)}`,
            status: p.status,
            data: p.data_pedido?.split("T")[0],
            entrega: p.data_entrega,
          })),
        });
      }

      // --- CRM ---
      case "criar_oportunidade": {
        const { data, error } = await supabase
          .from("clientes")
          .insert({
            nome: args.nome,
            telefone: args.telefone || "",
            email: args.email || "",
            origem: "crm",
            status: "lead",
            observacoes: args.observacoes || (args.valor_estimado ? `Valor estimado: R$ ${args.valor_estimado}` : null),
          })
          .select("id, nome")
          .single();

        if (error) throw error;

        return JSON.stringify({
          success: true,
          message: `Lead "${args.nome}" criado com sucesso no CRM!`,
          id: data.id.slice(0, 8),
          valor_estimado: args.valor_estimado ? `R$ ${args.valor_estimado}` : "Não definido",
        });
      }

      case "mover_lead": {
        const statusMap: Record<string, string> = {
          novo_lead: "lead",
          em_contato: "em_contato",
          qualificado: "qualificado",
          proposta: "proposta",
          negociacao: "negociacao",
          convertido: "ativo",
          perdido: "inativo",
        };

        const { data: leads } = await supabase
          .from("clientes")
          .select("id, nome, status")
          .ilike("nome", `%${args.lead_nome}%`)
          .limit(1);

        if (!leads?.length) return JSON.stringify({ error: true, message: `Lead "${args.lead_nome}" não encontrado.` });

        const novoStatus = statusMap[args.nova_etapa] || args.nova_etapa;
        const { error } = await supabase
          .from("clientes")
          .update({ status: novoStatus })
          .eq("id", leads[0].id);

        if (error) throw error;

        return JSON.stringify({
          success: true,
          message: `Lead "${leads[0].nome}" movido para "${args.nova_etapa}".`,
          status_anterior: leads[0].status,
        });
      }

      case "listar_leads": {
        let query = supabase
          .from("clientes")
          .select("id, nome, telefone, email, status, created_at")
          .in("status", ["lead", "em_contato", "qualificado", "proposta", "negociacao"])
          .order("created_at", { ascending: false })
          .limit(args.limite || 10);

        if (args.etapa) {
          const statusMap: Record<string, string> = {
            novo_lead: "lead", em_contato: "em_contato", qualificado: "qualificado",
            proposta: "proposta", negociacao: "negociacao",
          };
          query = query.eq("status", statusMap[args.etapa] || args.etapa);
        }

        const { data, error } = await query;
        if (error) throw error;

        return JSON.stringify({
          total: data?.length || 0,
          leads: (data || []).map((l: any) => ({
            id: l.id.slice(0, 8),
            nome: l.nome,
            telefone: l.telefone,
            status: l.status,
            desde: l.created_at?.split("T")[0],
          })),
        });
      }

      // --- FINANCEIRO ---
      case "criar_transacao": {
        let categoryId = null;
        if (args.categoria_nome) {
          const { data: cats } = await supabase
            .from("categories")
            .select("id")
            .ilike("name", `%${args.categoria_nome}%`)
            .limit(1);
          categoryId = cats?.[0]?.id || null;
        }

        const { data: entityData } = await supabase
          .from("entities")
          .select("id")
          .eq("name", "LOJA")
          .single();

        const { data, error } = await supabase
          .from("transactions")
          .insert({
            description: args.descricao,
            amount: args.valor,
            tipo: args.tipo,
            status: args.status || "PREVISTO",
            due_date: args.vencimento || new Date().toISOString().split("T")[0],
            category_id: categoryId,
            entity_id: entityData?.id,
            origin: "MANUAL",
          })
          .select("id")
          .single();

        if (error) throw error;

        return JSON.stringify({
          success: true,
          message: `Transação criada: ${args.tipo === "RECEBER" ? "📈 Receita" : "📉 Despesa"} de R$ ${args.valor.toFixed(2)} - "${args.descricao}"`,
          id: data.id.slice(0, 8),
        });
      }

      case "resumo_financeiro": {
        const now = new Date();
        let startDate: string;
        if (args.periodo === "semana") {
          startDate = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        } else if (args.periodo === "trimestre") {
          startDate = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        }

        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, tipo, status")
          .gte("due_date", startDate)
          .neq("status", "CANCELADO");

        const receitas = (transactions || []).filter((t: any) => t.tipo === "RECEBER").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const despesas = (transactions || []).filter((t: any) => t.tipo === "PAGAR").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const receitasPagas = (transactions || []).filter((t: any) => t.tipo === "RECEBER" && t.status === "PAGO").reduce((s: number, t: any) => s + Number(t.amount), 0);
        const despesasPagas = (transactions || []).filter((t: any) => t.tipo === "PAGAR" && t.status === "PAGO").reduce((s: number, t: any) => s + Number(t.amount), 0);

        return JSON.stringify({
          periodo: args.periodo || "mes",
          receitas_previstas: `R$ ${receitas.toFixed(2)}`,
          receitas_realizadas: `R$ ${receitasPagas.toFixed(2)}`,
          despesas_previstas: `R$ ${despesas.toFixed(2)}`,
          despesas_pagas: `R$ ${despesasPagas.toFixed(2)}`,
          saldo_previsto: `R$ ${(receitas - despesas).toFixed(2)}`,
          saldo_realizado: `R$ ${(receitasPagas - despesasPagas).toFixed(2)}`,
          total_transacoes: transactions?.length || 0,
        });
      }

      case "listar_contas_vencer": {
        const dias = args.dias || 7;
        const endDate = new Date(Date.now() + dias * 86400000).toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];

        let query = supabase
          .from("transactions")
          .select("id, description, amount, tipo, due_date, status")
          .eq("status", "PREVISTO")
          .gte("due_date", today)
          .lte("due_date", endDate)
          .order("due_date", { ascending: true })
          .limit(20);

        if (args.tipo) query = query.eq("tipo", args.tipo);

        const { data, error } = await query;
        if (error) throw error;

        return JSON.stringify({
          periodo: `Próximos ${dias} dias`,
          total: data?.length || 0,
          contas: (data || []).map((t: any) => ({
            id: t.id.slice(0, 8),
            descricao: t.description,
            valor: `R$ ${Number(t.amount).toFixed(2)}`,
            tipo: t.tipo === "RECEBER" ? "A Receber" : "A Pagar",
            vencimento: t.due_date,
          })),
        });
      }

      // --- CONTABILIDADE ---
      case "listar_pendencias": {
        let query = supabase
          .from("contabilidade_alertas")
          .select("id, titulo, descricao, tipo, prioridade, status, created_at")
          .order("created_at", { ascending: false })
          .limit(15);

        if (args.status === "resolvido") {
          query = query.eq("status", "resolvido");
        } else if (args.status !== "todas") {
          query = query.eq("status", "pendente");
        }

        if (args.tipo === "sem_nota") {
          query = query.in("tipo", ["saida_sem_nota", "entrada_sem_nota"]);
        } else if (args.tipo === "divergencia") {
          query = query.eq("tipo", "divergencia_valor");
        }

        const { data, error } = await query;
        if (error) throw error;

        return JSON.stringify({
          total: data?.length || 0,
          pendencias: (data || []).map((p: any) => ({
            id: p.id.slice(0, 8),
            id_completo: p.id,
            titulo: p.titulo,
            tipo: p.tipo,
            prioridade: p.prioridade,
            status: p.status,
            data: p.created_at?.split("T")[0],
          })),
        });
      }

      case "listar_documentos_fiscais": {
        const now = new Date();
        let startDate: string;
        if (args.periodo === "semana") {
          startDate = new Date(now.getTime() - 7 * 86400000).toISOString().split("T")[0];
        } else if (args.periodo === "trimestre") {
          startDate = new Date(now.getTime() - 90 * 86400000).toISOString().split("T")[0];
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        }

        let query = supabase
          .from("documentos_fiscais")
          .select("id, numero, tipo, direcao, valor_total, status, data_emissao, razao_social")
          .gte("data_emissao", startDate)
          .order("data_emissao", { ascending: false })
          .limit(args.limite || 10);

        if (args.tipo) query = query.eq("tipo", args.tipo);

        const { data, error } = await query;
        if (error) throw error;

        return JSON.stringify({
          total: data?.length || 0,
          documentos: (data || []).map((d: any) => ({
            numero: d.numero,
            tipo: d.tipo,
            direcao: d.direcao,
            valor: `R$ ${Number(d.valor_total).toFixed(2)}`,
            status: d.status,
            data: d.data_emissao,
            destinatario: d.razao_social,
          })),
        });
      }

      case "resolver_pendencia": {
        const { error } = await supabase
          .from("contabilidade_alertas")
          .update({
            status: "resolvido",
            resolvido_em: new Date().toISOString(),
            resolucao_notas: args.notas || "Resolvido via assistente IA",
          })
          .eq("id", args.pendencia_id);

        if (error) throw error;

        return JSON.stringify({
          success: true,
          message: `Pendência resolvida com sucesso.`,
        });
      }

      default:
        return JSON.stringify({ error: true, message: `Ação "${toolName}" não reconhecida.` });
    }
  } catch (err: any) {
    console.error(`[tool:${toolName}] Error:`, err);
    return JSON.stringify({ error: true, message: `Erro ao executar "${toolName}": ${err.message}` });
  }
}

// --- SYSTEM PROMPT ---

const SYSTEM_KNOWLEDGE_COMPACT = `
Você é o Assistente IA do Sistema Taubaté Chopp. Você pode EXECUTAR AÇÕES no sistema, não apenas conversar.

## CAPACIDADES POR MÓDULO

### Pedidos
- Criar pedidos (precisa do nome do cliente e produtos)
- Alterar status de pedidos (pendente → em_separacao → em_rota → entregue / cancelado)
- Listar pedidos com filtros (hoje, semana, mês, por status, por cliente)

### CRM
- Criar leads/oportunidades
- Mover leads entre etapas do funil
- Listar leads com filtros

### Financeiro
- Lançar receitas e despesas
- Ver resumo financeiro (receitas, despesas, saldo)
- Listar contas a vencer

### Contabilidade
- Listar pendências fiscais
- Listar documentos fiscais emitidos
- Resolver pendências

## REGRAS
1. SEMPRE use as ferramentas quando o usuário pedir uma ação - não diga "vá ao menu X", FAÇA a ação.
2. Se faltar informação para executar, pergunte ao usuário.
3. Após executar, confirme com detalhes do que foi feito.
4. Para consultas, apresente os dados de forma clara e organizada.
5. Seja direto e prático. Use **negrito** para destaques.
6. Se o módulo atual não tem a ferramenta necessária, explique que a ação pertence a outro módulo.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { message, module_name, module_context, conversation_history = [] } = await req.json();

    console.log(`[system-assistant] Module: ${module_name}, Message: ${message?.substring(0, 100)}`);

    const tools = getToolsForModule(module_name);

    const systemPrompt = `${SYSTEM_KNOWLEDGE_COMPACT}

## CONTEXTO ATUAL
Módulo: ${module_name}
${module_context}

${tools.length > 0
  ? `Você tem ${tools.length} ferramentas disponíveis neste módulo. USE-AS quando o usuário pedir ações.`
  : `Este módulo não tem ferramentas de ação. Ajude o usuário com informações e orientações.`
}`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // First API call - may include tool calls
    const apiBody: any = {
      model: "google/gemini-2.5-flash",
      messages,
      temperature: 0.4,
      max_tokens: 1500,
    };
    if (tools.length > 0) {
      apiBody.tools = tools;
      apiBody.tool_choice = "auto";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[system-assistant] API error:", errorText);
      if (response.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns segundos.");
      if (response.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error(`API error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices?.[0]?.message;

    // Handle tool calls - execute and get final response
    if (assistantMessage?.tool_calls?.length > 0) {
      console.log(`[system-assistant] Tool calls: ${assistantMessage.tool_calls.map((t: any) => t.function.name).join(", ")}`);

      // Add assistant message with tool calls
      messages.push(assistantMessage);

      // Execute each tool call
      const actionResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[system-assistant] Executing: ${toolCall.function.name}`, args);
        const result = await executeTool(supabaseAdmin, toolCall.function.name, args);
        
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        actionResults.push({ tool: toolCall.function.name, result: JSON.parse(result) });
      }

      // Second API call to get natural language response
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          temperature: 0.4,
          max_tokens: 1000,
        }),
      });

      if (!followUp.ok) throw new Error(`Follow-up API error: ${followUp.status}`);

      const followUpData = await followUp.json();
      const finalContent = followUpData.choices?.[0]?.message?.content || "Ação executada com sucesso.";

      return new Response(
        JSON.stringify({
          response: finalContent,
          actions_executed: actionResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls - regular response
    return new Response(
      JSON.stringify({ response: assistantMessage?.content || "Desculpe, não consegui processar." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[system-assistant] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
