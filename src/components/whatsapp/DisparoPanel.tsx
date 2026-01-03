import { useState, useMemo } from 'react';
import { Send, Users, Filter, Clock, CheckCircle2, XCircle, Loader2, ChevronLeft, Image, Mic, FileText, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  const [activeTab, setActiveTab] = useState('novo');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [mediaType, setMediaType] = useState<string>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [searchClientes, setSearchClientes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOrigem, setFilterOrigem] = useState<string>('all');
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);

  const { clientes, isLoading: loadingClientes } = useClientes();
  const { instances } = useWhatsAppInstances();
  const { campanhas, isLoading: loadingCampanhas, createCampanha, createEnvios, startDisparo } = useCampanhas();
  const { envios, stats } = useCampanhaEnvios(selectedCampanhaId);

  const connectedInstances = instances?.filter(i => i.status === 'connected') || [];

  const selectedInstance = connectedInstances.find(i => i.id === selectedInstanceId);

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

  const handleStartDisparo = async () => {
    if (!selectedInstance || selectedClientes.size === 0 || !messageTemplate.trim()) {
      return;
    }

    const selectedClientesList = filteredClientes.filter(c => selectedClientes.has(c.id));
    const campanhaName = `Disparo ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

    try {
      // Create campaign
      const campanha = await createCampanha.mutateAsync({
        nome: campanhaName,
        instance_id: selectedInstance.id,
        message_template: messageTemplate,
        media_url: mediaUrl || null,
        media_type: mediaType,
        publico_alvo: selectedClientesList.length,
        status: 'agendada',
        filters: { status: filterStatus, origem: filterOrigem },
      });

      // Create envio records
      await createEnvios.mutateAsync({
        campanhaId: campanha.id,
        clientes: selectedClientesList,
      });

      // Start the disparo
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

  return (
    <div className="flex flex-col h-full bg-[#111B21]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2A3942]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-[#AEBAC1] hover:text-white hover:bg-[#2A3942]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold text-[#E9EDEF]">Disparo em Massa</h2>
          <p className="text-sm text-[#8696A0]">Envie mensagens para múltiplos contatos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 bg-[#202C33] border border-[#2A3942]">
          <TabsTrigger value="novo" className="data-[state=active]:bg-[#00A884] data-[state=active]:text-white">
            Novo Disparo
          </TabsTrigger>
          <TabsTrigger value="andamento" className="data-[state=active]:bg-[#00A884] data-[state=active]:text-white">
            Em Andamento
            {campanhasEmAndamento.length > 0 && (
              <Badge className="ml-2 bg-[#00A884]">{campanhasEmAndamento.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-[#00A884] data-[state=active]:text-white">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novo" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {/* Instance Selection */}
              <Card className="bg-[#202C33] border-[#2A3942]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                    <Send className="h-4 w-4 text-[#00A884]" />
                    Instância WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                    <SelectTrigger className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF]">
                      <SelectValue placeholder="Selecione uma instância conectada" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#202C33] border-[#2A3942]">
                      {connectedInstances.map(instance => (
                        <SelectItem key={instance.id} value={instance.id} className="text-[#E9EDEF]">
                          {instance.name} ({instance.phone_number || 'Sem número'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {connectedInstances.length === 0 && (
                    <p className="text-sm text-[#8696A0] mt-2">
                      Nenhuma instância conectada. Conecte uma instância nas configurações.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Client Selection */}
              <Card className="bg-[#202C33] border-[#2A3942]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E9EDEF] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#00A884]" />
                    Segmentação de Clientes
                    <Badge variant="secondary" className="ml-auto bg-[#00A884] text-white">
                      {selectedClientes.size} selecionados
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Buscar por nome ou telefone..."
                        value={searchClientes}
                        onChange={(e) => setSearchClientes(e.target.value)}
                        className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0]"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202C33] border-[#2A3942]">
                        <SelectItem value="all" className="text-[#E9EDEF]">Todos</SelectItem>
                        {statusOptions.map(status => (
                          <SelectItem key={status} value={status!} className="text-[#E9EDEF]">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                      <SelectTrigger className="w-[140px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#202C33] border-[#2A3942]">
                        <SelectItem value="all" className="text-[#E9EDEF]">Todas</SelectItem>
                        {origemOptions.map(origem => (
                          <SelectItem key={origem} value={origem!} className="text-[#E9EDEF]">
                            {origem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select All */}
                  <div className="flex items-center gap-2 pb-2 border-b border-[#2A3942]">
                    <Checkbox
                      checked={selectedClientes.size === filteredClientes.length && filteredClientes.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="border-[#3B4A54] data-[state=checked]:bg-[#00A884] data-[state=checked]:border-[#00A884]"
                    />
                    <span className="text-sm text-[#8696A0]">
                      Selecionar todos ({filteredClientes.length} clientes)
                    </span>
                  </div>

                  {/* Client List */}
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {loadingClientes ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-[#00A884]" />
                        </div>
                      ) : filteredClientes.length === 0 ? (
                        <p className="text-center text-[#8696A0] py-8">
                          Nenhum cliente encontrado
                        </p>
                      ) : (
                        filteredClientes.map(cliente => (
                          <div
                            key={cliente.id}
                            onClick={() => toggleCliente(cliente.id)}
                            className={cn(
                              "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                              selectedClientes.has(cliente.id) 
                                ? "bg-[#00A884]/20" 
                                : "hover:bg-[#2A3942]"
                            )}
                          >
                            <Checkbox
                              checked={selectedClientes.has(cliente.id)}
                              className="border-[#3B4A54] data-[state=checked]:bg-[#00A884] data-[state=checked]:border-[#00A884]"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#E9EDEF] truncate">
                                {cliente.nome}
                              </p>
                              <p className="text-xs text-[#8696A0]">
                                {cliente.telefone}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs border-[#3B4A54] text-[#8696A0]">
                              {cliente.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Message Composition */}
              <Card className="bg-[#202C33] border-[#2A3942]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E9EDEF]">
                    Composição da Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Variables */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-[#8696A0]">Variáveis:</span>
                    {['nome', 'empresa', 'telefone', 'email'].map(variable => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                        className="h-6 text-xs bg-[#2A3942] border-[#3B4A54] text-[#00A884] hover:bg-[#3B4A54]"
                      >
                        {`{{${variable}}}`}
                      </Button>
                    ))}
                  </div>

                  {/* Message Input */}
                  <Textarea
                    placeholder="Digite sua mensagem aqui..."
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    className="min-h-[120px] bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0] resize-none"
                  />

                  {/* Media Type */}
                  <div className="flex gap-2">
                    <Button
                      variant={mediaType === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setMediaType('text'); setMediaUrl(''); }}
                      className={cn(
                        mediaType === 'text' 
                          ? 'bg-[#00A884] hover:bg-[#00A884]/90' 
                          : 'bg-[#2A3942] border-[#3B4A54] text-[#8696A0] hover:bg-[#3B4A54]'
                      )}
                    >
                      Texto
                    </Button>
                    <Button
                      variant={mediaType === 'image' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMediaType('image')}
                      className={cn(
                        mediaType === 'image' 
                          ? 'bg-[#00A884] hover:bg-[#00A884]/90' 
                          : 'bg-[#2A3942] border-[#3B4A54] text-[#8696A0] hover:bg-[#3B4A54]'
                      )}
                    >
                      <Image className="h-4 w-4 mr-1" /> Imagem
                    </Button>
                    <Button
                      variant={mediaType === 'audio' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMediaType('audio')}
                      className={cn(
                        mediaType === 'audio' 
                          ? 'bg-[#00A884] hover:bg-[#00A884]/90' 
                          : 'bg-[#2A3942] border-[#3B4A54] text-[#8696A0] hover:bg-[#3B4A54]'
                      )}
                    >
                      <Mic className="h-4 w-4 mr-1" /> Áudio
                    </Button>
                    <Button
                      variant={mediaType === 'document' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMediaType('document')}
                      className={cn(
                        mediaType === 'document' 
                          ? 'bg-[#00A884] hover:bg-[#00A884]/90' 
                          : 'bg-[#2A3942] border-[#3B4A54] text-[#8696A0] hover:bg-[#3B4A54]'
                      )}
                    >
                      <FileText className="h-4 w-4 mr-1" /> Documento
                    </Button>
                  </div>

                  {mediaType !== 'text' && (
                    <Input
                      placeholder={`URL da ${mediaType === 'image' ? 'imagem' : mediaType === 'audio' ? 'áudio' : 'documento'}...`}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] placeholder:text-[#8696A0]"
                    />
                  )}

                  {/* Preview */}
                  {messageTemplate && (
                    <div className="p-3 rounded-lg bg-[#005C4B]">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-[#8696A0]" />
                        <span className="text-xs text-[#8696A0]">Preview</span>
                      </div>
                      <p className="text-sm text-[#E9EDEF] whitespace-pre-wrap">
                        {getPreviewMessage()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Button */}
              <Button
                className="w-full bg-[#00A884] hover:bg-[#00A884]/90 text-white font-medium h-12"
                disabled={!selectedInstance || selectedClientes.size === 0 || !messageTemplate.trim()}
                onClick={() => setShowConfirmDialog(true)}
              >
                <Send className="h-5 w-5 mr-2" />
                Iniciar Disparo ({selectedClientes.size} contatos)
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="andamento" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-4">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-[#2A3942]">
                      <p className="text-2xl font-bold text-[#E9EDEF]">{stats.total}</p>
                      <p className="text-xs text-[#8696A0]">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A3942]">
                      <p className="text-2xl font-bold text-yellow-500">{stats.enviando}</p>
                      <p className="text-xs text-[#8696A0]">Enviando</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A3942]">
                      <p className="text-2xl font-bold text-[#00A884]">{stats.enviado}</p>
                      <p className="text-xs text-[#8696A0]">Enviados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2A3942]">
                      <p className="text-2xl font-bold text-red-500">{stats.erro}</p>
                      <p className="text-xs text-[#8696A0]">Erros</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {envios.map(envio => (
                        <div 
                          key={envio.id} 
                          className="flex items-center gap-3 p-2 rounded-lg bg-[#2A3942]"
                        >
                          {envio.status === 'pendente' && <Clock className="h-4 w-4 text-[#8696A0]" />}
                          {envio.status === 'enviando' && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
                          {envio.status === 'enviado' && <CheckCircle2 className="h-4 w-4 text-[#00A884]" />}
                          {envio.status === 'erro' && <XCircle className="h-4 w-4 text-red-500" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#E9EDEF] truncate">{envio.cliente_nome}</p>
                            <p className="text-xs text-[#8696A0]">{envio.cliente_telefone}</p>
                          </div>
                          {envio.status === 'erro' && envio.error_message && (
                            <span className="text-xs text-red-400 truncate max-w-[150px]">
                              {envio.error_message}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : campanhasEmAndamento.length > 0 ? (
              <div className="space-y-4">
                {campanhasEmAndamento.map(campanha => (
                  <Card 
                    key={campanha.id} 
                    className="bg-[#202C33] border-[#2A3942] cursor-pointer hover:bg-[#2A3942] transition-colors"
                    onClick={() => setSelectedCampanhaId(campanha.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#E9EDEF]">{campanha.nome}</p>
                        <Badge className="bg-yellow-500">Em andamento</Badge>
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
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Clock className="h-12 w-12 text-[#3B4A54] mb-4" />
                <p className="text-[#8696A0]">Nenhum disparo em andamento</p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="historico" className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-4">
            {loadingCampanhas ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[#00A884]" />
              </div>
            ) : campanhasConcluidas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Send className="h-12 w-12 text-[#3B4A54] mb-4" />
                <p className="text-[#8696A0]">Nenhuma campanha concluída</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campanhasConcluidas.map(campanha => (
                  <Card 
                    key={campanha.id} 
                    className="bg-[#202C33] border-[#2A3942] cursor-pointer hover:bg-[#2A3942] transition-colors"
                    onClick={() => setSelectedCampanhaId(campanha.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-[#E9EDEF]">{campanha.nome}</p>
                          <p className="text-xs text-[#8696A0]">
                            {campanha.created_at && format(new Date(campanha.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={campanha.status === 'concluida' ? 'bg-[#00A884]' : 'bg-red-500'}>
                          {campanha.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-[#E9EDEF]">{campanha.publico_alvo || 0}</p>
                          <p className="text-xs text-[#8696A0]">Público</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#00A884]">{campanha.mensagens_entregues || 0}</p>
                          <p className="text-xs text-[#8696A0]">Entregues</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#E9EDEF]">
                            {campanha.publico_alvo ? Math.round(((campanha.mensagens_entregues || 0) / campanha.publico_alvo) * 100) : 0}%
                          </p>
                          <p className="text-xs text-[#8696A0]">Taxa</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-[#202C33] border-[#2A3942] text-[#E9EDEF]">
          <DialogHeader>
            <DialogTitle>Confirmar Disparo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-[#8696A0]">
              Você está prestes a enviar mensagens para <strong className="text-[#00A884]">{selectedClientes.size} contatos</strong>.
            </p>
            <div className="p-3 rounded-lg bg-[#005C4B]">
              <p className="text-xs text-[#8696A0] mb-1">Preview da mensagem:</p>
              <p className="text-sm whitespace-pre-wrap">{getPreviewMessage()}</p>
            </div>
            <p className="text-xs text-[#8696A0]">
              ⚠️ Esta ação não pode ser desfeita. As mensagens serão enviadas gradualmente para respeitar os limites do WhatsApp.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="bg-[#2A3942] border-[#3B4A54] text-[#E9EDEF] hover:bg-[#3B4A54]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartDisparo}
              disabled={startDisparo.isPending}
              className="bg-[#00A884] hover:bg-[#00A884]/90 text-white"
            >
              {startDisparo.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Confirmar Disparo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
