import { useState, useEffect, useCallback, useRef } from 'react';
import { useEvolution, EvolutionChat } from '@/hooks/useEvolution';
import { supabase } from '@/integrations/supabase/client';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { MessageBubble } from '@/components/whatsapp/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  QrCode, 
  Loader2, 
  RefreshCw,
  Send,
  Search,
  User,
  Users,
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

  // Formata número de telefone para exibição legível
  const formatPhoneNumber = (jid: string) => {
    // Remove sufixos do WhatsApp
    let number = jid
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '')
      .replace('@lid', '')
      .replace('@c.us', '');
    
    // Se é um ID interno (contém letras), retorna vazio
    if (/[a-zA-Z]/.test(number)) {
      return '';
    }
    
    // Limpa qualquer caractere não numérico
    number = number.replace(/\D/g, '');
    
    // Se não tem número, retorna vazio
    if (!number) return '';
    
    // Formata número brasileiro (55 + DDD + número)
    if (number.startsWith('55')) {
      const ddd = number.slice(2, 4);
      const restNumber = number.slice(4);
      
      // Celular com 9 dígitos
      if (restNumber.length === 9) {
        return `(${ddd}) ${restNumber.slice(0, 5)}-${restNumber.slice(5)}`;
      }
      // Fixo com 8 dígitos
      if (restNumber.length === 8) {
        return `(${ddd}) ${restNumber.slice(0, 4)}-${restNumber.slice(4)}`;
      }
      // Outro formato brasileiro
      return `(${ddd}) ${restNumber}`;
    }
    
    // Números internacionais - formato simples com código do país
    if (number.length > 10) {
      return `+${number.slice(0, 2)} ${number.slice(2)}`;
    }
    
    return number;
  };

  // Retorna o nome de exibição do chat
  const getDisplayName = (chat: EvolutionChat) => {
    // Se tem push_name (nome salvo no WhatsApp), usa ele
    if (chat.push_name && chat.push_name.trim()) {
      return chat.push_name;
    }
    // Senão, formata o número
    const formatted = formatPhoneNumber(chat.remote_jid);
    return formatted || 'Contato';
  };
  
  // Retorna o subtítulo do chat (número formatado ou tipo)
  const getChatSubtitle = (chat: EvolutionChat) => {
    if (chat.is_group) return 'Grupo';
    const formatted = formatPhoneNumber(chat.remote_jid);
    return formatted || 'WhatsApp';
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
          <div className="flex-shrink-0 p-3 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-muted/40 border-0 rounded-xl text-sm placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Chats List - with scroll */}
          <div className="flex-1 overflow-y-auto">
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
              <div className="divide-y divide-border/30">
                {filteredChats.map((chat, index) => {
                  const avatarColors = [
                    'from-emerald-500/20 to-emerald-600/30 text-emerald-600',
                    'from-blue-500/20 to-blue-600/30 text-blue-600',
                    'from-purple-500/20 to-purple-600/30 text-purple-600',
                    'from-orange-500/20 to-orange-600/30 text-orange-600',
                    'from-pink-500/20 to-pink-600/30 text-pink-600',
                    'from-cyan-500/20 to-cyan-600/30 text-cyan-600',
                  ];
                  const colorClass = avatarColors[index % avatarColors.length];
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleSelecionarConversa(chat)}
                      className={`
                        w-full p-3 flex items-center gap-3 transition-all
                        hover:bg-muted/40 active:bg-muted/60
                        ${conversaSelecionada?.id === chat.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                      `}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm">
                          <AvatarImage src={chat.profile_pic_url || undefined} />
                          <AvatarFallback className={`bg-gradient-to-br ${colorClass} font-semibold text-sm`}>
                            {chat.is_group ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              getDisplayName(chat)?.[0]?.toUpperCase() || '?'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {chat.unread_count > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shadow ring-2 ring-background">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">{getDisplayName(chat)}</p>
                          {chat.last_message_at && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {format(new Date(chat.last_message_at), "HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.last_message || getChatSubtitle(chat)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Chat Content */}
        <main className={`
          flex-1 flex flex-col min-w-0 bg-[url('/placeholder.svg')] bg-repeat bg-[length:400px]
          ${!conversaSelecionada ? 'hidden md:flex' : 'flex'}
        `}>
          {/* Background overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95 pointer-events-none" style={{ position: 'absolute' }} />
          
          {!conversaSelecionada ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500/10 to-green-600/20 flex items-center justify-center mb-6">
                <MessageSquare className="h-10 w-10 text-green-500/60" />
              </div>
              <h2 className="text-xl font-semibold mb-2">WhatsApp Web</h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Selecione uma conversa para visualizar as mensagens
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <header className="flex-shrink-0 px-4 py-2.5 border-b border-border/40 bg-card/90 backdrop-blur-sm flex items-center gap-3 relative z-10">
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
                    {conversaSelecionada.is_group ? <Users className="h-4 w-4" /> : (getDisplayName(conversaSelecionada)?.[0]?.toUpperCase() || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{getDisplayName(conversaSelecionada)}</p>
                  <p className="text-xs text-muted-foreground">{getChatSubtitle(conversaSelecionada)}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => syncMessages(conversaSelecionada.remote_jid)}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </header>

              {/* Messages Area - with scroll */}
              <div className="flex-1 overflow-y-auto relative z-10">
                <div className="p-4 space-y-1 max-w-3xl mx-auto min-h-full flex flex-col justify-end">
                  {loadingMensagens ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : mensagens.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Clique no ícone de refresh para sincronizar</p>
                    </div>
                  ) : (
                    mensagens.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <footer className="flex-shrink-0 p-3 border-t border-border/40 bg-card/90 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-2 max-w-3xl mx-auto">
                  <Input
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 h-11 bg-muted/40 border-0 rounded-full text-sm px-4"
                    disabled={isSending}
                  />
                  <Button
                    onClick={handleEnviarMensagem}
                    disabled={!novaMensagem.trim() || isSending}
                    size="sm"
                    className="h-11 w-11 p-0 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/20"
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
