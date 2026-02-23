import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Contact,
  Users,
  MessageCircle,
  Search,
  RefreshCw,
  UserPlus,
  Phone,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Download,
  Smartphone,
  Plus,
  Server,
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  Wifi,
  WifiOff,
  Megaphone,
} from 'lucide-react';
import { useExtractLeads, ExtractedLead, GroupInfo } from '@/hooks/useExtractLeads';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';

// Storage key for Evolution API config
const EVOLUTION_CONFIG_KEY = 'evolution_api_config';

function getStoredConfig() {
  try {
    const stored = localStorage.getItem(EVOLUTION_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function setStoredConfig(config: { apiUrl: string; apiKey: string }) {
  localStorage.setItem(EVOLUTION_CONFIG_KEY, JSON.stringify(config));
}

type ActiveTab = 'contatos' | 'grupos' | 'conversas';

export default function Marketing() {
  const {
    connectedInstances,
    selectedInstance,
    setSelectedInstance,
    fetchChats,
    fetchGroups,
    fetchGroupMembers,
    fetchContacts,
    importLeads,
    isLoading,
  } = useExtractLeads();

  const { instances, createInstance, getQRCode, checkConnection } = useWhatsAppInstances();

  const [activeTab, setActiveTab] = useState<ActiveTab>('contatos');
  const [leads, setLeads] = useState<ExtractedLead[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(true);
  const [stats, setStats] = useState({ total: 0, new: 0, existing: 0 });

  // Instance management states
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceSlug, setNewInstanceSlug] = useState('');
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Check if Evolution API is configured
  const isEvolutionConfigured = !!getStoredConfig();

  // All instances (connected or not)
  const allInstances = instances;

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
      setStoredConfig({ apiUrl: evolutionApiUrl.trim(), apiKey: evolutionApiKey.trim() });
      setShowConfigDialog(false);
      toast.success('Evolution API configurada com sucesso!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar';
      toast.error(msg.includes('401') ? 'API Key inválida' : msg);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleCreateInstance = async () => {
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
        setShowQRDialog(true);
      }
    } catch (error) {
      console.error('Error creating instance:', error);
    }
  };

  const handleGetQR = async (instanceName: string) => {
    const result = await getQRCode.mutateAsync(instanceName);
    if (result?.qrCode) {
      setQrCode(result.qrCode);
      setPairingCode(result.pairingCode || null);
      setShowQRDialog(true);
    }
  };

  // Data fetching
  const handleFetch = async () => {
    if (!selectedInstance) return;
    setLeads([]);
    setGroups([]);
    setSelectedGroup(null);

    if (activeTab === 'contatos') {
      const result = await fetchContacts.mutateAsync(selectedInstance);
      if (result) {
        setLeads(result.leads.map(l => ({ ...l, selected: !l.isExistingClient })));
        setStats(result.stats);
      }
    } else if (activeTab === 'grupos') {
      const result = await fetchGroups.mutateAsync(selectedInstance);
      if (result) setGroups(result.groups);
    } else {
      const result = await fetchChats.mutateAsync(selectedInstance);
      if (result) {
        setLeads(result.leads.map(l => ({ ...l, selected: !l.isExistingClient })));
        setStats(result.stats);
      }
    }
  };

  const handleFetchGroupMembers = async (group: GroupInfo) => {
    if (!selectedInstance) return;
    setSelectedGroup(group);
    setLeads([]);
    const result = await fetchGroupMembers.mutateAsync({
      instanceName: selectedInstance,
      groupId: group.id,
    });
    if (result) {
      setLeads(result.leads.map(l => ({ ...l, selected: !l.isExistingClient })));
      setStats(result.stats);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
    setLeads([]);
    setGroups([]);
    setSelectedGroup(null);
    setSearchTerm('');
    setStats({ total: 0, new: 0, existing: 0 });
  };

  const toggleLeadSelection = (leadId: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, selected: !l.selected } : l));
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (showOnlyNew) result = result.filter(l => !l.isExistingClient);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(term) || l.phone.includes(term));
    }
    return result;
  }, [leads, showOnlyNew, searchTerm]);

  const selectedCount = leads.filter(l => l.selected && !l.isExistingClient).length;

  const toggleSelectAll = () => {
    const newLeads = filteredLeads.filter(l => !l.isExistingClient);
    const allSelected = newLeads.every(l => l.selected);
    setLeads(prev =>
      prev.map(l => {
        if (l.isExistingClient) return l;
        const isInFiltered = filteredLeads.some(fl => fl.id === l.id);
        return isInFiltered ? { ...l, selected: !allSelected } : l;
      })
    );
  };

  const handleImport = async () => {
    const selectedLeads = leads.filter(l => l.selected && !l.isExistingClient);
    if (selectedLeads.length === 0) return;
    await importLeads.mutateAsync(selectedLeads);
    setLeads(prev => prev.map(l => l.selected ? { ...l, isExistingClient: true, selected: false } : l));
    setStats(prev => ({
      ...prev,
      new: prev.new - selectedLeads.length,
      existing: prev.existing + selectedLeads.length,
    }));
  };

  const handleExportCSV = () => {
    const data = filteredLeads.length > 0 ? filteredLeads : leads;
    if (data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    const csv = [
      'Nome,Telefone,Origem,Grupo,Já Cadastrado',
      ...data.map(l =>
        `"${l.name}","${l.phone}","${l.source}","${l.groupName || ''}","${l.isExistingClient ? 'Sim' : 'Não'}"`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        subtitle="Exporte contatos, extraia membros de grupos e exporte conversas do WhatsApp"
      />

      {/* Instance Management Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Instância WhatsApp</CardTitle>
            </div>
            <div className="flex gap-2">
              {!isEvolutionConfigured ? (
                <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-2">
                      <Server className="h-4 w-4" />
                      Configurar API
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configurar Evolution API</DialogTitle>
                      <DialogDescription>Conecte sua Evolution API para gerenciar instâncias WhatsApp</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>URL da Evolution API</Label>
                        <Input placeholder="https://sua-evolution-api.com" value={evolutionApiUrl} onChange={e => setEvolutionApiUrl(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="relative">
                          <Input type={showApiKey ? 'text' : 'password'} placeholder="Sua API Key" value={evolutionApiKey} onChange={e => setEvolutionApiKey(e.target.value)} className="pr-10" />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowApiKey(!showApiKey)}>
                            {showApiKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                      <Button onClick={handleTestAndConnect} disabled={!evolutionApiUrl.trim() || !evolutionApiKey.trim() || isTestingConnection} className="w-full">
                        {isTestingConnection ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Conectando...</> : <><Server className="h-4 w-4 mr-2" />Conectar</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Instância
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Instância</DialogTitle>
                      <DialogDescription>Configure uma nova conexão WhatsApp</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Instância</Label>
                        <Input placeholder="Ex: WhatsApp Marketing" value={newInstanceName} onChange={e => setNewInstanceName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Identificador Único</Label>
                        <Input placeholder="Ex: whatsapp-marketing" value={newInstanceSlug} onChange={e => setNewInstanceSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                        <p className="text-xs text-muted-foreground">Use apenas letras minúsculas, números e hífens</p>
                      </div>
                      <Button onClick={handleCreateInstance} disabled={!newInstanceName.trim() || !newInstanceSlug.trim() || createInstance.isPending} className="w-full">
                        {createInstance.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</> : <><Plus className="h-4 w-4 mr-2" />Criar Instância</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allInstances.length === 0 ? (
            <div className="py-6 text-center">
              <Smartphone className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma instância encontrada.</p>
              <p className="text-xs text-muted-foreground mt-1">{isEvolutionConfigured ? 'Crie uma nova instância para começar.' : 'Configure a Evolution API primeiro.'}</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedInstance || ''} onValueChange={setSelectedInstance}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {allInstances.map(instance => (
                    <SelectItem key={instance.id} value={instance.instance_name}>
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full", instance.status === 'connected' ? 'bg-emerald-500' : 'bg-muted-foreground/40')} />
                        <span>{instance.name}</span>
                        {instance.phone_number && <span className="text-muted-foreground text-xs">({instance.phone_number})</span>}
                        {instance.status !== 'connected' && <Badge variant="outline" className="text-[10px] ml-1">Offline</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInstance && allInstances.find(i => i.instance_name === selectedInstance)?.status !== 'connected' && (
                <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => handleGetQR(selectedInstance)}>
                  <QrCode className="h-4 w-4" />
                  Conectar
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear QR Code</DialogTitle>
            <DialogDescription>Abra o WhatsApp no celular e escaneie o código</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCode ? (
              <img src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} alt="QR Code" className="w-64 h-64 rounded-lg" />
            ) : (
              <Skeleton className="w-64 h-64 rounded-lg" />
            )}
            {pairingCode && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ou use o código:</p>
                <p className="text-2xl font-mono font-bold tracking-widest mt-1">{pairingCode}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="contatos" className="gap-2">
                <Contact className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span> Contatos
              </TabsTrigger>
              <TabsTrigger value="grupos" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Extrair</span> Grupos
              </TabsTrigger>
              <TabsTrigger value="conversas" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span> Conversas
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleFetch}
                  disabled={!selectedInstance || isLoading}
                  variant={(leads.length > 0 || groups.length > 0) ? 'outline' : 'default'}
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                  {(leads.length > 0 || groups.length > 0) ? 'Atualizar' : 'Buscar'}
                </Button>

                {leads.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                )}
              </div>

              {leads.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Novos:</span>
                    <span className="font-medium">{stats.new}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-muted-foreground">Existentes:</span>
                    <span className="font-medium">{stats.existing}</span>
                  </div>
                </div>
              )}

              {activeTab === 'grupos' && !selectedGroup && groups.length > 0 && (
                <span className="text-sm text-muted-foreground">{groups.length} grupo(s)</span>
              )}
            </div>

            {/* Filters */}
            {(leads.length > 0 || selectedGroup) && (
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome ou telefone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                </div>
                <Button variant={showOnlyNew ? 'default' : 'outline'} size="sm" onClick={() => setShowOnlyNew(!showOnlyNew)} className="gap-2 shrink-0">
                  <UserPlus className="h-4 w-4" />
                  Apenas novos
                </Button>
              </div>
            )}

            {/* Content per tab */}
            <TabsContent value="contatos" className="mt-0">
              {renderLeadsList()}
            </TabsContent>
            <TabsContent value="grupos" className="mt-0">
              {activeTab === 'grupos' && renderGroupsContent()}
            </TabsContent>
            <TabsContent value="conversas" className="mt-0">
              {renderLeadsList()}
            </TabsContent>

            {/* Select All + Import */}
            {filteredLeads.filter(l => !l.isExistingClient).length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={filteredLeads.filter(l => !l.isExistingClient).every(l => l.selected)}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                    Selecionar todos os novos ({filteredLeads.filter(l => !l.isExistingClient).length})
                  </label>
                </div>
                <Button onClick={handleImport} disabled={selectedCount === 0 || importLeads.isPending} size="sm" className="gap-2">
                  {importLeads.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Importar {selectedCount > 0 ? `(${selectedCount})` : ''}
                </Button>
              </div>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );

  function renderLeadsList() {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (filteredLeads.length === 0) {
      return (
        <div className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {leads.length === 0 ? 'Selecione uma instância e clique em "Buscar"' : 'Nenhum resultado encontrado'}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-3">
          {filteredLeads.map(lead => (
            <div
              key={lead.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                lead.isExistingClient
                  ? "bg-muted/30 opacity-60"
                  : lead.selected
                    ? "bg-primary/5 border-primary/30"
                    : "hover:bg-muted/50"
              )}
            >
              {!lead.isExistingClient && (
                <Checkbox checked={lead.selected} onCheckedChange={() => toggleLeadSelection(lead.id)} />
              )}
              {lead.isExistingClient && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}

              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-medium shrink-0">
                {lead.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{lead.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{lead.phone}</span>
                  {lead.lastInteraction && (
                    <>
                      <span>•</span>
                      <span>{format(new Date(lead.lastInteraction), "dd/MM/yy", { locale: ptBR })}</span>
                    </>
                  )}
                </div>
              </div>

              {lead.isExistingClient && <Badge variant="secondary" className="text-xs shrink-0">Já cadastrado</Badge>}
              {lead.source === 'group' && lead.groupName && !lead.isExistingClient && (
                <Badge variant="outline" className="text-xs shrink-0">{lead.groupName}</Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  function renderGroupsContent() {
    if (isLoading && !selectedGroup) {
      return (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedGroup) {
      return (
        <div className="space-y-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedGroup(null); setLeads([]); }} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar aos grupos
          </Button>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedGroup.name}</p>
              <p className="text-xs text-muted-foreground">{selectedGroup.participantsCount} participantes</p>
            </div>
          </div>
          {renderLeadsList()}
        </div>
      );
    }

    if (groups.length === 0) {
      return (
        <div className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Selecione uma instância e clique em "Buscar" para listar grupos</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-3">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => handleFetchGroupMembers(group)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.participantsCount} participantes</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  }
}
