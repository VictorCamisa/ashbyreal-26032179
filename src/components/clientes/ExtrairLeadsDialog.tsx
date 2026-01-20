import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageCircle,
  Users,
  Contact,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Phone,
  RefreshCw,
  UserPlus,
  Smartphone,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { useExtractLeads, ExtractedLead, GroupInfo } from '@/hooks/useExtractLeads';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExtrairLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExtractSource = 'chats' | 'groups' | 'contacts';

export function ExtrairLeadsDialog({ open, onOpenChange }: ExtrairLeadsDialogProps) {
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

  const [activeTab, setActiveTab] = useState<ExtractSource>('chats');
  const [leads, setLeads] = useState<ExtractedLead[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNew, setShowOnlyNew] = useState(true);
  const [stats, setStats] = useState({ total: 0, new: 0, existing: 0 });

  const handleFetchChats = async () => {
    if (!selectedInstance) return;
    setLeads([]);
    setSelectedGroup(null);
    
    const result = await fetchChats.mutateAsync(selectedInstance);
    if (result) {
      setLeads(result.leads.map(l => ({ ...l, selected: !l.isExistingClient })));
      setStats(result.stats);
    }
  };

  const handleFetchGroups = async () => {
    if (!selectedInstance) return;
    setGroups([]);
    setLeads([]);
    setSelectedGroup(null);
    
    const result = await fetchGroups.mutateAsync(selectedInstance);
    if (result) {
      setGroups(result.groups);
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

  const handleFetchContacts = async () => {
    if (!selectedInstance) return;
    setLeads([]);
    setSelectedGroup(null);
    
    const result = await fetchContacts.mutateAsync(selectedInstance);
    if (result) {
      setLeads(result.leads.map(l => ({ ...l, selected: !l.isExistingClient })));
      setStats(result.stats);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ExtractSource);
    setLeads([]);
    setGroups([]);
    setSelectedGroup(null);
    setSearchTerm('');
    setStats({ total: 0, new: 0, existing: 0 });
  };

  const toggleLeadSelection = (leadId: string) => {
    setLeads(prev => 
      prev.map(l => l.id === leadId ? { ...l, selected: !l.selected } : l)
    );
  };

  const toggleSelectAll = () => {
    const newLeadsFiltered = filteredLeads.filter(l => !l.isExistingClient);
    const allSelected = newLeadsFiltered.every(l => l.selected);
    
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
    
    // Update UI to reflect imported leads
    setLeads(prev => 
      prev.map(l => l.selected ? { ...l, isExistingClient: true, selected: false } : l)
    );
    setStats(prev => ({
      ...prev,
      new: prev.new - selectedLeads.length,
      existing: prev.existing + selectedLeads.length,
    }));
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    
    if (showOnlyNew) {
      result = result.filter(l => !l.isExistingClient);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(term) ||
        l.phone.includes(term)
      );
    }
    
    return result;
  }, [leads, showOnlyNew, searchTerm]);

  const selectedCount = leads.filter(l => l.selected && !l.isExistingClient).length;

  const renderInstanceSelector = () => (
    <div className="space-y-3">
      <label className="text-sm font-medium">Instância WhatsApp</label>
      {connectedInstances.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Smartphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma instância conectada.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Conecte uma instância do WhatsApp para extrair leads.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Select value={selectedInstance || ''} onValueChange={setSelectedInstance}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma instância" />
          </SelectTrigger>
          <SelectContent>
            {connectedInstances.map((instance) => (
              <SelectItem key={instance.id} value={instance.instance_name}>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{instance.name}</span>
                  {instance.phone_number && (
                    <span className="text-muted-foreground text-xs">
                      ({instance.phone_number})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const renderStats = () => (
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
  );

  const renderLeadsList = () => {
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
            {leads.length === 0 
              ? 'Clique em "Buscar" para extrair leads'
              : 'Nenhum lead encontrado'}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[300px]">
        <div className="space-y-1 pr-3">
          {filteredLeads.map((lead) => (
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
                <Checkbox
                  checked={lead.selected}
                  onCheckedChange={() => toggleLeadSelection(lead.id)}
                />
              )}
              {lead.isExistingClient && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-medium">
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
                      <span>
                        {format(new Date(lead.lastInteraction), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {lead.isExistingClient && (
                <Badge variant="secondary" className="text-xs">
                  Já cadastrado
                </Badge>
              )}
              {lead.source === 'group' && lead.groupName && !lead.isExistingClient && (
                <Badge variant="outline" className="text-xs">
                  {lead.groupName}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderGroupsList = () => {
    if (isLoading) {
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedGroup(null);
              setLeads([]);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos grupos
          </Button>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{selectedGroup.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedGroup.participantsCount} participantes
              </p>
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
          <p className="text-muted-foreground">
            Clique em "Buscar" para listar grupos
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[300px]">
        <div className="space-y-1 pr-3">
          {groups.map((group) => (
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
                <p className="text-xs text-muted-foreground">
                  {group.participantsCount} participantes
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderTabContent = () => {
    const hasData = activeTab === 'groups' ? groups.length > 0 || selectedGroup : leads.length > 0;
    
    return (
      <div className="space-y-4">
        {/* Fetch Button */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => {
              if (activeTab === 'chats') handleFetchChats();
              else if (activeTab === 'groups') handleFetchGroups();
              else handleFetchContacts();
            }}
            disabled={!selectedInstance || isLoading}
            variant={hasData ? "outline" : "default"}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            {hasData ? 'Atualizar' : 'Buscar'}
          </Button>

          {hasData && activeTab !== 'groups' && renderStats()}
          {hasData && activeTab === 'groups' && !selectedGroup && (
            <span className="text-sm text-muted-foreground">
              {groups.length} grupo(s) encontrado(s)
            </span>
          )}
          {selectedGroup && renderStats()}
        </div>

        {/* Filters */}
        {(leads.length > 0 || selectedGroup) && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              variant={showOnlyNew ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyNew(!showOnlyNew)}
              className="gap-2 shrink-0"
            >
              <UserPlus className="h-4 w-4" />
              Apenas novos
            </Button>
          </div>
        )}

        {/* Content */}
        {activeTab === 'groups' ? renderGroupsList() : renderLeadsList()}

        {/* Select All */}
        {filteredLeads.filter(l => !l.isExistingClient).length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Checkbox
              id="select-all"
              checked={filteredLeads.filter(l => !l.isExistingClient).every(l => l.selected)}
              onCheckedChange={toggleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Selecionar todos os novos ({filteredLeads.filter(l => !l.isExistingClient).length})
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Extrair Leads do WhatsApp
          </DialogTitle>
          <DialogDescription>
            Extraia contatos, conversas e membros de grupos para sua base de clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {renderInstanceSelector()}

          {selectedInstance && (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chats" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Conversas
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="h-4 w-4" />
                  Grupos
                </TabsTrigger>
                <TabsTrigger value="contacts" className="gap-2">
                  <Contact className="h-4 w-4" />
                  Contatos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chats" className="mt-4">
                {renderTabContent()}
              </TabsContent>
              <TabsContent value="groups" className="mt-4">
                {renderTabContent()}
              </TabsContent>
              <TabsContent value="contacts" className="mt-4">
                {renderTabContent()}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedCount === 0 || isLoading}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Importar {selectedCount > 0 ? `(${selectedCount})` : 'Selecionados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
