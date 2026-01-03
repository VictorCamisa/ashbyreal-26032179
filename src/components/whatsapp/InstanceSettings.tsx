import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, QrCode, Trash2, RefreshCw, Loader2, Wifi, WifiOff, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';

interface InstanceSettingsProps {
  onInstanceSelect: (instance: WhatsAppInstance | null) => void;
  selectedInstance: WhatsAppInstance | null;
}

export function InstanceSettings({ onInstanceSelect, selectedInstance }: InstanceSettingsProps) {
  const {
    instances,
    isLoading,
    createInstance,
    deleteInstance,
    getQRCode,
    checkConnection,
    logout,
  } = useWhatsAppInstances();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceSlug, setNewInstanceSlug] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [activeInstance, setActiveInstance] = useState<WhatsAppInstance | null>(null);

  // Auto-select first instance
  useEffect(() => {
    if (!selectedInstance && instances.length > 0) {
      onInstanceSelect(instances[0]);
    }
  }, [instances, selectedInstance, onInstanceSelect]);

  // Poll connection status when QR dialog is open
  useEffect(() => {
    if (!showQRDialog || !activeInstance) return;

    const interval = setInterval(async () => {
      const result = await checkConnection.mutateAsync(activeInstance.instance_name);
      if (result?.isConnected) {
        setShowQRDialog(false);
        setQrCode(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [showQRDialog, activeInstance]);

  const handleCreate = async () => {
    if (!newInstanceName.trim() || !newInstanceSlug.trim()) return;

    try {
      const result = await createInstance.mutateAsync({
        name: newInstanceName.trim(),
        instanceName: newInstanceSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      });

      setShowCreateDialog(false);
      setNewInstanceName('');
      setNewInstanceSlug('');

      if (result?.qrCode) {
        setQrCode(result.qrCode);
        setPairingCode(result.pairingCode || null);
        setActiveInstance(result.instance);
        setShowQRDialog(true);
      }
    } catch (error) {
      console.error('Error creating instance:', error);
    }
  };

  const handleGetQRCode = async (instance: WhatsAppInstance) => {
    setActiveInstance(instance);
    const result = await getQRCode.mutateAsync(instance.instance_name);
    if (result?.qrCode) {
      setQrCode(result.qrCode);
      setPairingCode(result.pairingCode || null);
      setShowQRDialog(true);
    }
  };

  const handleDelete = async (instance: WhatsAppInstance) => {
    if (!confirm(`Deseja realmente remover a instância "${instance.name}"?`)) return;
    await deleteInstance.mutateAsync(instance.instance_name);
    if (selectedInstance?.id === instance.id) {
      onInstanceSelect(null);
    }
  };

  const handleLogout = async (instance: WhatsAppInstance) => {
    if (!confirm(`Deseja desconectar o WhatsApp da instância "${instance.name}"?`)) return;
    await logout.mutateAsync(instance.instance_name);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Instâncias WhatsApp</CardTitle>
            <CardDescription>Gerencie suas conexões do WhatsApp</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
                <DialogDescription>
                  Configure uma nova conexão WhatsApp
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Instância</Label>
                  <Input
                    id="name"
                    placeholder="Ex: WhatsApp Principal"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Identificador Único</Label>
                  <Input
                    id="slug"
                    placeholder="Ex: whatsapp-principal"
                    value={newInstanceSlug}
                    onChange={(e) => setNewInstanceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use apenas letras minúsculas, números e hífens
                  </p>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newInstanceName.trim() || !newInstanceSlug.trim() || createInstance.isPending}
                  className="w-full"
                >
                  {createInstance.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar e Conectar'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma instância configurada</p>
              <p className="text-sm">Clique em "Nova Instância" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer',
                    selectedInstance?.id === instance.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => onInstanceSelect(instance)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      instance.status === 'connected'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-rose-100 dark:bg-rose-900/30'
                    )}>
                      {instance.status === 'connected' ? (
                        <Wifi className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{instance.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {instance.phone_number
                          ? `+${instance.phone_number}`
                          : instance.instance_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                      {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                    </Badge>
                    {instance.status === 'connected' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogout(instance);
                        }}
                        title="Desconectar"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetQRCode(instance);
                        }}
                        title="Conectar"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        checkConnection.mutate(instance.instance_name);
                      }}
                      title="Atualizar status"
                    >
                      <RefreshCw className={cn('h-4 w-4', checkConnection.isPending && 'animate-spin')} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(instance);
                      }}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com seu WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrCode ? (
              <>
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                {pairingCode && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">Ou use o código:</p>
                    <p className="text-2xl font-mono font-bold tracking-widest mt-1">
                      {pairingCode}
                    </p>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Abra o WhatsApp no seu celular, vá em Configurações &gt; Aparelhos Conectados &gt; Conectar
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground mt-2">Carregando QR Code...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
