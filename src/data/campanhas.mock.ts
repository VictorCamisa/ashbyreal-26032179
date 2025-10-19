import { Campanha, MensagemWhatsApp } from '@/types/campanha';

export const mockCampanhas: Campanha[] = [
  {
    id: '1',
    nome: 'Lançamento IPA Especial',
    data: '2025-10-15',
    publicoAlvo: 342,
    mensagensEnviadas: 342,
    mensagensEntregues: 338,
    mensagensLidas: 295,
    respostas: 127,
    taxaResposta: 37.13,
    conversoes: 45,
    taxaConversao: 13.16,
    status: 'concluida',
    createdAt: '2025-10-15T08:00:00Z'
  },
  {
    id: '2',
    nome: 'Promoção Outubro',
    data: '2025-10-01',
    publicoAlvo: 280,
    mensagensEnviadas: 280,
    mensagensEntregues: 278,
    mensagensLidas: 243,
    respostas: 98,
    taxaResposta: 35.00,
    conversoes: 32,
    taxaConversao: 11.43,
    status: 'concluida',
    createdAt: '2025-10-01T10:00:00Z'
  },
  {
    id: '3',
    nome: 'Reativação Clientes Inativos',
    data: '2025-10-18',
    publicoAlvo: 156,
    mensagensEnviadas: 156,
    mensagensEntregues: 154,
    mensagensLidas: 89,
    respostas: 23,
    taxaResposta: 14.74,
    conversoes: 8,
    taxaConversao: 5.13,
    status: 'em_andamento',
    createdAt: '2025-10-18T09:00:00Z'
  }
];

export const mockMensagensWhatsApp: MensagemWhatsApp[] = [
  {
    id: '1',
    clienteId: '1',
    nomeCliente: 'João Silva',
    mensagem: 'Olá! Temos um lançamento especial de IPA com 15% de desconto...',
    status: 'respondida',
    dataHora: '2025-10-18T14:30:00Z',
    campanhaId: '1',
    createdAt: '2025-10-18T14:30:00Z'
  },
  {
    id: '2',
    clienteId: '2',
    nomeCliente: 'Maria Santos',
    mensagem: 'Promoção exclusiva: Compre 50 unidades e ganhe 10% OFF!',
    status: 'lida',
    dataHora: '2025-10-18T14:25:00Z',
    campanhaId: '2',
    createdAt: '2025-10-18T14:25:00Z'
  },
  {
    id: '3',
    clienteId: '4',
    nomeCliente: 'Ana Costa',
    mensagem: 'Sentimos sua falta! Que tal voltar com uma oferta especial?',
    status: 'entregue',
    dataHora: '2025-10-18T14:20:00Z',
    campanhaId: '3',
    createdAt: '2025-10-18T14:20:00Z'
  }
];
