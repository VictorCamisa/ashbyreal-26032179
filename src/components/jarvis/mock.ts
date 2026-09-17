import type {
  JarvisActivityItem,
  JarvisMemoryItem,
  JarvisMessage,
  JarvisThread,
} from "./types";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

let idCounter = 0;
export const jarvisId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

export const JARVIS_THREADS: JarvisThread[] = [
  {
    id: "thread-trimestre",
    title: "Fechamento do Q4",
    preview: "Faturamento 4% da meta — concentração em 2 clientes.",
    updatedAt: minutesAgo(12),
    pinned: true,
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Como está o trimestre até agora?",
        createdAt: minutesAgo(14),
      },
      {
        id: "m2",
        role: "jarvis",
        content:
          "O Q4 soma **540L** vendidos e **R$ 7.200** de faturamento — 4% da meta de R$ 180.000, com 5 pedidos de 5 clientes distintos.\n\nDois pontos merecem atenção:\n\n1. O ticket médio caiu 9% contra o trimestre anterior (R$ 1.440 hoje).\n2. R$ 5.170 dos R$ 7.200 ainda estão a receber — 4 títulos em aberto.\n\nSe o ritmo atual se mantiver, o trimestre fecha perto de R$ 21 mil. Quer que eu monte uma lista de reativação com os clientes do Q3 que ainda não compraram?",
        createdAt: minutesAgo(12),
        tools: [
          { id: "t1", label: "Consultou pedidos", detail: "5 registros no período", state: "done" },
          { id: "t2", label: "Consultou financeiro", detail: "4 títulos a receber", state: "done" },
          { id: "t3", label: "Comparou com Q3", detail: "R$ 249.115", state: "done" },
        ],
        sources: [
          { id: "s1", label: "Pedidos", href: "/pedidos" },
          { id: "s2", label: "Financeiro", href: "/financeiro" },
        ],
      },
    ],
  },
  {
    id: "thread-estoque",
    title: "Alertas de estoque",
    preview: "6 produtos abaixo do mínimo — 2 críticos.",
    updatedAt: minutesAgo(180),
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Quais produtos estão em alerta de estoque?",
        createdAt: minutesAgo(182),
      },
      {
        id: "m4",
        role: "jarvis",
        content:
          "São **6 produtos** abaixo do estoque mínimo. Dois deles não cobrem os pedidos já confirmados para esta semana e deveriam entrar na próxima compra.",
        createdAt: minutesAgo(180),
        tools: [{ id: "t4", label: "Consultou estoque", detail: "6 itens em alerta", state: "done" }],
        sources: [{ id: "s3", label: "Estoque", href: "/estoque" }],
      },
    ],
  },
  {
    id: "thread-cobranca",
    title: "Régua de cobrança",
    preview: "Rascunho de mensagem para títulos vencidos.",
    updatedAt: minutesAgo(1500),
    messages: [
      {
        id: "m5",
        role: "user",
        content: "Escreve uma mensagem de cobrança cordial para títulos vencidos há mais de 10 dias.",
        createdAt: minutesAgo(1502),
      },
      {
        id: "m6",
        role: "jarvis",
        content:
          "Rascunho pronto, em tom cordial e sem cobrança agressiva. Posso adaptar por cliente usando o histórico de compras antes de enviar.",
        createdAt: minutesAgo(1500),
      },
    ],
  },
];

export const JARVIS_MEMORY: JarvisMemoryItem[] = [
  {
    id: "mem-1",
    title: "Meta trimestral de R$ 180.000",
    detail: "Usada como referência em todo relatório de fechamento.",
    origin: "Definido na conversa 'Fechamento do Q4'",
    createdAt: minutesAgo(60 * 30),
  },
  {
    id: "mem-2",
    title: "Chopp Pilsen é o carro-chefe",
    detail: "Priorizar na análise de ruptura e nas sugestões de reposição.",
    origin: "Aprendido do histórico de pedidos",
    createdAt: minutesAgo(60 * 72),
  },
  {
    id: "mem-3",
    title: "Relatórios em português, tom direto",
    detail: "Sem jargão, números sempre em R$ e litros.",
    origin: "Preferência do usuário",
    createdAt: minutesAgo(60 * 120),
  },
];

