import { Ticket } from '@/types/suporte';

export const mockTickets: Ticket[] = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'joao.silva@email.com',
    assunto: 'Erro ao processar pagamento',
    descricao: 'Tentei realizar um pagamento via Pix mas o sistema não reconheceu o comprovante.',
    prioridade: 'alta',
    status: 'em_andamento',
    dataAbertura: '2025-10-18T10:30:00Z',
    ultimaAtualizacao: '2025-10-18T11:45:00Z',
    responsavel: 'Suporte VS',
    createdAt: '2025-10-18T10:30:00Z',
    updatedAt: '2025-10-18T11:45:00Z'
  },
  {
    id: '2',
    nome: 'Maria Santos',
    email: 'maria.santos@email.com',
    assunto: 'Dúvida sobre estoque',
    descricao: 'Como faço para verificar o histórico de movimentações de um produto específico?',
    prioridade: 'media',
    status: 'resolvido',
    dataAbertura: '2025-10-17T14:20:00Z',
    ultimaAtualizacao: '2025-10-17T16:30:00Z',
    responsavel: 'Suporte VS',
    resolucao: 'Instruções enviadas por e-mail. Acesse Estoque > Clique no produto > Histórico.',
    createdAt: '2025-10-17T14:20:00Z',
    updatedAt: '2025-10-17T16:30:00Z'
  },
  {
    id: '3',
    nome: 'Pedro Oliveira',
    email: 'pedro@email.com',
    assunto: 'Integração com n8n',
    descricao: 'Preciso de ajuda para configurar o webhook do n8n no módulo de configurações.',
    prioridade: 'baixa',
    status: 'aberto',
    dataAbertura: '2025-10-18T09:15:00Z',
    ultimaAtualizacao: '2025-10-18T09:15:00Z',
    createdAt: '2025-10-18T09:15:00Z',
    updatedAt: '2025-10-18T09:15:00Z'
  }
];
