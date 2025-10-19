export interface Campanha {
  id: string;
  nome: string;
  data: string;
  publicoAlvo: number;
  mensagensEnviadas: number;
  mensagensEntregues: number;
  mensagensLidas: number;
  respostas: number;
  taxaResposta: number;
  conversoes: number;
  taxaConversao: number;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  createdAt: string;
}

export interface MensagemWhatsApp {
  id: string;
  clienteId: string;
  nomeCliente: string;
  mensagem: string;
  status: 'enviada' | 'entregue' | 'lida' | 'respondida' | 'erro';
  dataHora: string;
  campanhaId?: string;
  createdAt: string;
}
