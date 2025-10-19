export interface ItemPedido {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  nomeCliente: string;
  items: ItemPedido[];
  valorTotal: number;
  status: 'pendente' | 'pago' | 'entregue' | 'cancelado';
  metodoPagamento?: 'pix' | 'cartao' | 'dinheiro' | 'boleto';
  observacoes?: string;
  dataPedido: string;
  dataPagamento?: string;
  dataEntrega?: string;
  createdAt: string;
  updatedAt: string;
}
