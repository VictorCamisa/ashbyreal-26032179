import { useState, useEffect, useCallback, useRef } from 'react';
import { useEvolution, EvolutionChat } from '@/hooks/useEvolution';
import { supabase } from '@/integrations/supabase/client';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { MessageBubble } from '@/components/whatsapp/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Check,
  LogOut,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_CLIENT_SLUG = 'ashby';

export default function WhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<EvolutionChat | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novaMensagem, setNovaMensagem] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(() => {
    return localStorage.getItem('whatsapp_instance_name');
  });
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    localStorage.removeItem('whatsapp_instance_name');
    setInstanceName(null);
  }, []);

  const {
    chats,
    loadingChats,
    syncChats,
    syncMessages,
    sendMessage,
    deleteChat,
    getMessages,
    isSyncing,
    isSending,
    isDeleting,
  } = useEvolution(instanceName, handleDisconnect);

  // Cada chat é independente - sem vinculação

  const { data: mensagens = [], isLoading: loadingMensagens } = getMessages(
    conversaSelecionada?.remote_jid || null,
    [] // Sem chats vinculados - cada JID é independente
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

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

  const fetchWhatsappStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    
    try {
      const currentInstanceName = await getInstanceName();

      if (!currentInstanceName) {
        setIsConnected(false);
        setIsLoadingStatus(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'check_connection',
          instance_name: currentInstanceName,
        },
      });

      if (error) {
        setIsConnected(false);
        return;
      }

      setIsConnected(data?.connected === true);
      
    } catch (err) {
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
    // Sincronizar mensagens do chat selecionado
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

  const handleLogout = async () => {
    if (!instanceName) return;
    
    try {
      await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'logout',
          instance_name: instanceName,
        },
      });
      
      // Limpar estado local
      setIsConnected(false);
      localStorage.removeItem('whatsapp_instance_name');
      setInstanceName(null);
      setConversaSelecionada(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Filtrar chats - mostrar todos sem lógica de vinculação
  const filteredChats = chats.filter(chat => {
    // Aplicar filtro de busca
    const matchesSearch = (chat.push_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      chat.remote_jid.includes(searchTerm);
    
    return matchesSearch;
  });

  // Verifica se é um Linked ID (ID interno do WhatsApp Business)
  const isLinkedId = (jid: string) => jid.includes('@lid');
  
  // Verifica se é um grupo
  const isGroupJid = (jid: string) => jid.includes('@g.us');

  // Formata número para exibição
  const formatPhoneNumber = (jid: string) => {
    // Grupos não têm número
    if (isGroupJid(jid)) return '';
    
    // Para Linked IDs, extrair os dígitos e formatar de forma legível
    if (isLinkedId(jid)) {
      const digits = jid.replace('@lid', '').replace(/\D/g, '');
      // Mostrar apenas se parecer um número de telefone (10+ dígitos começando com código de país)
      if (digits.length >= 10 && digits.length <= 15) {
        // Tentar formatar como brasileiro
        if (digits.startsWith('55') && digits.length >= 12) {
          const ddd = digits.slice(2, 4);
          const rest = digits.slice(4);
          if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
          if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
        }
        return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      }
      return ''; // IDs internos longos não são números
    }
    
    let number = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    if (/[a-zA-Z]/.test(number)) return '';
    
    number = number.replace(/\D/g, '');
    if (!number || number.length < 10) return '';
    
    // Formato brasileiro: (DD) XXXXX-XXXX
    if (number.startsWith('55') && number.length >= 12) {
      const ddd = number.slice(2, 4);
      const rest = number.slice(4);
      if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
    
    return `+${number.slice(0, 2)} ${number.slice(2)}`;
  };

  const getDisplayName = (chat: EvolutionChat) => {
    // 1. Sempre priorizar o nome salvo no WhatsApp
    if (chat.push_name?.trim()) return chat.push_name;
    
    // 2. Para números reais, mostrar formatado
    const formatted = formatPhoneNumber(chat.remote_jid);
    if (formatted) return formatted;
    
    // 3. Para grupos sem nome
    if (chat.is_group) return 'Grupo';
    
    // 4. Último recurso: mostrar o ID de forma mais amigável
    const rawId = chat.remote_jid.split('@')[0];
    if (rawId.length <= 15 && /^\d+$/.test(rawId)) {
      // Parece um número, tentar formatar
      if (rawId.startsWith('55') && rawId.length >= 12) {
        const ddd = rawId.slice(2, 4);
        const rest = rawId.slice(4);
        if (rest.length >= 8) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}...`;
      }
      return `+${rawId.slice(0, 2)} ${rawId.slice(2, 7)}...`;
    }
    
    return 'Contato';
  };

  const getSubtitle = (chat: EvolutionChat) => {
    if (chat.is_group) return 'Grupo';
    
    // Se tem nome, mostrar o número como subtítulo
    if (chat.push_name?.trim()) {
      const formatted = formatPhoneNumber(chat.remote_jid);
      if (formatted) return formatted;
      return 'WhatsApp';
    }
    
    return 'WhatsApp';
  };

  // Avatar colors
  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 
      'bg-orange-500', 'bg-pink-600', 'bg-cyan-600', 'bg-yellow-600'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="fixed inset-0 top-16 flex bg-background">
      {/* Sidebar */}
      <aside className={`
        w-full md:w-[380px] lg:w-[420px] flex-shrink-0 
        flex flex-col border-r border-border/50 bg-card
        transition-transform duration-300 ease-out
        ${conversaSelecionada ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        ${conversaSelecionada ? 'absolute md:relative z-10' : 'relative'}
      `}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/50 bg-card">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary">
                  <MessageSquare className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                isConnected ? 'bg-green-500' : 'bg-muted-foreground'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingStatus ? 'Verificando...' : isConnected ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={fetchWhatsappStatus} 
              disabled={isLoadingStatus}
              title="Verificar status"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </Button>
{isConnected && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={() => syncChats()} 
                  disabled={isSyncing}
                  title="Sincronizar conversas"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-destructive hover:text-destructive" 
                  onClick={handleLogout}
                  title="Desconectar WhatsApp"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9" 
              onClick={() => setQrDialogOpen(true)}
              disabled={isConnected || isLoadingStatus}
              title="Gerar QR Code"
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar ou começar uma nova conversa"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 bg-muted/50 border-0 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loadingChats ? (
            <div className="p-4 space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-40 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected ? 'Clique em sincronizar para carregar conversas' : 'Conecte o WhatsApp para começar'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat, index) => (
              <button
                key={chat.id}
                onClick={() => handleSelecionarConversa(chat)}
                className={`
                  w-full px-3 py-3 flex items-center gap-3 
                  transition-colors duration-150 hover:bg-muted/50
                  ${conversaSelecionada?.id === chat.id ? 'bg-muted/70' : ''}
                `}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={chat.profile_pic_url || undefined} />
                  <AvatarFallback className={`${getAvatarColor(index)} text-white font-medium`}>
                    {chat.is_group ? <Users className="h-5 w-5" /> : (getDisplayName(chat)?.[0]?.toUpperCase() || <User className="h-5 w-5" />)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="font-medium text-[15px] truncate">{getDisplayName(chat)}</p>
                    {chat.last_message_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(chat.last_message_at), 'HH:mm', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.last_message || getSubtitle(chat)}
                    </p>
                    {chat.unread_count > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-green-500 text-white text-xs font-medium flex items-center justify-center">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className={`
        flex-1 flex flex-col min-w-0 bg-[#0b141a]
        transition-transform duration-300 ease-out
        ${conversaSelecionada ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!conversaSelecionada ? 'absolute md:relative inset-0 top-0' : 'relative'}
      `}>
        {!conversaSelecionada ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-[#222e35]">
            <div className="h-[280px] w-[280px] mb-8 rounded-full bg-[#364147] flex items-center justify-center">
              <MessageSquare className="h-32 w-32 text-[#8696a0]" />
            </div>
            <h1 className="text-[32px] font-light text-[#d1d7db] mb-4">WhatsApp Web</h1>
            <p className="text-sm text-[#8696a0] max-w-md leading-relaxed">
              Envie e receba mensagens sem manter seu celular conectado.<br />
              Use o WhatsApp em até 4 aparelhos conectados ao mesmo tempo.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="h-[60px] px-4 flex items-center gap-3 bg-[#202c33] border-b border-[#2a3942]">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConversaSelecionada(null)}
                className="h-9 w-9 md:hidden text-[#aebac1] hover:bg-[#2a3942]"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                <AvatarFallback className="bg-[#6b7c85] text-white">
                  {conversaSelecionada.is_group ? <Users className="h-5 w-5" /> : getDisplayName(conversaSelecionada)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#e9edef] truncate">{getDisplayName(conversaSelecionada)}</p>
                <p className="text-xs text-[#8696a0]">
                  {getSubtitle(conversaSelecionada)}
                </p>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-[#aebac1] hover:bg-[#2a3942]"
                onClick={() => syncMessages(conversaSelecionada.remote_jid)}
                title="Atualizar mensagens"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-destructive hover:bg-[#2a3942] hover:text-destructive"
                onClick={() => {
                  if (confirm('Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.')) {
                    deleteChat(conversaSelecionada.remote_jid);
                    setConversaSelecionada(null);
                  }
                }}
                disabled={isDeleting}
                title="Apagar conversa"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </header>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto px-[5%] md:px-[10%] lg:px-[15%] py-4"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0b141a'
              }}
            >
              <div className="max-w-[900px] mx-auto space-y-1">
                {loadingMensagens ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[#8696a0]" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm text-[#8696a0]">Nenhuma mensagem</p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <footer className="px-4 py-2 bg-[#202c33] flex items-center gap-3">
              <Input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite uma mensagem"
                className="flex-1 h-11 bg-[#2a3942] border-0 rounded-lg text-[#d1d7db] placeholder:text-[#8696a0] text-[15px] focus-visible:ring-0"
                disabled={isSending}
              />
              <Button
                onClick={handleEnviarMensagem}
                disabled={!novaMensagem.trim() || isSending}
                size="icon"
                className="h-11 w-11 rounded-full bg-[#00a884] hover:bg-[#06cf9c] text-white"
              >
                {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </footer>
          </>
        )}
      </main>

      <GerarQRCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onConnected={handleConnected}
      />
      
    </div>
  );
}
