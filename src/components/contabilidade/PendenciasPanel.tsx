import { useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, Receipt, Truck, FileText, Plus, ChevronRight } from 'lucide-react';
import { formatDayMonthShort } from '@/lib/dateUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBoletosWithoutNF, usePedidosSemNota, useDocumentoFiscalMutations } from '@/hooks/useContabilidade';
import { Skeleton } from '@/components/ui/skeleton';

export function PendenciasPanel() {
  const { data: boletosWithoutNF, isLoading: loadingBoletos } = useBoletosWithoutNF();
  const { data: pedidosSemNota, isLoading: loadingPedidos } = usePedidosSemNota();
  const { createDocumento } = useDocumentoFiscalMutations();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCriarNotaEntrada = (boleto: any) => {
    createDocumento.mutate({
      tipo: 'NFE',
      direcao: 'ENTRADA',
      status: 'RASCUNHO',
      boleto_id: boleto.id,
      razao_social: boleto.beneficiario,
      valor_produtos: boleto.amount,
      valor_total: boleto.amount,
      natureza_operacao: 'Compra para comercialização',
    } as any);
  };

  const handleCriarNotaSaida = (pedido: any) => {
    createDocumento.mutate({
      tipo: 'NFCE',
      direcao: 'SAIDA',
      status: 'RASCUNHO',
      pedido_id: pedido.id,
      cliente_id: pedido.cliente?.id,
      valor_produtos: pedido.valor_total,
      valor_total: pedido.valor_total,
      natureza_operacao: 'Venda de mercadoria',
    } as any);
  };

  const isLoading = loadingBoletos || loadingPedidos;

  const totalBoletosWithoutNF = boletosWithoutNF?.length || 0;
  const totalPedidosSemNota = pedidosSemNota?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Pendências Fiscais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="entradas">
          <TabsList className="w-full">
            <TabsTrigger value="entradas" className="flex-1">
              <Receipt className="h-4 w-4 mr-2" />
              Entradas
              {totalBoletosWithoutNF > 0 && (
                <Badge variant="secondary" className="ml-2">{totalBoletosWithoutNF}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saidas" className="flex-1">
              <Truck className="h-4 w-4 mr-2" />
              Saídas
              {totalPedidosSemNota > 0 && (
                <Badge variant="secondary" className="ml-2">{totalPedidosSemNota}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entradas" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !boletosWithoutNF || boletosWithoutNF.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Todos os boletos pagos possuem NF de entrada</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {boletosWithoutNF.map((boleto) => (
                    <div
                      key={boleto.id}
                      className="p-3 rounded-lg border bg-amber-500/5 border-amber-200 dark:border-amber-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {boleto.beneficiario || boleto.description || 'Boleto sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatCurrency(boleto.amount)}</span>
                            {boleto.paid_at && (
                              <>
                                <span>•</span>
                                <span>Pago em {formatDayMonthShort(new Date(boleto.paid_at))}</span>
                              </>
                            )}
                            {boleto.tipo_nota && (
                              <Badge variant="outline" className="text-xs">
                                {boleto.tipo_nota === 'COM_NOTA' ? 'c/ NF' : 's/ NF'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                          onClick={() => handleCriarNotaEntrada(boleto)}
                          disabled={createDocumento.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          NF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="saidas" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !pedidosSemNota || pedidosSemNota.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Todos os pedidos entregues possuem NF emitida</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {pedidosSemNota.map((pedido: any) => (
                    <div
                      key={pedido.id}
                      className="p-3 rounded-lg border bg-red-500/5 border-red-200 dark:border-red-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            Pedido #{pedido.numero_pedido}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatCurrency(pedido.valor_total)}</span>
                            {pedido.cliente?.nome && (
                              <>
                                <span>•</span>
                                <span className="truncate">{pedido.cliente.nome}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-shrink-0"
                          onClick={() => handleCriarNotaSaida(pedido)}
                          disabled={createDocumento.isPending}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Emitir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
