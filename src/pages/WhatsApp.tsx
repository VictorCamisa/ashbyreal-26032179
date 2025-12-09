import { useState, useEffect, useCallback, useRef } from 'react';
import { useEvolution, EvolutionChat, EvolutionMessage } from '@/hooks/useEvolution';
import { supabase } from '@/integrations/supabase/client';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Send,
  Search,
  User,
  Users,
  Phone,
  MoreVertical,
  Smile,
  Paperclip,
  ArrowLeft,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constantes
const DEFAULT_CLIENT_SLUG = 'ashby';

export default function WhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<EvolutionChat | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novaMensagem, setNovaMensagem] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(() => {
    return localStorage.getItem('whatsapp_instance_name');
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Handler para quando o WhatsApp desconecta
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setStatusError('Sessão encerrada');
    // Limpar instância do localStorage quando desconecta
    localStorage.removeItem('whatsapp_instance_name');
    setInstanceName(null);
  }, []);

  // Hook da Evolution com callback de desconexão
  const {
    chats,
    loadingChats,
    syncChats,
    syncMessages,
    sendMessage,
    getMessages,
    isSyncing,
    isSending,
  } = useEvolution(instanceName, handleDisconnect);

  // Mensagens do chat selecionado
  const { data: mensagens = [], isLoading: loadingMensagens } = getMessages(
    conversaSelecionada?.remote_jid || null
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

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

  // Verifica status da conexão WhatsApp diretamente na Evolution API
  const fetchWhatsappStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    
    try {
      const currentInstanceName = await getInstanceName();

      if (!currentInstanceName) {
        setStatusError('Nenhuma instância encontrada');
        setIsConnected(false);
        setIsLoadingStatus(false);
        return;
      }

      // Chamar a Edge Function para verificar o status diretamente na Evolution API
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'check_connection',
          instance_name: currentInstanceName,
        },
      });

      if (error) {
        console.error('Erro ao verificar status:', error);
        setStatusError('Erro ao verificar');
        setIsConnected(false);
        return;
      }

      console.log('Status da conexão:', data);

      const connected = data?.connected === true;
      setIsConnected(connected);
      
      if (!connected) {
        // Se desconectado, limpar localStorage e mostrar estado apropriado
        const state = data?.state || 'disconnected';
        if (state === 'not_found') {
          setStatusError('Instância não encontrada');
          localStorage.removeItem('whatsapp_instance_name');
          setInstanceName(null);
        } else if (state === 'close') {
          setStatusError('Sessão encerrada');
        } else {
          setStatusError('Desconectado');
        }
      } else {
        setStatusError(null);
      }
      
    } catch (err) {
      console.error('Erro ao verificar status do WhatsApp:', err);
      setStatusError('Erro de conexão');
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
    syncMessages(chat.remote_jid);
  };

  const handleEnviarMensagem = async () => {
    if (!conversaSelecionada || !novaMensagem.trim() || isSending) return;

    sendMessage({
      remoteJid: conversaSelecionada.remote_jid,
      text: novaMensagem.trim(),
    });
    setNovaMensagem('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
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
    const number = jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '');
    if (number.length > 10) {
      return `+${number.slice(0, 2)} (${number.slice(2, 4)}) ${number.slice(4, 9)}-${number.slice(9)}`;
    }
    return number;
  };

  // Stats
  const totalChats = chats.length;
  const totalGroups = chats.filter(c => c.is_group).length;
  const totalContacts = chats.filter(c => !c.is_group).length;
  const totalUnread = chats.reduce((acc, c) => acc + c.unread_count, 0);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
      {/* Compact Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Status */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${
                isConnected ? 'bg-green-500' : 'bg-muted'
              }`} />
            </div>
            <div>
              <h1 className="text-base font-semibold">WhatsApp</h1>
              <div className="flex items-center gap-1.5">
                {isLoadingStatus ? (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Verificando...
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center gap-1 text-[11px] text-green-500 font-medium">
                    <Wifi className="h-2.5 w-2.5" />
                    Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <WifiOff className="h-2.5 w-2.5" />
                    {statusError || 'Desconectado'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Quick Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{totalChats}</p>
                <p className="text-[10px] text-muted-foreground">Conversas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{totalGroups}</p>
                <p className="text-[10px] text-muted-foreground">Grupos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{totalContacts}</p>
                <p className="text-[10px] text-muted-foreground">Contatos</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-6 px-2.5 text-xs font-medium">
                {totalUnread} não lidas
              </Badge>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchWhatsappStatus}
              disabled={isLoadingStatus}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </Button>
            {isConnected && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => syncChats()}
                disabled={isSyncing}
                className="h-8 px-3 text-xs gap-1.5"
              >
                {isSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sync
              </Button>
            )}
            <Button 
              size="sm"
              onClick={() => setQrDialogOpen(true)}
              disabled={isConnected || isLoadingStatus}
              className="h-8 px-3 text-xs gap-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              <QrCode className="h-3.5 w-3.5" />
              Conectar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <aside className={`
          w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border/40 
          flex flex-col bg-card/50 backdrop-blur-sm
          ${conversaSelecionada ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Search */}
          <div className="p-3 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ou iniciar nova conversa"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-muted/40 border-0 rounded-xl text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Chats List */}
          <ScrollArea className="flex-1">
            {loadingChats ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-muted rounded mb-2" />
                      <div className="h-3 w-36 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {isConnected 
                    ? 'Clique em "Sync" para carregar conversas' 
                    : 'Conecte o WhatsApp para começar'
                  }
                </p>
              </div>
            ) : (
              <div>
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleSelecionarConversa(chat)}
                    className={`
                      w-full p-3 flex items-center gap-3 transition-all
                      hover:bg-muted/50 active:bg-muted/70
                      ${conversaSelecionada?.id === chat.id ? 'bg-muted/60' : ''}
                    `}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-background">
                        <AvatarImage src={chat.profile_pic_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary font-medium">
                          {chat.is_group ? <Users className="h-5 w-5" /> : (chat.push_name?.[0]?.toUpperCase() || '?')}
                        </AvatarFallback>
                      </Avatar>
                      {chat.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">
                          {chat.push_name || formatPhoneNumber(chat.remote_jid)}
                        </p>
                        {chat.last_message_at && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {format(new Date(chat.last_message_at), "HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {chat.is_group && (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                            Grupo
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {chat.last_message || 'Sem mensagens'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Chat Content */}
        <main className={`
          flex-1 flex flex-col min-w-0 bg-gradient-to-b from-background to-muted/10
          ${!conversaSelecionada ? 'hidden md:flex' : 'flex'}
        `}>
          {!conversaSelecionada ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500/10 to-green-600/20 flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-green-500/60" />
              </div>
              <h2 className="text-xl font-semibold mb-2">WhatsApp Web</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Selecione uma conversa para visualizar as mensagens e interagir com seus contatos
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <header className="flex-shrink-0 px-4 py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConversaSelecionada(null)}
                  className="h-8 w-8 p-0 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-10 w-10 ring-2 ring-background">
                  <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary">
                    {conversaSelecionada.is_group ? <Users className="h-4 w-4" /> : (conversaSelecionada.push_name?.[0]?.toUpperCase() || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {conversaSelecionada.push_name || formatPhoneNumber(conversaSelecionada.remote_jid)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conversaSelecionada.is_group ? 'Grupo' : formatPhoneNumber(conversaSelecionada.remote_jid)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </header>

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-3 max-w-3xl mx-auto">
                  {loadingMensagens ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground">Nenhuma mensagem encontrada</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">As mensagens aparecerão aqui</p>
                    </div>
                  ) : (
                    mensagens.map((msg: EvolutionMessage) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`
                            max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm
                            ${msg.from_me 
                              ? 'bg-green-500 text-white rounded-br-md' 
                              : 'bg-card border border-border/50 rounded-bl-md'
                            }
                          `}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.body || '[Mídia]'}
                          </p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${msg.from_me ? 'text-white/70' : 'text-muted-foreground'}`}>
                            <span className="text-[10px]">
                              {format(new Date(msg.timestamp), 'HH:mm', { locale: ptBR })}
                            </span>
                            {msg.from_me && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <footer className="flex-shrink-0 p-3 border-t border-border/40 bg-card/80 backdrop-blur-sm">
                <div className="flex items-end gap-2 max-w-3xl mx-auto">
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <div className="flex-1">
                    <Input
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Digite uma mensagem..."
                      className="h-10 bg-muted/40 border-0 rounded-2xl text-sm"
                      disabled={isSending}
                    />
                  </div>
                  <Button
                    onClick={handleEnviarMensagem}
                    disabled={!novaMensagem.trim() || isSending}
                    size="sm"
                    className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/20"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>

      {/* QR Code Dialog */}
      <GerarQRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onConnected={handleConnected}
      />
    </div>
  );
}
