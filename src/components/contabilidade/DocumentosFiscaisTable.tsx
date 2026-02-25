import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  MoreHorizontal, 
  Eye, 
  Send, 
  XCircle, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Download,
  Receipt,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useDocumentosFiscais, 
  useDocumentoFiscalMutations,
  DocumentoFiscal,
  DocumentoFiscalTipo,
  DocumentoFiscalDirecao,
  DocumentoFiscalStatus 
} from '@/hooks/useContabilidade';
import { Skeleton } from '@/components/ui/skeleton';
import { NovoDocumentoDialog } from './NovoDocumentoDialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const tipoLabels: Record<DocumentoFiscalTipo, string> = {
  NFE: 'NF-e',
  NFSE: 'NFS-e',
  CFE_SAT: 'CF-e/SAT',
  NFCE: 'NFC-e',
};

const statusConfig: Record<DocumentoFiscalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'outline' },
  PENDENTE_EMISSAO: { label: 'Pendente', variant: 'secondary' },
  EMITIDA: { label: 'Emitida', variant: 'default' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
  REJEITADA: { label: 'Rejeitada', variant: 'destructive' },
  INUTILIZADA: { label: 'Inutilizada', variant: 'outline' },
};

export function DocumentosFiscaisTable() {
  const [tipoFilter, setTipoFilter] = useState<DocumentoFiscalTipo | 'all'>('all');
  const [direcaoFilter, setDirecaoFilter] = useState<DocumentoFiscalDirecao | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentoFiscalStatus | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emittingId, setEmittingId] = useState<string | null>(null);
  const [consultingId, setConsultingId] = useState<string | null>(null);

  const filters = {
    tipo: tipoFilter !== 'all' ? tipoFilter : undefined,
    direcao: direcaoFilter !== 'all' ? direcaoFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: documentos, isLoading, refetch } = useDocumentosFiscais(filters);
  const { emitirDocumento, cancelarDocumento } = useDocumentoFiscalMutations();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleEmitirFocus = async (doc: DocumentoFiscal) => {
    const tipoLabel = doc.tipo === 'NFCE' ? 'NFC-e (Cupom Fiscal)' : 'NF-e';
    if (!confirm(`Emitir ${tipoLabel} via Focus NFe (SEFAZ)?\n\nValor: ${formatCurrency(doc.valor_total)}`)) return;
    
    setEmittingId(doc.id);
    try {
      const result = await emitirDocumento.mutateAsync({ id: doc.id, useFocusNfe: true, ambiente: 'PRODUCAO' });
      if (result?.danfe_url) {
        window.open(result.danfe_url, '_blank');
      }
    } finally {
      setEmittingId(null);
    }
  };

  const handleEmitirManual = (doc: DocumentoFiscal) => {
    if (confirm('Deseja marcar este documento como emitido manualmente?')) {
      emitirDocumento.mutate({ id: doc.id, useFocusNfe: false });
    }
  };

  const handleConsultar = async (doc: DocumentoFiscal) => {
    setConsultingId(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('focus-nfe', {
        body: { action: 'consultar', documento_id: doc.id, tipo: doc.tipo, ambiente: 'PRODUCAO' },
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      
      const isSuccess = data?.status === 'autorizado';
      toast({
        title: isSuccess ? '✅ NF Autorizada!' : `Status: ${data?.status || 'desconhecido'}`,
        description: data?.user_message || 'Consulta realizada.',
        variant: isSuccess ? 'default' : 'destructive',
      });

      if (data?.caminho_danfe) {
        window.open(data.caminho_danfe, '_blank');
      }

      refetch();
    } catch (err: any) {
      toast({ title: 'Erro ao consultar', description: err.message, variant: 'destructive' });
    } finally {
      setConsultingId(null);
    }
  };

  const handleCancelar = async (doc: DocumentoFiscal) => {
    const motivo = prompt('Informe o motivo do cancelamento (mínimo 15 caracteres):');
    if (!motivo || motivo.length < 15) {
      if (motivo) toast({ title: 'Motivo muito curto', description: 'Mínimo 15 caracteres.', variant: 'destructive' });
      return;
    }

    if (doc.chave_acesso) {
      try {
        await supabase.functions.invoke('focus-nfe', {
          body: { action: 'cancelar', documento_id: doc.id, justificativa: motivo, tipo: doc.tipo, ambiente: 'PRODUCAO' },
        });
        toast({ title: 'Documento cancelado na SEFAZ!' });
        refetch();
      } catch (err: any) {
        toast({ title: 'Erro ao cancelar na SEFAZ', description: err.message, variant: 'destructive' });
      }
    } else {
      cancelarDocumento.mutate({ id: doc.id, motivo });
    }
  };

  const handleDownloadPdf = (doc: DocumentoFiscal) => {
    if (doc.pdf_url) {
      window.open(doc.pdf_url, '_blank');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Fiscais
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Novo Documento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as DocumentoFiscalTipo | 'all')}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="NFE">NF-e</SelectItem>
                <SelectItem value="NFSE">NFS-e</SelectItem>
                <SelectItem value="CFE_SAT">CF-e/SAT</SelectItem>
                <SelectItem value="NFCE">NFC-e</SelectItem>
              </SelectContent>
            </Select>

            <Select value={direcaoFilter} onValueChange={(v) => setDirecaoFilter(v as DocumentoFiscalDirecao | 'all')}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ENTRADA">Entrada</SelectItem>
                <SelectItem value="SAIDA">Saída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentoFiscalStatus | 'all')}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                <SelectItem value="PENDENTE_EMISSAO">Pendente</SelectItem>
                <SelectItem value="EMITIDA">Emitida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
                <SelectItem value="REJEITADA">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !documentos || documentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum documento fiscal encontrado</p>
              <p className="text-sm mt-1">Crie um novo documento ou emita um cupom fiscal</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead className="hidden sm:table-cell">Dir.</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc) => {
                    const status = statusConfig[doc.status];
                    const isEmitting = emittingId === doc.id;
                    const isConsulting = consultingId === doc.id;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Badge variant="outline">{tipoLabels[doc.tipo]}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {doc.numero || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {doc.direcao === 'ENTRADA' ? (
                            <ArrowDownCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {doc.razao_social || doc.cliente?.nome || doc.lojista?.nome || '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(doc.valor_total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {format(new Date(doc.data_competencia), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isEmitting || isConsulting}>
                                {isEmitting || isConsulting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Emissão via Focus NFe */}
                              {(doc.status === 'RASCUNHO' || doc.status === 'PENDENTE_EMISSAO' || doc.status === 'REJEITADA') && doc.direcao === 'SAIDA' && (
                                <>
                                  {(doc.tipo === 'NFE' || doc.tipo === 'NFCE') && (
                                    <DropdownMenuItem onClick={() => handleEmitirFocus(doc)}>
                                      <Send className="h-4 w-4 mr-2" />
                                      Emitir {doc.tipo === 'NFCE' ? 'NFC-e' : 'NF-e'} via Focus NFe
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEmitirManual(doc)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Marcar como Emitido
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}

                              {/* Consultar status na SEFAZ */}
                              {(doc.tipo === 'NFE' || doc.tipo === 'NFCE') && doc.status !== 'RASCUNHO' && doc.status !== 'CANCELADA' && (
                                <DropdownMenuItem onClick={() => handleConsultar(doc)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Consultar Status SEFAZ
                                </DropdownMenuItem>
                              )}

                              {/* Download PDF / DANFE */}
                              {doc.pdf_url && (
                                <DropdownMenuItem onClick={() => handleDownloadPdf(doc)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Visualizar DANFE (PDF)
                                </DropdownMenuItem>
                              )}

                              {/* Chave de acesso */}
                              {doc.chave_acesso && (
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(doc.chave_acesso!);
                                  toast({ title: 'Chave copiada!' });
                                }}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Copiar Chave de Acesso
                                </DropdownMenuItem>
                              )}

                              {/* Cancelar */}
                              {doc.status === 'EMITIDA' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleCancelar(doc)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancelar Documento
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NovoDocumentoDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}