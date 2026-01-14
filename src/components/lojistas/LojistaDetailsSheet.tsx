import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Phone,
  Mail,
  User,
  Package,
  ShoppingCart,
  Circle,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useLojistaDetails } from '@/hooks/useLojistas';
import { Skeleton } from '@/components/ui/skeleton';

interface LojistaDetailsSheetProps {
  lojistaId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LojistaDetailsSheet({ lojistaId, open, onOpenChange }: LojistaDetailsSheetProps) {
  const { data, isLoading } = useLojistaDetails(lojistaId);

  const totalVendas = data?.pedidos?.reduce((acc, p) => acc + (p.valor_total || 0), 0) || 0;
  const barrisNaLoja = data?.barris?.filter(b => b.localizacao === 'CLIENTE').length || 0;
  const barrisCheios = data?.barris?.filter(b => b.status_conteudo === 'CHEIO').length || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            {isLoading ? <Skeleton className="h-6 w-48" /> : data?.lojista?.nome}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : data?.lojista ? (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total em Vendas</p>
                        <p className="text-xl font-bold">
                          R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <Circle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Barris em Custódia</p>
                        <p className="text-xl font-bold">
                          {barrisNaLoja} ({barrisCheios} cheios)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Informações de Contato</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {data.lojista.nome_fantasia && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Nome Fantasia</p>
                      <p className="font-medium">{data.lojista.nome_fantasia}</p>
                    </div>
                  )}
                  
                  {data.lojista.cnpj && (
                    <div>
                      <p className="text-xs text-muted-foreground">CNPJ</p>
                      <p className="font-mono text-sm">{data.lojista.cnpj}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{data.lojista.telefone}</span>
                  </div>

                  {data.lojista.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{data.lojista.email}</span>
                    </div>
                  )}

                  {data.lojista.contato_responsavel && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{data.lojista.contato_responsavel}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="pedidos" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="pedidos" className="flex-1 gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Pedidos ({data.pedidos?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="barris" className="flex-1 gap-2">
                    <Circle className="h-4 w-4" />
                    Barris ({data.barris?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pedidos" className="mt-4 space-y-3">
                  {data.pedidos?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    data.pedidos?.map((pedido) => (
                      <Card key={pedido.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold">
                                  #{pedido.numero_pedido}
                                </span>
                                <Badge variant={
                                  pedido.status === 'entregue' ? 'default' :
                                  pedido.status === 'cancelado' ? 'destructive' : 'secondary'
                                }>
                                  {pedido.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">
                                R$ {(pedido.valor_total || 0).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {pedido.pedido_itens?.length || 0} itens
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="barris" className="mt-4 space-y-3">
                  {data.barris?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Circle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum barril vinculado</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {data.barris?.map((barril) => (
                        <Card key={barril.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  barril.status_conteudo === 'CHEIO' 
                                    ? 'bg-amber-100 dark:bg-amber-900/30' 
                                    : 'bg-muted'
                                }`}>
                                  <Circle className={`h-5 w-5 ${
                                    barril.status_conteudo === 'CHEIO'
                                      ? 'text-amber-600 fill-amber-600'
                                      : 'text-muted-foreground'
                                  }`} />
                                </div>
                                <div>
                                  <p className="font-mono font-bold">{barril.codigo}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {barril.capacidade}L
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant={barril.status_conteudo === 'CHEIO' ? 'default' : 'secondary'}>
                                  {barril.status_conteudo}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {barril.localizacao}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Notes */}
              {data.lojista.observacoes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {data.lojista.observacoes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