export const JARVIS_ACTIVITY: JarvisActivityItem[] = [
  {
    id: "act-1",
    label: "Resumo do trimestre gerado",
    detail: "Leu 5 pedidos e 4 títulos a receber",
    at: minutesAgo(12),
    state: "done",
  },
  {
    id: "act-2",
    label: "Varredura de estoque",
    detail: "6 produtos sinalizados abaixo do mínimo",
    at: minutesAgo(180),
    state: "done",
  },
  {
    id: "act-3",
    label: "Sincronização com WhatsApp",
    detail: "Instância desconectada — nova tentativa em 1h",
    at: minutesAgo(240),
    state: "failed",
  },
  {
    id: "act-4",
    label: "Rascunho de cobrança",
    detail: "Texto gerado e aguardando aprovação",
    at: minutesAgo(1500),
    state: "done",
  },
];

/** Respostas simuladas — a interface funciona antes do agente existir de fato. */
export function draftJarvisReply(prompt: string): Omit<JarvisMessage, "id" | "createdAt"> {
  const q = prompt.toLowerCase();

  if (q.includes("estoque") || q.includes("ruptura") || q.includes("barril")) {
    return {
      role: "jarvis",
      content:
        "Encontrei **6 produtos** abaixo do estoque mínimo. Dois não cobrem os pedidos já confirmados desta semana — esses eu trataria como compra urgente.\n\nQuer que eu monte a sugestão de pedido de compra com as quantidades?",
      tools: [
        { id: jarvisId("tool"), label: "Consultou estoque", detail: "6 itens em alerta", state: "done" },
        { id: jarvisId("tool"), label: "Cruzou com pedidos confirmados", state: "done" },
      ],
      sources: [
        { id: jarvisId("src"), label: "Estoque", href: "/estoque" },
        { id: jarvisId("src"), label: "Barris", href: "/barris" },
      ],
    };
  }

  if (q.includes("pedido")) {
    return {
      role: "jarvis",
      content:
        "Há **3 pedidos aguardando confirmação**, o mais antigo parado há 9 dias. Juntos somam R$ 3.900.\n\nPosso preparar uma mensagem de confirmação para cada cliente ou mudar o status dos que você já validou.",
      tools: [
        { id: jarvisId("tool"), label: "Consultou pedidos", detail: "5 registros no período", state: "done" },
      ],
      sources: [{ id: jarvisId("src"), label: "Pedidos", href: "/pedidos" }],
    };
  }

  if (q.includes("financeir") || q.includes("pagar") || q.includes("receber") || q.includes("saldo")) {
    return {
      role: "jarvis",
      content:
        "O saldo projetado está em **R$ -85.158,51**: R$ 5.170 a receber contra R$ 90.328,51 a pagar, distribuídos em 118 títulos.\n\nO peso está concentrado nos próximos 7 dias. Quer que eu liste os vencimentos por dia para você priorizar?",
      tools: [
        { id: jarvisId("tool"), label: "Consultou financeiro", detail: "118 títulos a pagar", state: "done" },
        { id: jarvisId("tool"), label: "Projetou fluxo de caixa", detail: "7 dias", state: "done" },
      ],
      sources: [{ id: jarvisId("src"), label: "Financeiro", href: "/financeiro" }],
    };
  }

  if (q.includes("cliente") || q.includes("lead") || q.includes("crm")) {
    return {
      role: "jarvis",
      content:
        "O trimestre teve **5 clientes únicos** — queda de 90% contra o anterior. A base ativa está concentrada demais para o volume que vocês já operaram.\n\nSugiro uma lista de reativação com quem comprou no Q3 e sumiu. Quer que eu monte?",
      tools: [
        { id: jarvisId("tool"), label: "Consultou clientes", detail: "5 ativos no trimestre", state: "done" },
        { id: jarvisId("tool"), label: "Comparou com Q3", state: "done" },
      ],
      sources: [
        { id: jarvisId("src"), label: "Clientes", href: "/clientes" },
        { id: jarvisId("src"), label: "CRM", href: "/crm" },
      ],
    };
  }

  return {
    role: "jarvis",
    content:
      "Ainda estou em construção — minha camada de execução não está conectada, então respondo com base no que já está visível no sistema.\n\nPor enquanto consigo te ajudar com **pedidos**, **financeiro**, **estoque** e **clientes**. Escolha um dos atalhos abaixo ou me diga o que precisa que eu mostro o caminho.",
    sources: [],
  };
}
