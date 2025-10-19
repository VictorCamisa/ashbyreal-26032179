import { Pedido } from '@/types/pedido';

export const mockPedidos: Pedido[] = [
  {
    id: '1',
    clienteId: '1',
    nomeCliente: 'João Silva',
    items: [
      {
        produtoId: '1',
        nomeProduto: 'Ashby IPA 600ml',
        quantidade: 50,
        precoUnitario: 15.00,
        subtotal: 750.00
      },
      {
        produtoId: '2',
        nomeProduto: 'Ashby Pilsen 355ml',
        quantidade: 100,
        precoUnitario: 9.00,
        subtotal: 900.00
      }
    ],
    valorTotal: 1650.00,
    status: 'entregue',
    metodoPagamento: 'pix',
    observacoes: 'Entrega programada para evento',
    dataPedido: '2025-10-10',
    dataPagamento: '2025-10-10',
    dataEntrega: '2025-10-12',
    createdAt: '2025-10-10T10:30:00Z',
    updatedAt: '2025-10-12T14:20:00Z'
  },
  {
    id: '2',
    clienteId: '2',
    nomeCliente: 'Maria Santos',
    items: [
      {
        produtoId: '2',
        nomeProduto: 'Ashby Pilsen 355ml',
        quantidade: 80,
        precoUnitario: 9.00,
        subtotal: 720.00
      }
    ],
    valorTotal: 720.00,
    status: 'pago',
    metodoPagamento: 'cartao',
    dataPedido: '2025-10-15',
    dataPagamento: '2025-10-15',
    createdAt: '2025-10-15T11:45:00Z',
    updatedAt: '2025-10-15T12:00:00Z'
  },
  {
    id: '3',
    clienteId: '4',
    nomeCliente: 'Ana Costa',
    items: [
      {
        produtoId: '1',
        nomeProduto: 'Ashby IPA 600ml',
        quantidade: 30,
        precoUnitario: 15.00,
        subtotal: 450.00
      },
      {
        produtoId: '3',
        nomeProduto: 'Chopeira Portátil 5L',
        quantidade: 2,
        precoUnitario: 899.00,
        subtotal: 1798.00
      }
    ],
    valorTotal: 2248.00,
    status: 'pendente',
    observacoes: 'Aguardando confirmação do cliente',
    dataPedido: '2025-10-18',
    createdAt: '2025-10-18T09:15:00Z',
    updatedAt: '2025-10-18T09:15:00Z'
  }
];
