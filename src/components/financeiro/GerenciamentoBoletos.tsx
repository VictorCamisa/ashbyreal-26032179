import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Receipt,
  FileText,
  Check,
  X,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBoletos, Boleto } from '@/hooks/useBoletos';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDENTE: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  APROVADO: { label: 'Aprovado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Check },
  PAGO: { label: 'Pago', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  REJEITADO: { label: 'Rejeitado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
  CANCELADO: { label: 'Cancelado', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: Ban },
};

export function GerenciamentoBoletos() {
  const [activeTab, setActiveTab] = useState('pendentes');
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [showImage, setShowImage] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; boleto: Boleto } | null>(null);

  const { boletos, isLoading, aprovarBoleto, pagarBoleto, rejeitarBoleto, cancelarBoleto } = useBoletos();

  const pendentes = boletos?.filter(b => b.status === 'PENDENTE') || [];
  const aprovados = boletos?.filter(b => b.status === 'APROVADO') || [];
  const pagos = boletos?.filter(b => b.status === 'PAGO') || [];
  const outros = boletos?.filter(b => ['REJEITADO', 'CANCELADO'].includes(b.status)) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    switch (confirmAction.type) {
      case 'aprovar':
        aprovarBoleto(confirmAction.boleto.id);
        break;
      case 'pagar':
        pagarBoleto(confirmAction.boleto.id);
        break;
      case 'rejeitar':
        rejeitarBoleto(confirmAction.boleto.id);
        break;
      case 'cancelar':
        cancelarBoleto(confirmAction.boleto.id);
        break;
    }
    setConfirmAction(null);
  };

  const renderBoletoCard = (boleto: Boleto) => {
    const statusInfo = statusConfig[boleto.status];
    const StatusIcon = statusInfo.icon;

    return (
      <Card key={boleto.id} className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {boleto.tipo_nota === 'COM_NOTA' ? (
                  <FileText className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <Receipt className="h-4 w-4 text-orange-600 shrink-0" />
                )}
                <span className="font-medium truncate">
                  {boleto.beneficiario || boleto.description || 'Boleto'}
                </span>
                <Badge variant="outline" className={statusInfo.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="text-xs">Valor:</span>
                  <p className="font-semibold text-foreground">{formatCurrency(boleto.amount)}</p>
                </div>
                <div>
                  <span className="text-xs">Vencimento:</span>
                  <p className="font-medium text-foreground">
                    {format(new Date(boleto.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              {boleto.entities && (
                <p className="text-xs text-muted-foreground mt-2">
                  Entidade: {boleto.entities.name}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                Cadastrado: {format(new Date(boleto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {boleto.image_base64 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedBoleto(boleto);
                    setShowImage(true);
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              )}

              {boleto.status === 'PENDENTE' && (
                <>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => setConfirmAction({ type: 'aprovar', boleto })}
                  >
                    <Check className="h-3 w-3" />
                    Aprovar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    onClick={() => setConfirmAction({ type: 'rejeitar', boleto })}
                  >
                    <X className="h-3 w-3" />
                    Rejeitar
                  </Button>
                </>
              )}

              {boleto.status === 'APROVADO' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => setConfirmAction({ type: 'pagar', boleto })}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Pagar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setConfirmAction({ type: 'cancelar', boleto })}
                  >
                    <Ban className="h-3 w-3" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBoletoList = (list: Boleto[], emptyMessage: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map(renderBoletoCard)}
      </div>
    );
  };

  const totalPendente = pendentes.reduce((sum, b) => sum + b.amount, 0);
  const totalAprovado = aprovados.reduce((sum, b) => sum + b.amount, 0);
  const totalPago = pagos.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p>
                <p className="text-xs text-muted-foreground">{pendentes.length} boletos</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprovados (A Pagar)</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAprovado)}</p>
                <p className="text-xs text-muted-foreground">{aprovados.length} boletos</p>
              </div>
              <Check className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagos (Este Mês)</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPago)}</p>
                <p className="text-xs text-muted-foreground">{pagos.length} boletos</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pendentes" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="aprovados" className="gap-2">
            <Check className="h-4 w-4" />
            A Pagar ({aprovados.length})
          </TabsTrigger>
          <TabsTrigger value="pagos" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Pagos ({pagos.length})
          </TabsTrigger>
          <TabsTrigger value="outros" className="gap-2">
            <XCircle className="h-4 w-4" />
            Outros ({outros.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          {renderBoletoList(pendentes, 'Nenhum boleto pendente de aprovação')}
        </TabsContent>

        <TabsContent value="aprovados" className="mt-4">
          {renderBoletoList(aprovados, 'Nenhum boleto aprovado aguardando pagamento')}
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          {renderBoletoList(pagos, 'Nenhum boleto pago')}
        </TabsContent>

        <TabsContent value="outros" className="mt-4">
          {renderBoletoList(outros, 'Nenhum boleto rejeitado ou cancelado')}
        </TabsContent>
      </Tabs>

      {/* Image Preview Dialog */}
      <Dialog open={showImage} onOpenChange={setShowImage}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Imagem do Boleto</DialogTitle>
          </DialogHeader>
          {selectedBoleto?.image_base64 && (
            <img
              src={selectedBoleto.image_base64}
              alt="Boleto"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'aprovar' && 'Aprovar Boleto'}
              {confirmAction?.type === 'pagar' && 'Confirmar Pagamento'}
              {confirmAction?.type === 'rejeitar' && 'Rejeitar Boleto'}
              {confirmAction?.type === 'cancelar' && 'Cancelar Boleto'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'aprovar' && 
                `Ao aprovar, será criada uma transação de despesa no valor de ${confirmAction?.boleto ? formatCurrency(confirmAction.boleto.amount) : ''}.`}
              {confirmAction?.type === 'pagar' && 
                `Confirma o pagamento do boleto no valor de ${confirmAction?.boleto ? formatCurrency(confirmAction.boleto.amount) : ''}?`}
              {confirmAction?.type === 'rejeitar' && 
                'O boleto será marcado como rejeitado e não será criada nenhuma transação.'}
              {confirmAction?.type === 'cancelar' && 
                'O boleto e a transação vinculada serão cancelados.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
