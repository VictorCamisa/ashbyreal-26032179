export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa?: string;
  cpfCnpj?: string;
  endereco?: {
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  status: 'ativo' | 'inativo' | 'lead';
  origem: 'WhatsApp' | 'Facebook' | 'Instagram' | 'Indicação' | 'Site' | 'Outros';
  ticketMedio: number;
  dataCadastro: string;
  ultimoContato?: string;
  observacoes?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interacao {
  id: string;
  clienteId: string;
  tipo: 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'visita' | 'outros';
  descricao: string;
  data: string;
  responsavel: string;
  createdAt: string;
}
