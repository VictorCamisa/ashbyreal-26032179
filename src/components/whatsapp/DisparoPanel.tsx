import { useState, useMemo, useEffect } from 'react';
import { 
  Send, Users, Filter, Clock, CheckCircle2, XCircle, Loader2, 
  ChevronLeft, Image, Mic, FileText, Eye, Settings2, Timer,
  AlertTriangle, BarChart3, RefreshCw, Zap, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useClientes } from '@/hooks/useClientes';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useCampanhas, useCampanhaEnvios } from '@/hooks/useCampanhas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DisparoPanelProps {
  onClose: () => void;
}

export function DisparoPanel({ onClose }: DisparoPanelProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState('novo');
  
  // Instance & clients
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [searchClientes, setSearchClientes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  
  // Message composition
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [mediaType, setMediaType] = useState<string>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  
  // Advanced settings
  const [delayBetweenMessages, setDelayBetweenMessages] = useState(2);
  const [randomizeDelay, setRandomizeDelay] = useState(true);
  const [minDelay, setMinDelay] = useState(1);
  const [maxDelay, setMaxDelay] = useState(3);
  const [sendInBatches, setSendInBatches] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [pauseBetweenBatches, setPauseBetweenBatches] = useState(5);
  
  // Dialog & campaign tracking
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { instances } = useWhatsAppInstances();
  const { campanhas, isLoading: loadingCampanhas, createCampanha, createEnvios, startDisparo } = useCampanhas();
  const { envios, stats } = useCampanhaEnvios(selectedCampanhaId);

  const connectedInstances = instances?.filter(i => i.status === 'connected') || [];
  const selectedInstance = connectedInstances.find(i => i.id === selectedInstanceId);

  // Auto-select first instance
  useEffect(() => {
    if (!selectedInstanceId && connectedInstances.length > 0) {
      setSelectedInstanceId(connectedInstances[0].id);
    }
  }, [connectedInstances, selectedInstanceId]);

  // Filter clients
  const filteredClientes = useMemo(() => {
    return (clientes || []).filter(cliente => {
      const matchesSearch = !searchClientes || 
        cliente.nome.toLowerCase().includes(searchClientes.toLowerCase()) ||
        cliente.telefone.includes(searchClientes);
      const matchesStatus = filterStatus === 'all' || cliente.status === filterStatus;
      const matchesOrigem = filterOrigem === 'all' || cliente.origem === filterOrigem;
      return matchesSearch && matchesStatus && matchesOrigem;
    });
  }, [clientes, searchClientes, filterStatus, filterOrigem]);

  // Get unique values for filters
  const statusOptions = useMemo(() => {
    const statuses = new Set((clientes || []).map(c => c.status).filter(Boolean));
    return Array.from(statuses);
  }, [clientes]);

  const origemOptions = useMemo(() => {
    const origens = new Set((clientes || []).map(c => c.origem).filter(Boolean));
    return Array.from(origens);
  }, [clientes]);

  const toggleSelectAll = () => {
    if (selectedClientes.size === filteredClientes.length) {
      setSelectedClientes(new Set());
    } else {
      setSelectedClientes(new Set(filteredClientes.map(c => c.id)));
    }
  };

  const toggleCliente = (id: string) => {
    const newSelected = new Set(selectedClientes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClientes(newSelected);
  };

  const insertVariable = (variable: string) => {
    setMessageTemplate(prev => prev + `{{${variable}}}`);
  };

  const getPreviewMessage = () => {
    const sampleCliente = filteredClientes[0] || {
      nome: 'João Silva',
      empresa: 'Empresa Exemplo',
      telefone: '11999999999',
      email: 'joao@exemplo.com',
    };
    let preview = messageTemplate;
    preview = preview.replace(/\{\{nome\}\}/gi, sampleCliente.nome || '');
    preview = preview.replace(/\{\{empresa\}\}/gi, sampleCliente.empresa || '');
    preview = preview.replace(/\{\{telefone\}\}/gi, sampleCliente.telefone || '');
    preview = preview.replace(/\{\{email\}\}/gi, sampleCliente.email || '');
    return preview;
  };

  // Calculate estimated time
  const estimatedTime = useMemo(() => {
    const count = selectedClientes.size;
    const avgDelay = randomizeDelay ? (minDelay + maxDelay) / 2 : delayBetweenMessages;
    let totalSeconds = count * avgDelay;
    
    if (sendInBatches && count > batchSize) {
      const batches = Math.ceil(count / batchSize);
      totalSeconds += (batches - 1) * pauseBetweenBatches * 60;
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    
    if (hours > 0) return `~${hours}h ${minutes}min`;
    if (minutes > 0) return `~${minutes}min ${seconds}s`;
    return `~${seconds}s`;
  }, [selectedClientes.size, delayBetweenMessages, randomizeDelay, minDelay, maxDelay, sendInBatches, batchSize, pauseBetweenBatches]);

  const handleStartDisparo = async () => {
    if (!selectedInstance || selectedClientes.size === 0 || !messageTemplate.trim()) return;

    const selectedClientesList = filteredClientes.filter(c => selectedClientes.has(c.id));
    const name = campaignName.trim() || `Disparo ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

    try {
      const campanha = await createCampanha.mutateAsync({
        nome: name,
        instance_id: selectedInstance.id,
        message_template: messageTemplate,
        media_url: mediaUrl || null,
        media_type: mediaType,
        publico_alvo: selectedClientesList.length,
        status: 'agendada',
        filters: { 
          status: filterStatus, 
          origem: filterOrigem,
          delay: randomizeDelay ? { min: minDelay, max: maxDelay } : delayBetweenMessages,
          batches: sendInBatches ? { size: batchSize, pause: pauseBetweenBatches } : null,
        },
      });

      await createEnvios.mutateAsync({
        campanhaId: campanha.id,
        clientes: selectedClientesList,
      });

      startDisparo.mutate({
        campanhaId: campanha.id,
        instanceName: selectedInstance.instance_name,
        clientes: selectedClientesList,
        messageTemplate,
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType !== 'text' ? mediaType : undefined,
      });

      setSelectedCampanhaId(campanha.id);
      setShowConfirmDialog(false);
      setActiveTab('andamento');
    } catch (error) {
      console.error('Error starting disparo:', error);
    }
  };

  const campanhasEmAndamento = campanhas.filter(c => c.status === 'em_andamento');
  const campanhasConcluidas = campanhas.filter(c => c.status === 'concluida' || c.status === 'cancelada');

  const canStartDisparo = selectedInstance && selectedClientes.size > 0 && messageTemplate.trim();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#111B21]">
      {/* Fixed Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#202C33] border-b border-[#2A3942]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-[#AEBAC1] hover:text-white hover:bg-[#2A3942]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-[#E9EDEF] truncate">Disparo em Massa</h1>
          <p className="text-xs text-[#8696A0]">Envie mensagens personalizadas para seus contatos</p>
        </div>
        {selectedClientes.size > 0 && (
          <Badge className="bg-[#00A884] text-white shrink-0">
            {selectedClientes.size} contatos
          </Badge>
        )}
      </header>

      {/* Tabs */}
      <div className="shrink-0 px-4 pt-3">
        <TabsList className="w-full bg-[#202C33] border border-[#2A3942] h-11">
          <TabsTrigger 
            value="novo" 
            onClick={() => setActiveTab('novo')}
            className={cn(
              "flex-1 data-[state=active]:bg-[#00A884] data-[state=active]:text-white",
              activeTab === 'novo' && "bg-[#00A884] text-white"
            )}
          >
            <Zap className="h-4 w-4 mr-2" />
            Novo
          </TabsTrigger>
          <TabsTrigger 
            value="andamento" 
            onClick={() => setActiveTab('andamento')}
            className={cn(
              "flex-1 data-[state=active]:bg-[#00A884] data-[state=active]:text-white",
              activeTab === 'andamento' && "bg-[#00A884] text-white"
            )}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Andamento
            {campanhasEmAndamento.length > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-black text-xs">{campanhasEmAndamento.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="historico" 
            onClick={() => setActiveTab('historico')}
            className={cn(
              "flex-1 data-[state=active]:bg-[#00A884] data-[state=active]:text-white",
              activeTab === 'historico' && "bg-[#00A884] text-white"
            )}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* TAB: Novo Disparo */}
        {activeTab === 'novo' && (
          <div className="p-4 space-y-4 pb-32">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label className="text-[#E9EDEF] text-sm font-medium">Nome da Campanha (opcional)</Label>
              <Input
                placeholder="Ex: Promoção de Natal 2026"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0]"
              />
            </div>

            {/* Instance Selection */}
            <Card className="bg-[#202C33] border-[#2A3942]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#00A884]" />
                  Instância WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                  <SelectTrigger className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF]">
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#202C33] border-[#2A3942] z-50">
                    {connectedInstances.map(instance => (
                      <SelectItem key={instance.id} value={instance.id} className="text-[#E9EDEF] focus:bg-[#2A3942] focus:text-[#E9EDEF]">
                        {instance.name} {instance.phone_number && `(${instance.phone_number})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {connectedInstances.length === 0 && (
                  <p className="text-sm text-yellow-500 mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Nenhuma instância conectada
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Client Selection */}
            <Card className="bg-[#202C33] border-[#2A3942]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#00A884]" />
                    Destinatários
                  </CardTitle>
                  <Badge variant="outline" className="border-[#00A884] text-[#00A884]">
                    {selectedClientes.size}/{filteredClientes.length}
                  </Badge>
                </div>
                <CardDescription className="text-[#8696A0]">
                  Selecione os contatos que receberão a mensagem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Buscar nome ou telefone..."
                    value={searchClientes}
                    onChange={(e) => setSearchClientes(e.target.value)}
                    className="flex-1 bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0] h-9"
                  />
                  <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[120px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202C33] border-[#2A3942] z-50">
                        <SelectItem value="all" className="text-[#E9EDEF] focus:bg-[#2A3942]">Todos</SelectItem>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status!} className="text-[#E9EDEF] focus:bg-[#2A3942]">{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                      <SelectTrigger className="w-[120px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202C33] border-[#2A3942] z-50">
                        <SelectItem value="all" className="text-[#E9EDEF] focus:bg-[#2A3942]">Todas</SelectItem>
                        {origemOptions.map(origem => (
                          <SelectItem key={origem} value={origem!} className="text-[#E9EDEF] focus:bg-[#2A3942]">{origem}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Select All */}
                <div 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-3 p-2 rounded-lg bg-[#2A3942] cursor-pointer hover:bg-[#3B4A54] transition-colors"
                >
                  <Checkbox
                    checked={selectedClientes.size === filteredClientes.length && filteredClientes.length > 0}
                    className="border-[#3B4A54] data-[state=checked]:bg-[#00A884] data-[state=checked]:border-[#00A884]"
                  />
                  <span className="text-sm text-[#E9EDEF] font-medium">
                    Selecionar todos ({filteredClientes.length})
                  </span>
                </div>

                {/* Client List */}
                <div className="max-h-[250px] overflow-y-auto rounded-lg border border-[#2A3942]">
                  {loadingClientes ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-[#00A884]" />
                    </div>
                  ) : filteredClientes.length === 0 ? (
                    <div className="text-center text-[#8696A0] py-12">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum cliente encontrado</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#2A3942]">
                      {filteredClientes.map(cliente => (
                        <div
                          key={cliente.id}
                          onClick={() => toggleCliente(cliente.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 cursor-pointer transition-colors",
                            selectedClientes.has(cliente.id) ? "bg-[#00A884]/10" : "hover:bg-[#2A3942]/50"
                          )}
                        >
                          <Checkbox
                            checked={selectedClientes.has(cliente.id)}
                            className="border-[#3B4A54] data-[state=checked]:bg-[#00A884] data-[state=checked]:border-[#00A884]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#E9EDEF] truncate">{cliente.nome}</p>
                            <p className="text-xs text-[#8696A0]">{cliente.telefone}</p>
                          </div>
                          {cliente.status && (
                            <Badge variant="outline" className="text-xs border-[#3B4A54] text-[#8696A0] shrink-0">
                              {cliente.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message Composition */}
            <Card className="bg-[#202C33] border-[#2A3942]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#00A884]" />
                  Mensagem
                </CardTitle>
                <CardDescription className="text-[#8696A0]">
                  Use variáveis para personalizar cada mensagem
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Variables */}
                <div className="flex flex-wrap gap-2">
                  {['nome', 'empresa', 'telefone', 'email'].map(variable => (
                    <Button
                      key={variable}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(variable)}
                      className="h-7 text-xs bg-[#2A3942] border-[#3B4A54] text-[#00A884] hover:bg-[#3B4A54] hover:text-[#00A884]"
                    >
                      {`{{${variable}}}`}
                    </Button>
                  ))}
                </div>

                {/* Message Input */}
                <Textarea
                  placeholder="Olá {{nome}}, tudo bem? Temos uma promoção especial para você..."
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="min-h-[100px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0]"
                />
                <div className="flex justify-between text-xs text-[#8696A0]">
                  <span>{messageTemplate.length} caracteres</span>
                  <span>{messageTemplate.split(/\s+/).filter(Boolean).length} palavras</span>
                </div>

                {/* Media Type */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { type: 'text', label: 'Texto', icon: FileText },
                    { type: 'image', label: 'Imagem', icon: Image },
                    { type: 'audio', label: 'Áudio', icon: Mic },
                  ].map(({ type, label, icon: Icon }) => (
                    <Button
                      key={type}
                      variant={mediaType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setMediaType(type); if (type === 'text') setMediaUrl(''); }}
                      className={cn(
                        "h-8",
                        mediaType === type 
                          ? 'bg-[#00A884] hover:bg-[#00A884]/90 text-white' 
                          : 'bg-[#2A3942] border-[#3B4A54] text-[#8696A0] hover:bg-[#3B4A54]'
                      )}
                    >
                      <Icon className="h-4 w-4 mr-1" /> {label}
                    </Button>
                  ))}
                </div>

                {mediaType !== 'text' && (
                  <Input
                    placeholder={`URL ${mediaType === 'image' ? 'da imagem' : 'do áudio'}...`}
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0]"
                  />
                )}

                {/* Preview */}
                {messageTemplate && (
                  <div className="rounded-lg overflow-hidden border border-[#3B4A54]">
                    <div className="bg-[#2A3942] px-3 py-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-[#8696A0]" />
                      <span className="text-xs text-[#8696A0] font-medium">Preview</span>
                    </div>
                    <div className="bg-[#005C4B] p-3">
                      <p className="text-sm text-[#E9EDEF] whitespace-pre-wrap">{getPreviewMessage()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card className="bg-[#202C33] border-[#2A3942]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-[#00A884]" />
                  Configurações Avançadas
                </CardTitle>
                <CardDescription className="text-[#8696A0]">
                  Ajuste o comportamento do disparo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delay Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#E9EDEF] text-sm flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Intervalo entre mensagens
                    </Label>
                    <Switch 
                      checked={randomizeDelay} 
                      onCheckedChange={setRandomizeDelay}
                      className="data-[state=checked]:bg-[#00A884]"
                    />
                  </div>
                  <p className="text-xs text-[#8696A0]">
                    {randomizeDelay ? 'Aleatorizar intervalo (recomendado)' : 'Intervalo fixo'}
                  </p>
                  
                  {randomizeDelay ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-[#8696A0]">Mínimo (segundos)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={minDelay}
                          onChange={(e) => setMinDelay(Number(e.target.value))}
                          className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-[#8696A0]">Máximo (segundos)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={maxDelay}
                          onChange={(e) => setMaxDelay(Number(e.target.value))}
                          className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8696A0]">Intervalo: {delayBetweenMessages}s</span>
                      </div>
                      <Slider
                        value={[delayBetweenMessages]}
                        onValueChange={([value]) => setDelayBetweenMessages(value)}
                        min={1}
                        max={10}
                        step={0.5}
                        className="[&_[role=slider]]:bg-[#00A884]"
                      />
                    </div>
                  )}
                </div>

                <Separator className="bg-[#2A3942]" />

                {/* Batch Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#E9EDEF] text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Enviar em lotes
                    </Label>
                    <Switch 
                      checked={sendInBatches} 
                      onCheckedChange={setSendInBatches}
                      className="data-[state=checked]:bg-[#00A884]"
                    />
                  </div>
                  <p className="text-xs text-[#8696A0]">
                    Pausar entre lotes para evitar bloqueio
                  </p>
                  
                  {sendInBatches && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-[#8696A0]">Tamanho do lote</Label>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          value={batchSize}
                          onChange={(e) => setBatchSize(Number(e.target.value))}
                          className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-[#8696A0]">Pausa (minutos)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={pauseBetweenBatches}
                          onChange={(e) => setPauseBetweenBatches(Number(e.target.value))}
                          className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimated Time */}
                {selectedClientes.size > 0 && (
                  <>
                    <Separator className="bg-[#2A3942]" />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-[#2A3942]">
                      <div className="flex items-center gap-2 text-[#8696A0]">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Tempo estimado</span>
                      </div>
                      <span className="text-[#00A884] font-semibold">{estimatedTime}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB: Em Andamento */}
        {activeTab === 'andamento' && (
          <div className="p-4 space-y-4">
            {selectedCampanhaId && stats.total > 0 ? (
              <Card className="bg-[#202C33] border-[#2A3942]">
                <CardHeader>
                  <CardTitle className="text-[#E9EDEF]">Progresso do Disparo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress 
                    value={((stats.enviado + stats.erro) / stats.total) * 100} 
                    className="h-3 bg-[#2A3942]"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Total', value: stats.total, color: 'text-[#E9EDEF]' },
                      { label: 'Enviando', value: stats.enviando, color: 'text-yellow-500' },
                      { label: 'Enviados', value: stats.enviado, color: 'text-[#00A884]' },
                      { label: 'Erros', value: stats.erro, color: 'text-red-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-2 rounded-lg bg-[#2A3942]">
                        <p className={cn("text-xl font-bold", color)}>{value}</p>
                        <p className="text-xs text-[#8696A0]">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-[#2A3942]">
                    <div className="divide-y divide-[#2A3942]">
                      {envios.map(envio => (
                        <div key={envio.id} className="flex items-center gap-3 p-3 bg-[#202C33]">
                          {envio.status === 'pendente' && <Clock className="h-4 w-4 text-[#8696A0] shrink-0" />}
                          {envio.status === 'enviando' && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin shrink-0" />}
                          {envio.status === 'enviado' && <CheckCircle2 className="h-4 w-4 text-[#00A884] shrink-0" />}
                          {envio.status === 'erro' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#E9EDEF] truncate">{envio.cliente_nome}</p>
                            <p className="text-xs text-[#8696A0]">{envio.cliente_telefone}</p>
                          </div>
                          {envio.status === 'erro' && envio.error_message && (
                            <span className="text-xs text-red-400 truncate max-w-[120px]">{envio.error_message}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : campanhasEmAndamento.length > 0 ? (
              <div className="space-y-3">
                {campanhasEmAndamento.map(campanha => (
                  <Card 
                    key={campanha.id} 
                    className="bg-[#202C33] border-[#2A3942] cursor-pointer hover:border-[#00A884] transition-colors"
                    onClick={() => setSelectedCampanhaId(campanha.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#E9EDEF]">{campanha.nome}</p>
                        <Badge className="bg-yellow-500 text-black">Em andamento</Badge>
                      </div>
                      <Progress 
                        value={campanha.publico_alvo ? ((campanha.mensagens_enviadas || 0) / campanha.publico_alvo) * 100 : 0} 
                        className="h-2 bg-[#2A3942]"
                      />
                      <p className="text-xs text-[#8696A0] mt-2">
                        {campanha.mensagens_entregues || 0} / {campanha.publico_alvo || 0} enviadas
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw className="h-12 w-12 text-[#3B4A54] mb-4" />
                <p className="text-[#E9EDEF] font-medium">Nenhum disparo em andamento</p>
                <p className="text-sm text-[#8696A0] mt-1">Crie um novo disparo para começar</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: Histórico */}
        {activeTab === 'historico' && (
          <div className="p-4 space-y-4">
            {loadingCampanhas ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#00A884]" />
              </div>
            ) : campanhasConcluidas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BarChart3 className="h-12 w-12 text-[#3B4A54] mb-4" />
                <p className="text-[#E9EDEF] font-medium">Nenhuma campanha concluída</p>
                <p className="text-sm text-[#8696A0] mt-1">Seu histórico aparecerá aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campanhasConcluidas.map(campanha => (
                  <Card key={campanha.id} className="bg-[#202C33] border-[#2A3942]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-[#E9EDEF]">{campanha.nome}</p>
                          <p className="text-xs text-[#8696A0]">
                            {campanha.created_at && format(new Date(campanha.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={campanha.status === 'concluida' ? 'bg-[#00A884]' : 'bg-red-500'}>
                          {campanha.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Público', value: campanha.publico_alvo || 0 },
                          { label: 'Entregues', value: campanha.mensagens_entregues || 0, color: 'text-[#00A884]' },
                          { 
                            label: 'Taxa', 
                            value: `${campanha.publico_alvo ? Math.round(((campanha.mensagens_entregues || 0) / campanha.publico_alvo) * 100) : 0}%` 
                          },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="text-center">
                            <p className={cn("text-lg font-bold", color || 'text-[#E9EDEF]')}>{value}</p>
                            <p className="text-xs text-[#8696A0]">{label}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Footer - Action Button */}
      {activeTab === 'novo' && (
        <div className="shrink-0 p-4 bg-[#202C33] border-t border-[#2A3942]">
          <Button
            className="w-full bg-[#00A884] hover:bg-[#00A884]/90 text-white font-semibold h-12 text-base disabled:opacity-50"
            disabled={!canStartDisparo}
            onClick={() => setShowConfirmDialog(true)}
          >
            <Send className="h-5 w-5 mr-2" />
            Iniciar Disparo • {selectedClientes.size} contatos
          </Button>
          {!canStartDisparo && (
            <p className="text-xs text-center text-[#8696A0] mt-2">
              {!selectedInstance && 'Selecione uma instância • '}
              {selectedClientes.size === 0 && 'Selecione contatos • '}
              {!messageTemplate.trim() && 'Escreva uma mensagem'}
            </p>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[#202C33] border-[#2A3942]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#E9EDEF]">Confirmar Disparo</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8696A0]">
              Você vai enviar mensagens para <strong className="text-[#00A884]">{selectedClientes.size} contatos</strong>.
              Tempo estimado: <strong className="text-[#00A884]">{estimatedTime}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-3 rounded-lg bg-[#005C4B] max-h-[150px] overflow-y-auto">
            <p className="text-xs text-[#8696A0] mb-1">Preview:</p>
            <p className="text-sm text-[#E9EDEF] whitespace-pre-wrap">{getPreviewMessage()}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] hover:bg-[#3B4A54]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartDisparo}
              disabled={startDisparo.isPending}
              className="bg-[#00A884] hover:bg-[#00A884]/90 text-white"
            >
              {startDisparo.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
