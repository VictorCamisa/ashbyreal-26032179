import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Barril, useBarrilMovimentacoes } from '@/hooks/useBarris';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight, Package, User, Store, Droplet } from 'lucide-react';

interface MovimentacoesSheetProps {
  barril: Barril | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MovimentacoesSheet({ barril, open, onOpenChange }: MovimentacoesSheetProps) {
  const { data: movimentacoes, isLoading } = useBarrilMovimentacoes(barril?.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Histórico - {barril?.codigo}
          </SheetTitle>
        </SheetHeader>

        {barril && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{barril.codigo}</p>
                <p className="text-sm text-muted-foreground">{barril.capacidade}L</p>
              </div>
              <div className="flex gap-2">
                <Badge variant={barril.localizacao === 'LOJA' ? 'secondary' : 'default'}>
                  {barril.localizacao === 'LOJA' ? 'Na Loja' : 'Com Cliente'}
                </Badge>
                <Badge 
                  variant="outline"
                  className={barril.status_conteudo === 'CHEIO' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-orange-500 text-orange-500'
                  }
                >
                  {barril.status_conteudo === 'CHEIO' ? 'Cheio' : 'Vazio'}
                </Badge>
              </div>
            </div>
            {barril.cliente && (
              <p className="text-sm mt-2">
                Cliente: <span className="font-medium">{barril.cliente.nome}</span>
              </p>
            )}
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-240px)] mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : movimentacoes && movimentacoes.length > 0 ? (
            <div className="space-y-3 pr-4">
              {movimentacoes.map((mov) => (
                <div 
                  key={mov.id} 
                  className="p-4 border rounded-lg bg-background"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={mov.tipo_movimento === 'SAIDA' ? 'destructive' : 'default'}>
                      {mov.tipo_movimento === 'SAIDA' ? 'Saída' : 'Retorno'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(mov.data_movimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm my-3">
                    <div className="flex items-center gap-1">
                      {mov.localizacao_anterior === 'LOJA' ? (
                        <Store className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{mov.localizacao_anterior === 'LOJA' ? 'Loja' : 'Cliente'}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1">
                      {mov.localizacao_nova === 'LOJA' ? (
                        <Store className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{mov.localizacao_nova === 'LOJA' ? 'Loja' : 'Cliente'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Droplet className="h-3 w-3" />
                      {mov.status_conteudo === 'CHEIO' ? 'Cheio' : 'Vazio'}
                    </div>
                    {mov.cliente && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {mov.cliente.nome}
                      </div>
                    )}
                    {mov.pedido && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        Pedido #{mov.pedido.numero_pedido}
                      </div>
                    )}
                  </div>

                  {mov.observacoes && (
                    <p className="text-sm mt-2 italic text-muted-foreground">
                      {mov.observacoes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma movimentação registrada
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
