import { Cliente } from '@/types/cliente';

export const mockClientes: Cliente[] = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'joao.silva@email.com',
    telefone: '(11) 99999-1111',
    empresa: 'Silva Distribuidora',
    cpfCnpj: '12.345.678/0001-90',
    endereco: {
      rua: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01234-567'
    },
    status: 'ativo',
    origem: 'WhatsApp',
    ticketMedio: 3500,
    dataCadastro: '2024-01-15',
    ultimoContato: '2025-10-10',
    observacoes: 'Cliente fiel, sempre compra cervejas especiais',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-10-10T15:30:00Z'
  },
  {
    id: '2',
    nome: 'Maria Santos',
    email: 'maria.santos@email.com',
    telefone: '(11) 98888-2222',
    empresa: 'Bar do Santos',
    status: 'ativo',
    origem: 'Instagram',
    ticketMedio: 2800,
    dataCadastro: '2024-03-20',
    ultimoContato: '2025-10-08',
    createdAt: '2024-03-20T14:20:00Z',
    updatedAt: '2025-10-08T11:15:00Z'
  },
  {
    id: '3',
    nome: 'Pedro Oliveira',
    email: 'pedro@email.com',
    telefone: '(11) 97777-3333',
    status: 'lead',
    origem: 'Facebook',
    ticketMedio: 0,
    dataCadastro: '2025-10-01',
    createdAt: '2025-10-01T09:00:00Z',
    updatedAt: '2025-10-01T09:00:00Z'
  },
  {
    id: '4',
    nome: 'Ana Costa',
    email: 'ana.costa@email.com',
    telefone: '(11) 96666-4444',
    empresa: 'Restaurante Costa',
    status: 'ativo',
    origem: 'Indicação',
    ticketMedio: 5200,
    dataCadastro: '2023-11-10',
    ultimoContato: '2025-10-12',
    createdAt: '2023-11-10T16:45:00Z',
    updatedAt: '2025-10-12T10:20:00Z'
  },
  {
    id: '5',
    nome: 'Carlos Mendes',
    email: 'carlos.mendes@email.com',
    telefone: '(11) 95555-5555',
    status: 'inativo',
    origem: 'Site',
    ticketMedio: 1500,
    dataCadastro: '2024-06-15',
    ultimoContato: '2024-12-20',
    observacoes: 'Cliente inativo há 3 meses',
    createdAt: '2024-06-15T13:30:00Z',
    updatedAt: '2024-12-20T18:00:00Z'
  }
];
