export type PrioridadeTicket = 'baixa' | 'media' | 'alta' | 'urgente';
export type StatusTicket = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';

export interface Ticket {
  id: string;
  nome: string;
  email: string;
  assunto: string;
  descricao: string;
  prioridade: PrioridadeTicket;
  status: StatusTicket;
  dataAbertura: string;
  ultimaAtualizacao: string;
  anexos?: string[];
  responsavel?: string;
  resolucao?: string;
  createdAt: string;
  updatedAt: string;
}
