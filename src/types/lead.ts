export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  origem: 'WhatsApp' | 'Facebook' | 'Instagram' | 'Indicação' | 'Site' | 'Outros';
  status: 'novo_lead' | 'qualificado' | 'negociacao' | 'fechado' | 'perdido';
  valorEstimado: number;
  dataCriacao: string;
  ultimaAtualizacao: string;
  observacoes?: string;
  responsavel?: string;
  createdAt: string;
  updatedAt: string;
}

export type PipelineStatus = Lead['status'];

export interface PipelineColumn {
  id: PipelineStatus;
  title: string;
  color: string;
}
