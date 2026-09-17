import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Calculator,
  Megaphone,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export type JarvisRole = "user" | "jarvis";

export type JarvisStatus = "online" | "thinking" | "acting" | "offline";

export interface JarvisToolRun {
  id: string;
  label: string;
  detail?: string;
  state: "running" | "done" | "failed";
}

export interface JarvisSource {
  id: string;
  label: string;
  href?: string;
}

export interface JarvisMessage {
  id: string;
  role: JarvisRole;
  content: string;
  createdAt: Date;
  /** Passos executados pelo agente antes de responder. */
  tools?: JarvisToolRun[];
  /** Módulos/registros consultados para montar a resposta. */
  sources?: JarvisSource[];
  /** Resposta ainda sendo escrita. */
  streaming?: boolean;
}

export interface JarvisThread {
  id: string;
  title: string;
  preview: string;
  updatedAt: Date;
  pinned?: boolean;
  messages: JarvisMessage[];
}

export interface JarvisSkill {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Somente leitura ou também pode escrever no módulo. */
  scope: "leitura" | "leitura e escrita";
  enabled: boolean;
}

export interface JarvisMemoryItem {
  id: string;
  title: string;
  detail: string;
  origin: string;
  createdAt: Date;
}

export interface JarvisActivityItem {
  id: string;
  label: string;
  detail: string;
  at: Date;
  state: "done" | "running" | "failed";
}

export const JARVIS_SKILLS: JarvisSkill[] = [
  {
    key: "pedidos",
    label: "Pedidos",
    description: "Consulta, cria e altera o status de pedidos.",
    icon: ShoppingCart,
    scope: "leitura e escrita",
    enabled: true,
  },
  {
    key: "crm",
    label: "CRM",
    description: "Lê o funil, move leads e registra follow-ups.",
    icon: Target,
    scope: "leitura e escrita",
    enabled: true,
  },
  {
    key: "financeiro",
    label: "Financeiro",
    description: "Contas a pagar e receber, saldo e fluxo de caixa.",
    icon: Wallet,
    scope: "leitura",
    enabled: true,
  },
  {
    key: "estoque",
    label: "Estoque & Barris",
    description: "Níveis de estoque, alertas e giro de barris.",
    icon: Boxes,
    scope: "leitura",
    enabled: true,
  },
  {
    key: "clientes",
    label: "Clientes",
    description: "Histórico, ticket médio e recorrência por cliente.",
    icon: Users,
    scope: "leitura",
    enabled: true,
  },
  {
    key: "analise",
    label: "Análise Financeira",
    description: "Compara períodos e projeta receita.",
    icon: TrendingUp,
    scope: "leitura",
    enabled: false,
  },
  {
    key: "contabilidade",
    label: "Contabilidade",
    description: "Pendências fiscais e documentos emitidos.",
    icon: Calculator,
    scope: "leitura",
    enabled: false,
  },
  {
    key: "marketing",
    label: "Marketing",
    description: "Campanhas, disparos e resultados por canal.",
    icon: Megaphone,
    scope: "leitura",
    enabled: false,
  },
];

export const JARVIS_SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Fechamento do trimestre",
    prompt: "Como está o trimestre até agora em litros, faturamento e ticket médio?",
  },
  {
    label: "Pedidos pendentes",
    prompt: "Quais pedidos ainda estão aguardando confirmação e há quantos dias?",
  },
  {
    label: "Risco de ruptura",
    prompt: "Quais produtos estão em alerta de estoque para a próxima semana?",
  },
  {
    label: "Contas a pagar",
    prompt: "Me mostre as contas a pagar dos próximos 7 dias e o impacto no saldo.",
  },
  {
    label: "Clientes em risco",
    prompt: "Quais clientes recorrentes não compram há mais de 45 dias?",
  },
];
