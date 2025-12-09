import { useState, useEffect, useCallback } from 'react';
import { useEvolution, EvolutionChat, EvolutionMessage } from '@/hooks/useEvolution';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppKPIs } from '@/components/whatsapp/WhatsAppKPIs';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Zap,
  Send,
  FileText,
  Download,
  Search,
  User,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// URLs diretas do n8n
const N8N_STATUS_URL = 'https://vssolutionscamisa.app.n8n.cloud/webhook/whatsapp/checkstatus';
const DEFAULT_CLIENT_SLUG = 'ashby';

export default function WhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<EvolutionChat | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversas' | 'campanhas' | 'templates'>('conversas');
  const [searchTerm, setSearchTerm] = useState('');
  const [novaMensagem, setNovaMensagem] = useState('');
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(() => {
    return localStorage.getItem('whatsapp_instance_name');
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Hook da Evolution
  const {
    chats,
    loadingChats,
    syncChats,
    syncMessages,
    sendMessage,
    getMessages,
    isSyncing,
    isSending,
  } = useEvolution(instanceName);

  // Mensagens do chat selecionado
  const { data: mensagens = [], isLoading: loadingMensagens } = getMessages(
    conversaSelecionada?.remote_jid || null
  );

  // Busca instance_name: primeiro do state/localStorage, depois do Supabase
  const getInstanceName = useCallback(async (): Promise<string | null> => {
    if (instanceName) return instanceName;

    const stored = localStorage.getItem('whatsapp_instance_name');
    if (stored) {
      setInstanceName(stored);
      return stored;
    }

    const clientSlug = localStorage.getItem('whatsapp_client_slug') || DEFAULT_CLIENT_SLUG;
    
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('instance_name')
      .eq('client_slug', clientSlug)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.instance_name) return null;

    localStorage.setItem('whatsapp_instance_name', data.instance_name);
    setInstanceName(data.instance_name);
    return data.instance_name;
  }, [instanceName]);

  // Verifica status da conexão WhatsApp
  const fetchWhatsappStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    
    try {
      const currentInstanceName = await getInstanceName();

      if (!currentInstanceName) {
        setStatusError('Nenhuma instância de WhatsApp encontrada para este cliente.');
        setIsConnected(false);
        setIsLoadingStatus(false);
        return;
      }

      const response = await fetch(N8N_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_name: currentInstanceName }),
      });

      if (!response.ok) {
        setStatusError('Erro ao verificar status');
        setIsConnected(false);
        return;
      }

      const data = await response.json();

      if (data.found === false) {
        setStatusError('Nenhuma instância de WhatsApp encontrada para este cliente.');
        setIsConnected(false);
        return;
      }

      const connected = data.is_connected === true;
      setIsConnected(connected);
      setStatusError(null);
      
      if (data.instance_name) {
        setInstanceName(data.instance_name);
        localStorage.setItem('whatsapp_instance_name', data.instance_name);
      }
      
      if (data.client_slug) {
        localStorage.setItem('whatsapp_client_slug', data.client_slug);
      }
      
    } catch (err) {
      console.error('Erro ao verificar status do WhatsApp:', err);
      setStatusError('Erro de conexão ao verificar status.');
      setIsConnected(false);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [getInstanceName]);

  useEffect(() => {
    fetchWhatsappStatus();
  }, [fetchWhatsappStatus]);

  const handleSelecionarConversa = (chat: EvolutionChat) => {
    setConversaSelecionada(chat);
    // Sincroniza mensagens do chat selecionado
    syncMessages(chat.remote_jid);
  };

  const handleEnviarMensagem = async () => {
    if (!conversaSelecionada || !novaMensagem.trim()) return;

    sendMessage({
      remoteJid: conversaSelecionada.remote_jid,
      text: novaMensagem.trim(),
    });
    setNovaMensagem('');
  };

  const handleConnected = (name: string) => {
    setIsConnected(true);
    setInstanceName(name);
    localStorage.setItem('whatsapp_instance_name', name);
    setQrDialogOpen(false);
  };

  // Filtra conversas pela busca
  const filteredChats = chats.filter(chat => 
    (chat.push_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    chat.remote_jid.includes(searchTerm)
  );

  const formatPhoneNumber = (jid: string) => {
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
  };

  const tabs = [
    { id: 'conversas' as const, label: 'Conversas', icon: MessageSquare },
    { id: 'campanhas' as const, label: 'Campanhas', icon: Send },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">WhatsApp</h1>
                  <div className="flex items-center gap-2">
                    {isLoadingStatus && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando...
                      </span>
                    )}
                    {!isLoadingStatus && !statusError && isConnected === true && (
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        Conectado {instanceName && `· ${instanceName}`}
                      </span>
                    )}
                    {!isLoadingStatus && !statusError && isConnected === false && (
                      <span className="flex items-center gap-1.5 text-xs text-destructive">
                        <XCircle className="h-3 w-3" />
                        Desconectado
                      </span>
                    )}
                    {statusError && !isLoadingStatus && (
                      <span className="text-xs text-muted-foreground">{statusError}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={fetchWhatsappStatus}
                disabled={isLoadingStatus}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                Status
              </Button>
              {isConnected && (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => syncChats()}
                  disabled={isSyncing}
                  className="h-8 px-3 text-xs"
                >
                  <Download className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
              )}
              <Button 
                size="sm"
                onClick={() => setQrDialogOpen(true)}
                disabled={isConnected || isLoadingStatus}
                className="h-8 px-3 text-xs"
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                Conectar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* KPIs Section */}
      <section className="px-6 py-6 border-b border-border/40">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{chats.length}</p>
                <p className="text-xs text-muted-foreground">Conversas</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{chats.filter(c => c.is_group).length}</p>
                <p className="text-xs text-muted-foreground">Grupos</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{chats.filter(c => !c.is_group).length}</p>
                <p className="text-xs text-muted-foreground">Contatos</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{chats.reduce((acc, c) => acc + c.unread_count, 0)}</p>
                <p className="text-xs text-muted-foreground">Não lidas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="px-6 py-3 border-b border-border/40">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-6">
        {activeTab === 'conversas' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-380px)]">
            {/* Lista de Conversas */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col border border-border/50 rounded-xl bg-card overflow-hidden">
              <div className="p-3 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                {loadingChats ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      {isConnected 
                        ? 'Clique em "Sincronizar" para carregar conversas' 
                        : 'Conecte o WhatsApp para ver suas conversas'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => handleSelecionarConversa(chat)}
                        className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                          conversaSelecionada?.id === chat.id ? 'bg-muted/70' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={chat.profile_pic_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {chat.is_group ? <Users className="h-4 w-4" /> : (chat.push_name?.[0] || '?')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate">
                                {chat.push_name || formatPhoneNumber(chat.remote_jid)}
                              </p>
                              {chat.unread_count > 0 && (
                                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                  {chat.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {chat.last_message || formatPhoneNumber(chat.remote_jid)}
                            </p>
                            {chat.last_message_at && (
                              <p className="text-[10px] text-muted-foreground/70 mt-1">
                                {format(new Date(chat.last_message_at), "dd/MM HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat View */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col border border-border/50 rounded-xl bg-card overflow-hidden">
              {!conversaSelecionada ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                  <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border/40 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                      <AvatarFallback>
                        {conversaSelecionada.is_group ? <Users className="h-4 w-4" /> : (conversaSelecionada.push_name?.[0] || '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {conversaSelecionada.push_name || formatPhoneNumber(conversaSelecionada.remote_jid)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhoneNumber(conversaSelecionada.remote_jid)}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    {loadingMensagens ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : mensagens.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-sm text-muted-foreground">Nenhuma mensagem sincronizada</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mensagens.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] px-3 py-2 rounded-xl ${
                                msg.from_me
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.body || '[Mídia]'}</p>
                              <p className={`text-[10px] mt-1 ${msg.from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.timestamp), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border/40">
                    <div className="flex gap-2">
                      <Textarea
                        value={novaMensagem}
                        onChange={(e) => setNovaMensagem(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="min-h-[40px] max-h-[120px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleEnviarMensagem();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleEnviarMensagem}
                        disabled={!novaMensagem.trim() || isSending}
                        className="h-10 w-10 p-0"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campanhas' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Send className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-1">Campanhas</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Em breve você poderá criar e gerenciar campanhas de mensagens em massa
            </p>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-1">Templates</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Em breve você poderá criar e gerenciar templates de mensagens
            </p>
          </div>
        )}
      </main>

      {/* QR Code Dialog */}
      <GerarQRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onConnected={handleConnected}
      />
    </div>
  );
}
