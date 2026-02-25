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
  Filter,
  Download
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

  const filters = {
    tipo: tipoFilter !== 'all' ? tipoFilter : undefined,
    direcao: direcaoFilter !== 'all' ? direcaoFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: documentos, isLoading } = useDocumentosFiscais(filters);
  const { emitirDocumento, cancelarDocumento } = useDocumentoFiscalMutations();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleEmitir = (doc: DocumentoFiscal, useFocusNfe = false) => {
    const msg = useFocusNfe 
      ? 'Deseja emitir este documento via Focus NFe (SEFAZ)?' 
      : 'Deseja marcar este documento como emitido?';
    if (confirm(msg)) {
      emitirDocumento.mutate({ id: doc.id, useFocusNfe, ambiente: 'PRODUCAO' });
    }
  };

  const handleCancelar = (doc: DocumentoFiscal) => {
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (motivo) {
      cancelarDocumento.mutate({ id: doc.id, motivo });
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
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Novo Documento
            </Button>
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
                            <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-red-500" />
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
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              {(doc.status === 'RASCUNHO' || doc.status === 'PENDENTE_EMISSAO') && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEmitir(doc, true)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Emitir via Focus NFe
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEmitir(doc, false)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Marcar como Emitido
                                  </DropdownMenuItem>
                                </>
                              )}
                              {doc.status === 'EMITIDA' && (
                                <>
                                  <DropdownMenuItem>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleCancelar(doc)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancelar
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
