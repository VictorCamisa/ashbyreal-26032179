import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type DocumentoFiscalTipo = 'NFE' | 'NFSE' | 'CFE_SAT' | 'NFCE';
export type DocumentoFiscalStatus = 'RASCUNHO' | 'PENDENTE_EMISSAO' | 'EMITIDA' | 'CANCELADA' | 'REJEITADA' | 'INUTILIZADA';
export type DocumentoFiscalDirecao = 'ENTRADA' | 'SAIDA';

export interface DocumentoFiscal {
  id: string;
  tipo: DocumentoFiscalTipo;
  direcao: DocumentoFiscalDirecao;
  status: DocumentoFiscalStatus;
  numero: string | null;
  serie: string | null;
  chave_acesso: string | null;
  data_emissao: string | null;
  data_competencia: string;
  valor_produtos: number;
  valor_servicos: number;
  valor_desconto: number;
  valor_frete: number;
  valor_outras: number;
  valor_total: number;
  valor_icms: number | null;
  valor_ipi: number | null;
  valor_pis: number | null;
  valor_cofins: number | null;
  valor_iss: number | null;
  cliente_id: string | null;
  lojista_id: string | null;
  pedido_id: string | null;
  boleto_id: string | null;
  entity_id: string | null;
  natureza_operacao: string | null;
  informacoes_adicionais: string | null;
  razao_social: string | null;
  cnpj_cpf: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: { nome: string } | null;
  lojista?: { nome: string } | null;
  boleto?: { description: string; amount: number } | null;
}

export interface ContabilidadeAlerta {
  id: string;
  tipo: string;
  prioridade: string;
  status: string;
  titulo: string;
  descricao: string | null;
  boleto_id: string | null;
  pedido_id: string | null;
  documento_id: string | null;
  transaction_id: string | null;
  valor_esperado: number | null;
  valor_encontrado: number | null;
  diferenca: number | null;
  created_at: string;
  // Joined data
  boleto?: { description: string; beneficiario: string } | null;
  pedido?: { numero_pedido: number; valor_total: number } | null;
}

export interface ContabilidadeStats {
  totalDocumentos: number;
  emitidas: number;
  pendentes: number;
  entradas: number;
  saidas: number;
  valorTotalEntradas: number;
  valorTotalSaidas: number;
  alertasPendentes: number;
}

