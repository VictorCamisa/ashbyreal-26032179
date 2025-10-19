import { Lead } from '@/types/lead';

export const mockLeads: Lead[] = [
  {
    id: '1',
    nome: 'Roberto Alves',
    telefone: '(11) 94444-1111',
    email: 'roberto@email.com',
    origem: 'WhatsApp',
    status: 'novo_lead',
    valorEstimado: 5000,
    dataCriacao: '2025-10-18',
    ultimaAtualizacao: '2025-10-18',
    observacoes: 'Interessado em cervejas artesanais para evento',
    responsavel: 'Equipe Comercial',
    createdAt: '2025-10-18T09:30:00Z',
    updatedAt: '2025-10-18T09:30:00Z'
  },
  {
    id: '2',
    nome: 'Fernanda Lima',
    telefone: '(11) 93333-2222',
    email: 'fernanda.lima@email.com',
    origem: 'Instagram',
    status: 'qualificado',
    valorEstimado: 3500,
    dataCriacao: '2025-10-15',
    ultimaAtualizacao: '2025-10-17',
    observacoes: 'Quer abrir um bar e precisa de fornecedor fixo',
    responsavel: 'Ana Souza',
    createdAt: '2025-10-15T14:20:00Z',
    updatedAt: '2025-10-17T16:45:00Z'
  },
  {
    id: '3',
    nome: 'Marcos Pereira',
    telefone: '(11) 92222-3333',
    origem: 'Facebook',
    status: 'negociacao',
    valorEstimado: 8000,
    dataCriacao: '2025-10-10',
    ultimaAtualizacao: '2025-10-18',
    observacoes: 'Em negociação de contrato mensal',
    responsavel: 'Carlos Santos',
    createdAt: '2025-10-10T10:15:00Z',
    updatedAt: '2025-10-18T11:30:00Z'
  },
  {
    id: '4',
    nome: 'Juliana Martins',
    telefone: '(11) 91111-4444',
    email: 'juliana@email.com',
    origem: 'Indicação',
    status: 'fechado',
    valorEstimado: 6500,
    dataCriacao: '2025-10-05',
    ultimaAtualizacao: '2025-10-16',
    observacoes: 'Fechou contrato de fornecimento',
    responsavel: 'Ana Souza',
    createdAt: '2025-10-05T08:00:00Z',
    updatedAt: '2025-10-16T17:20:00Z'
  },
  {
    id: '5',
    nome: 'Ricardo Souza',
    telefone: '(11) 90000-5555',
    origem: 'Site',
    status: 'perdido',
    valorEstimado: 4000,
    dataCriacao: '2025-09-28',
    ultimaAtualizacao: '2025-10-12',
    observacoes: 'Optou por outro fornecedor devido ao prazo',
    responsavel: 'Carlos Santos',
    createdAt: '2025-09-28T15:45:00Z',
    updatedAt: '2025-10-12T09:10:00Z'
  }
];
