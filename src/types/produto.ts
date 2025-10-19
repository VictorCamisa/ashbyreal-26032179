export type CategoriaProduto = 
  | 'Cerveja Artesanal' 
  | 'Chopeira' 
  | 'Insumos' 
  | 'Merchandising' 
  | 'Outros';

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidadeDisponivel: number;
  quantidadeMinima: number;
  precoCusto: number;
  precoVenda: number;
  margem: number;
  codigoInterno: string;
  descricao?: string;
  imagem?: string;
  ultimaAtualizacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  responsavel: string;
  motivo?: string;
  data: string;
  createdAt: string;
}

export type StatusEstoque = 'disponivel' | 'baixo' | 'esgotado';