// Fetch documentos fiscais
export function useDocumentosFiscais(filters?: {
  tipo?: DocumentoFiscalTipo;
  direcao?: DocumentoFiscalDirecao;
  status?: DocumentoFiscalStatus;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['documentos-fiscais', filters],
    queryFn: async () => {
      let query = supabase
        .from('documentos_fiscais')
        .select(`
          *,
          cliente:clientes(nome),
          lojista:lojistas(nome),
          boleto:boletos(description, amount)
        `)
        .order('created_at', { ascending: false });

      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.direcao) {
        query = query.eq('direcao', filters.direcao);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('data_competencia', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('data_competencia', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentoFiscal[];
    }
  });
}

// Fetch alertas contábeis
export function useContabilidadeAlertas(status?: string) {
  return useQuery({
    queryKey: ['contabilidade-alertas', status],
    queryFn: async () => {
      let query = supabase
        .from('contabilidade_alertas')
        .select(`
          *,
          boleto:boletos(description, beneficiario),
          pedido:pedidos(numero_pedido, valor_total)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContabilidadeAlerta[];
    }
  });
}

// Fetch stats
export function useContabilidadeStats(month?: string) {
  return useQuery({
    queryKey: ['contabilidade-stats', month],
    queryFn: async () => {
      const startOfMonth = month 
        ? new Date(month + '-01') 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

      // Get documentos
      const { data: documentos, error: docError } = await supabase
        .from('documentos_fiscais')
        .select('id, direcao, status, valor_total')
        .gte('data_competencia', startOfMonth.toISOString().split('T')[0])
        .lte('data_competencia', endOfMonth.toISOString().split('T')[0]);

      if (docError) throw docError;

      // Get pending alerts
      const { count: alertasCount, error: alertError } = await supabase
        .from('contabilidade_alertas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDENTE');

      if (alertError) throw alertError;

      const docs = documentos || [];
      
      const stats: ContabilidadeStats = {
        totalDocumentos: docs.length,
        emitidas: docs.filter(d => d.status === 'EMITIDA').length,
        pendentes: docs.filter(d => d.status === 'PENDENTE_EMISSAO' || d.status === 'RASCUNHO').length,
        entradas: docs.filter(d => d.direcao === 'ENTRADA').length,
        saidas: docs.filter(d => d.direcao === 'SAIDA').length,
        valorTotalEntradas: docs.filter(d => d.direcao === 'ENTRADA').reduce((acc, d) => acc + Number(d.valor_total || 0), 0),
        valorTotalSaidas: docs.filter(d => d.direcao === 'SAIDA').reduce((acc, d) => acc + Number(d.valor_total || 0), 0),
        alertasPendentes: alertasCount || 0,
      };

      return stats;
    }
  });
}

// Fetch boletos sem nota de entrada
export function useBoletosWithoutNF() {
  return useQuery({
    queryKey: ['boletos-without-nf'],
    queryFn: async () => {
      // Get all paid boletos
      const { data: boletos, error: boletoError } = await supabase
        .from('boletos')
        .select('id, description, beneficiario, amount, paid_at, tipo_nota')
        .eq('status', 'PAGO');

      if (boletoError) throw boletoError;

      // Get boleto ids that have documento fiscal
      const { data: docsWithBoleto, error: docError } = await supabase
        .from('documentos_fiscais')
        .select('boleto_id')
        .not('boleto_id', 'is', null);

      if (docError) throw docError;

      const boletoIdsWithDoc = new Set((docsWithBoleto || []).map(d => d.boleto_id));

      // Filter boletos without documento fiscal
      return (boletos || []).filter(b => !boletoIdsWithDoc.has(b.id));
    }
  });
}

// Fetch pedidos sem nota de saída
export function usePedidosSemNota() {
  return useQuery({
    queryKey: ['pedidos-sem-nota'],
    queryFn: async () => {
      // Get delivered orders
      const { data: pedidos, error: pedidoError } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, valor_total, data_entrega, cliente:clientes(nome)')
        .eq('status', 'entregue');

      if (pedidoError) throw pedidoError;

      // Get pedido ids that have documento fiscal
      const { data: docsWithPedido, error: docError } = await supabase
        .from('documentos_fiscais')
        .select('pedido_id')
        .eq('direcao', 'SAIDA')
        .not('pedido_id', 'is', null);

      if (docError) throw docError;

      const pedidoIdsWithDoc = new Set((docsWithPedido || []).map(d => d.pedido_id));

      // Filter pedidos without documento fiscal
      return (pedidos || []).filter(p => !pedidoIdsWithDoc.has(p.id));
    }
  });
}

// Mutations
export function useDocumentoFiscalMutations() {
  const queryClient = useQueryClient();

  const createDocumento = useMutation({
    mutationFn: async (data: Partial<DocumentoFiscal>) => {
      const { data: result, error } = await supabase
        .from('documentos_fiscais')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Documento criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar documento', description: error.message, variant: 'destructive' });
    }
  });

  const updateDocumento = useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocumentoFiscal> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('documentos_fiscais')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Documento atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar documento', description: error.message, variant: 'destructive' });
    }
  });

  const emitirDocumento = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Integração com API de emissão futura
      const { data: result, error } = await supabase
        .from('documentos_fiscais')
        .update({ 
          status: 'EMITIDA',
          data_emissao: new Date().toISOString()
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Documento emitido com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao emitir documento', description: error.message, variant: 'destructive' });
    }
  });

  const cancelarDocumento = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { data: result, error } = await supabase
        .from('documentos_fiscais')
        .update({ 
          status: 'CANCELADA',
          motivo_cancelamento: motivo
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-fiscais'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Documento cancelado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cancelar documento', description: error.message, variant: 'destructive' });
    }
  });

  return { createDocumento, updateDocumento, emitirDocumento, cancelarDocumento };
}

export function useAlertaMutations() {
  const queryClient = useQueryClient();

  const resolverAlerta = useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas?: string }) => {
      const { data: result, error } = await supabase
        .from('contabilidade_alertas')
        .update({ 
          status: 'RESOLVIDO',
          resolvido_em: new Date().toISOString(),
          resolucao_notas: notas
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contabilidade-alertas'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Alerta resolvido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resolver alerta', description: error.message, variant: 'destructive' });
    }
  });

  const ignorarAlerta = useMutation({
    mutationFn: async ({ id, notas }: { id: string; notas?: string }) => {
      const { data: result, error } = await supabase
        .from('contabilidade_alertas')
        .update({ 
          status: 'IGNORADO',
          resolucao_notas: notas
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contabilidade-alertas'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
      toast({ title: 'Alerta ignorado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao ignorar alerta', description: error.message, variant: 'destructive' });
    }
  });

  const criarAlerta = useMutation({
    mutationFn: async (data: Partial<ContabilidadeAlerta>) => {
      const { data: result, error } = await supabase
        .from('contabilidade_alertas')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contabilidade-alertas'] });
      queryClient.invalidateQueries({ queryKey: ['contabilidade-stats'] });
    }
  });

  return { resolverAlerta, ignorarAlerta, criarAlerta };
}
