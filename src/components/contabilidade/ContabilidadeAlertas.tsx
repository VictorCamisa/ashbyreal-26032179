import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContabilidadeAlertas, useAlertaMutations, ContabilidadeAlerta } from '@/hooks/useContabilidade';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const prioridadeConfig = {
  CRITICA: { icon: AlertTriangle, color: 'bg-red-500/10 text-red-600 border-red-200' },
  ALTA: { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  MEDIA: { icon: Info, color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  BAIXA: { icon: Info, color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
};

const tipoLabels: Record<string, string> = {
  ENTRADA_SEM_NF: 'Entrada sem NF',
  SAIDA_SEM_NF: 'Saída sem NF',
  DIVERGENCIA_VALOR: 'Divergência de Valor',
  NF_PENDENTE: 'NF Pendente',
};

export function ContabilidadeAlertas() {
  const { data: alertas, isLoading } = useContabilidadeAlertas('PENDENTE');
  const { resolverAlerta, ignorarAlerta } = useAlertaMutations();
  const [selectedAlerta, setSelectedAlerta] = useState<ContabilidadeAlerta | null>(null);
  const [notas, setNotas] = useState('');

  const handleResolver = () => {
    if (selectedAlerta) {
      resolverAlerta.mutate({ id: selectedAlerta.id, notas }, {
        onSuccess: () => {
          setSelectedAlerta(null);
          setNotas('');
        }
      });
    }
  };

  const handleIgnorar = () => {
    if (selectedAlerta) {
      ignorarAlerta.mutate({ id: selectedAlerta.id, notas }, {
        onSuccess: () => {
          setSelectedAlerta(null);
          setNotas('');
        }
      });
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas Contábeis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas Contábeis
            </span>
            {alertas && alertas.length > 0 && (
              <Badge variant="destructive">{alertas.length} pendentes</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alertas || alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <p className="text-muted-foreground">Nenhum alerta pendente!</p>
              <p className="text-sm text-muted-foreground">Tudo em dia com a contabilidade.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {alertas.map((alerta) => {
                  const config = prioridadeConfig[alerta.prioridade as keyof typeof prioridadeConfig] || prioridadeConfig.MEDIA;
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={alerta.id}
                      className={`p-3 rounded-lg border ${config.color} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => setSelectedAlerta(alerta)}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{alerta.titulo}</span>
                            <Badge variant="outline" className="text-xs">
                              {tipoLabels[alerta.tipo] || alerta.tipo}
                            </Badge>
                          </div>
                          {alerta.descricao && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{alerta.descricao}</p>
                          )}
                          {alerta.diferenca && (
                            <p className="text-xs font-medium mt-1">
                              Diferença: {formatCurrency(alerta.diferenca)}
                            </p>
                          )}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAlerta} onOpenChange={(open) => !open && setSelectedAlerta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {selectedAlerta?.titulo}
            </DialogTitle>
            <DialogDescription>
              {selectedAlerta?.descricao}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{tipoLabels[selectedAlerta?.tipo || ''] || selectedAlerta?.tipo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade:</span>
                <p className="font-medium">{selectedAlerta?.prioridade}</p>
              </div>
              {selectedAlerta?.valor_esperado && (
                <div>
                  <span className="text-muted-foreground">Valor Esperado:</span>
                  <p className="font-medium">{formatCurrency(selectedAlerta.valor_esperado)}</p>
                </div>
              )}
              {selectedAlerta?.valor_encontrado && (
                <div>
                  <span className="text-muted-foreground">Valor Encontrado:</span>
                  <p className="font-medium">{formatCurrency(selectedAlerta.valor_encontrado)}</p>
                </div>
              )}
              {selectedAlerta?.diferenca && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Diferença:</span>
                  <p className="font-medium text-red-500">{formatCurrency(selectedAlerta.diferenca)}</p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Notas de Resolução</label>
              <Textarea 
                placeholder="Descreva como o alerta foi resolvido..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleIgnorar} disabled={ignorarAlerta.isPending}>
              <X className="h-4 w-4 mr-2" />
              Ignorar
            </Button>
            <Button onClick={handleResolver} disabled={resolverAlerta.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
