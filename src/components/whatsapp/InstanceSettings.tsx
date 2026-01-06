import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, QrCode, Trash2, RefreshCw, Loader2, Wifi, WifiOff, LogOut, Wrench, Download, List, Check, Settings, Eye, EyeOff, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhatsAppInstances, type WhatsAppInstance } from '@/hooks/useWhatsAppInstances';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EvolutionInstance {
  instanceName: string;
  instanceId: string;
  status: string;
  ownerJid: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
  isImported: boolean;
}

interface InstanceSettingsProps {
  onInstanceSelect: (instance: WhatsAppInstance | null) => void;
  selectedInstance: WhatsAppInstance | null;
}

// Storage key for Evolution API config
const EVOLUTION_CONFIG_KEY = 'evolution_api_config';

interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
}

function getStoredConfig(): EvolutionConfig | null {
  try {
    const stored = localStorage.getItem(EVOLUTION_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredConfig(config: EvolutionConfig) {
  localStorage.setItem(EVOLUTION_CONFIG_KEY, JSON.stringify(config));
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

  // Evolution API config state
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Existing states
  const [isResolvingLids, setIsResolvingLids] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [evolutionInstances, setEvolutionInstances] = useState<EvolutionInstance[]>([]);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  const [importingInstance, setImportingInstance] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceSlug, setNewInstanceSlug] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [activeInstance, setActiveInstance] = useState<WhatsAppInstance | null>(null);

  // Load stored config on mount
  useEffect(() => {
    const stored = getStoredConfig();
    if (stored) {
      setEvolutionApiUrl(stored.apiUrl);
      setEvolutionApiKey(stored.apiKey);
      setIsConfigured(true);
    }
  }, []);

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

  const handleTestAndConnect = async () => {
    if (!evolutionApiUrl.trim() || !evolutionApiKey.trim()) {
      toast.error('Preencha a URL e a API Key');
      return;
    }

    setIsTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { 
          action: 'list-all',
          evolutionApiUrl: evolutionApiUrl.trim(),
          evolutionApiKey: evolutionApiKey.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save config
      setStoredConfig({ apiUrl: evolutionApiUrl.trim(), apiKey: evolutionApiKey.trim() });
      setIsConfigured(true);
      setEvolutionInstances(data.instances || []);
      toast.success('Conexão estabelecida com sucesso!');
    } catch (err) {
      console.error('Error connecting to Evolution API:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar';
      toast.error(errorMessage.includes('401') ? 'API Key inválida' : errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleResetConfig = () => {
    localStorage.removeItem(EVOLUTION_CONFIG_KEY);
    setEvolutionApiUrl('');
    setEvolutionApiKey('');
    setIsConfigured(false);
    setEvolutionInstances([]);
  };

  const handleRefreshInstances = async () => {
    const config = getStoredConfig();
    if (!config) return;

    setIsLoadingEvolution(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { 
          action: 'list-all',
          evolutionApiUrl: config.apiUrl,
          evolutionApiKey: config.apiKey,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setEvolutionInstances(data.instances || []);
    } catch (err) {
      console.error('Error fetching Evolution instances:', err);
      toast.error('Erro ao buscar instâncias');
    } finally {
      setIsLoadingEvolution(false);
    }
  };

  const handleCreate = async () => {
    if (!newInstanceName.trim() || !newInstanceSlug.trim()) return;

    const config = getStoredConfig();
    if (!config) {
      toast.error('Configure a Evolution API primeiro');
      return;
    }

    try {
      const result = await createInstance.mutateAsync({
        name: newInstanceName.trim(),
        instanceName: newInstanceSlug.trim().toLowerCase().replace(/\s+/g, '-'),
        evolutionApiUrl: config.apiUrl,
        evolutionApiKey: config.apiKey,
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

      // Refresh list
      handleRefreshInstances();
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

  const handleResolveLids = async (instance: WhatsAppInstance) => {
    setIsResolvingLids(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-lid-jids', {
        body: { instanceName: instance.instance_name },
      });

      if (error) throw error;

      if (data?.resolved > 0) {
        toast.success(`${data.resolved} contato(s) resolvido(s) com sucesso!`);
      } else {
        toast.info('Nenhum contato @lid pendente encontrado.');
      }
    } catch (err) {
      console.error('Error resolving LIDs:', err);
      toast.error('Erro ao resolver contatos');
    } finally {
      setIsResolvingLids(false);
    }
  };

  const handleImportInstance = async (evolutionInstance: EvolutionInstance) => {
    if (evolutionInstance.isImported) {
      toast.info('Esta instância já foi importada');
      return;
    }

    const config = getStoredConfig();
    if (!config) {
      toast.error('Configure a Evolution API primeiro');
      return;
    }

    setImportingInstance(evolutionInstance.instanceName);
    try {
      const { data, error } = await supabase.functions.invoke('manage-evolution-instance', {
        body: { 
          action: 'import', 
          instanceName: evolutionInstance.instanceName,
          name: evolutionInstance.profileName || evolutionInstance.instanceName,
          evolutionApiUrl: config.apiUrl,
          evolutionApiKey: config.apiKey,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Instância importada com sucesso!');
      
      // Update local list
      setEvolutionInstances(prev => prev.map(i => 
        i.instanceName === evolutionInstance.instanceName 
          ? { ...i, isImported: true } 
          : i
      ));
    } catch (err) {
      console.error('Error importing instance:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao importar instância');
    } finally {
      setImportingInstance(null);
    }
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
      {/* Evolution API Configuration Card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Configuração Evolution API</CardTitle>
            </div>
            {isConfigured && (
              <Button variant="ghost" size="sm" onClick={handleResetConfig}>
                <Settings className="h-4 w-4 mr-1" />
                Alterar
              </Button>
            )}
          </div>
          <CardDescription>
            {isConfigured 
              ? 'API configurada. Selecione uma instância existente ou crie uma nova.'
              : 'Configure a conexão com sua Evolution API para gerenciar instâncias.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConfigured ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">URL da Evolution API</Label>
                <Input
                  id="api-url"
                  placeholder="https://sua-evolution-api.com"
                  value={evolutionApiUrl}
                  onChange={(e) => setEvolutionApiUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Sua API Key"
                    value={evolutionApiKey}
                    onChange={(e) => setEvolutionApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleTestAndConnect}
                disabled={!evolutionApiUrl.trim() || !evolutionApiKey.trim() || isTestingConnection}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Server className="h-4 w-4 mr-2" />
                    Conectar e Buscar Instâncias
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRefreshInstances}
                  disabled={isLoadingEvolution}
                  className="flex-1"
                >
                  {isLoadingEvolution ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar Lista
                </Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="flex-1">
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
              </div>

              {/* Evolution Instances List */}
              {evolutionInstances.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Instâncias disponíveis na Evolution API:</Label>
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {evolutionInstances.map((instance) => (
                        <div
                          key={instance.instanceName}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border',
                            instance.isImported ? 'bg-muted/50' : 'hover:bg-muted/30'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'h-10 w-10 rounded-full flex items-center justify-center overflow-hidden',
                              instance.status === 'open'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                : 'bg-amber-100 dark:bg-amber-900/30'
                            )}>
                              {instance.profilePicUrl ? (
                                <img 
                                  src={instance.profilePicUrl} 
                                  alt="" 
                                  className="h-full w-full object-cover"
                                />
                              ) : instance.status === 'open' ? (
                                <Wifi className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <WifiOff className="h-5 w-5 text-amber-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{instance.profileName || instance.instanceName}</p>
                              <p className="text-xs text-muted-foreground">
                                {instance.instanceName}
                                {instance.ownerJid && ` • ${instance.ownerJid.replace('@s.whatsapp.net', '')}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={instance.status === 'open' ? 'default' : 'secondary'}>
                              {instance.status === 'open' ? 'Online' : instance.status}
                            </Badge>
                            {instance.isImported ? (
                              <Button variant="ghost" size="sm" disabled>
                                <Check className="h-4 w-4 mr-1" />
                                Vinculado
                              </Button>
                            ) : (
                              <Button 
                                size="sm"
                                onClick={() => handleImportInstance(instance)}
                                disabled={importingInstance === instance.instanceName}
                              >
                                {importingInstance === instance.instanceName ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Download className="h-4 w-4 mr-1" />
                                    Vincular
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {evolutionInstances.length === 0 && (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <p>Nenhuma instância encontrada</p>
                  <p className="text-sm">Clique em "Nova Instância" para criar uma</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Instances Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Instâncias Vinculadas</CardTitle>
            <CardDescription>Conexões WhatsApp vinculadas ao sistema</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma instância vinculada</p>
              <p className="text-sm">Configure a Evolution API acima e vincule uma instância</p>
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
                        handleResolveLids(instance);
                      }}
                      disabled={isResolvingLids}
                      title="Resolver contatos @lid"
                    >
                      <Wrench className={cn('h-4 w-4', isResolvingLids && 'animate-spin')} />
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
