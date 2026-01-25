import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  FileText, 
  Package, 
  Receipt,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Pendencia {
  id: string;
  tipo: 'boleto_sem_nf' | 'pedido_sem_nf' | 'divergencia';
  referencia: string;
  valor: number;
  data: string;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
}

interface PendenciasDetalhadasProps {
  pendencias: Pendencia[];
  isLoading?: boolean;
  onResolverPendencia?: (pendencia: Pendencia) => void;
}

export function PendenciasDetalhadas({ 
  pendencias, 
  isLoading,
  onResolverPendencia 
}: PendenciasDetalhadasProps) {
  const [activeTab, setActiveTab] = useState('todas');

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pendências Fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  // Agrupar por tipo
  const boletosSeNF = pendencias.filter(p => p.tipo === 'boleto_sem_nf');
  const pedidosSemNF = pendencias.filter(p => p.tipo === 'pedido_sem_nf');
  const divergencias = pendencias.filter(p => p.tipo === 'divergencia');
  const criticas = pendencias.filter(p => p.prioridade === 'alta');

  // Resumo por categoria
  const resumo = [
    { 
      label: 'Boletos sem NF', 
      count: boletosSeNF.length, 
      total: boletosSeNF.reduce((acc, p) => acc + p.valor, 0),
      icon: Receipt,
      color: 'text-red-600'
    },
    { 
      label: 'Pedidos sem NF', 
      count: pedidosSemNF.length, 
      total: pedidosSemNF.reduce((acc, p) => acc + p.valor, 0),
      icon: Package,
      color: 'text-amber-600'
    },
    { 
      label: 'Divergências', 
      count: divergencias.length, 
      total: divergencias.reduce((acc, p) => acc + p.valor, 0),
      icon: AlertTriangle,
      color: 'text-orange-600'
    }
  ];

  const getFilteredPendencias = () => {
    switch (activeTab) {
      case 'criticas': return criticas;
      case 'boletos': return boletosSeNF;
      case 'pedidos': return pedidosSemNF;
      case 'divergencias': return divergencias;
      default: return pendencias;
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    switch (prioridade) {
      case 'alta': return <Badge variant="destructive">Alta</Badge>;
      case 'media': return <Badge variant="secondary">Média</Badge>;
      case 'baixa': return <Badge variant="outline">Baixa</Badge>;
      default: return null;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'boleto_sem_nf': return <Receipt className="h-4 w-4 text-red-600" />;
      case 'pedido_sem_nf': return <Package className="h-4 w-4 text-amber-600" />;
      case 'divergencia': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Pendências Fiscais Detalhadas
          </CardTitle>
          <Badge variant={pendencias.length === 0 ? 'default' : 'destructive'}>
            {pendencias.length} pendência{pendencias.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo por Categoria */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          {resumo.map((item, idx) => (
            <div key={idx} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <div className={`text-lg font-bold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-muted-foreground">{formatCurrency(item.total)}</div>
            </div>
          ))}
        </div>

        {/* Alertas Críticos */}
        {criticas.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              {criticas.length} alerta{criticas.length !== 1 ? 's' : ''} crítico{criticas.length !== 1 ? 's' : ''} - 
              Total: {formatCurrency(criticas.reduce((acc, p) => acc + p.valor, 0))}
            </div>
          </div>
        )}

        {/* Tabs de Filtro */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="todas">Todas ({pendencias.length})</TabsTrigger>
            <TabsTrigger value="criticas">Críticas ({criticas.length})</TabsTrigger>
            <TabsTrigger value="boletos">Boletos ({boletosSeNF.length})</TabsTrigger>
            <TabsTrigger value="pedidos">Pedidos ({pedidosSemNF.length})</TabsTrigger>
            <TabsTrigger value="divergencias">Diverg. ({divergencias.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {getFilteredPendencias().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                <p>Nenhuma pendência nesta categoria</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getFilteredPendencias().map((pendencia) => (
                  <div 
                    key={pendencia.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getTipoIcon(pendencia.tipo)}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {pendencia.referencia}
                          {getPrioridadeBadge(pendencia.prioridade)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {pendencia.descricao} • {formatDate(pendencia.data)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatCurrency(pendencia.valor)}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onResolverPendencia?.(pendencia)}
                      >
                        Resolver
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
