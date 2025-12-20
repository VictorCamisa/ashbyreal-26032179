import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useEvolution, EvolutionChat } from '@/hooks/useEvolution';
import { supabase } from '@/integrations/supabase/client';
import { GerarQRCodeDialog } from '@/components/whatsapp/GerarQRCodeDialog';
import { MessageBubble } from '@/components/whatsapp/MessageBubble';
import { LeadsContactsSheet } from '@/components/whatsapp/LeadsContactsSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  LogOut,
  Trash2,
  ShoppingBag,
  ContactRound,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from 'sonner';
import { useLeads } from '@/hooks/useLeads';
import type { Lead } from '@/types/lead';

const DEFAULT_CLIENT_SLUG = 'ashby';

export default function WhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<EvolutionChat | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [showClienteSheet, setShowClienteSheet] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Hook de leads
  const { leads, isLoading: loadingLeads } = useLeads();
  
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
    syncContacts,
    sendMessage,
    deleteChat,
    getMessages,
    isSyncing,
    isSending,
    isDeleting,
  } = useEvolution(instanceName, handleDisconnect);

  const { data: mensagens = [], isLoading: loadingMensagens } = getMessages(
    conversaSelecionada?.remote_jid || null,
    []
  );

  // Buscar clientes para vincular
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-vincular'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, email, status')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Buscar pedidos do cliente vinculado
  const { data: pedidosCliente = [] } = useQuery({
    queryKey: ['pedidos-cliente', conversaSelecionada?.remote_jid],
    queryFn: async () => {
      if (!conversaSelecionada) return [];
      
      // Extrair telefone do JID
      const telefone = conversaSelecionada.remote_jid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace(/\D/g, '');
      
      // Buscar cliente por telefone
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .or(`telefone.ilike.%${telefone.slice(-8)}%`)
        .maybeSingle();
      
      if (!cliente) return [];
      
      // Buscar pedidos do cliente
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, data_pedido, valor_total, status')
        .eq('cliente_id', cliente.id)
        .order('data_pedido', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversaSelecionada,
  });

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
      
      setIsConnected(false);
      localStorage.removeItem('whatsapp_instance_name');
      setInstanceName(null);
      setConversaSelecionada(null);
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleSyncContacts = async () => {
    syncContacts();
    toast.success('Sincronizando nomes dos contatos...');
  };

  // Iniciar conversa com lead
  const handleStartConversation = async (lead: Lead) => {
    if (!instanceName) {
      toast.error('WhatsApp não conectado');
      return;
    }

    setIsStartingConversation(true);
    
    try {
      // Formatar telefone para JID
      let phone = lead.telefone.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) {
        phone = '55' + phone;
      }
      const remoteJid = `${phone}@s.whatsapp.net`;

      // Verificar se já existe um chat
      const existingChat = chats.find(chat => {
        const chatPhone = chat.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
        return chatPhone.slice(-8) === phone.slice(-8);
      });

      if (existingChat) {
        // Se já existe, apenas selecionar
        handleSelecionarConversa(existingChat);
        toast.success(`Conversa com ${lead.nome} aberta`);
      } else {
        // Criar novo chat na base e selecionar
        const { data: newChat, error } = await supabase
          .from('evolution_chats')
          .insert({
            instance_name: instanceName,
            remote_jid: remoteJid,
            push_name: lead.nome,
            is_group: false,
          })
          .select()
          .single();

        if (error) throw error;

        // Selecionar o novo chat
        handleSelecionarConversa(newChat as EvolutionChat);
        toast.success(`Nova conversa com ${lead.nome} criada`);
        
        // Atualizar lista de chats
        syncChats();
      }
    } catch (err: any) {
      console.error('Erro ao iniciar conversa:', err);
      toast.error('Erro ao iniciar conversa');
    } finally {
      setIsStartingConversation(false);
    }
  };

  // Normalizar telefone para comparação
  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, '').slice(-8);
  };

  // Mapear leads por telefone para vinculação automática
  const leadsByPhone = useMemo(() => {
    const map = new Map<string, Lead>();
    leads.forEach(lead => {
      const normalized = normalizePhone(lead.telefone);
      if (normalized.length >= 8) {
        map.set(normalized, lead);
      }
    });
    return map;
  }, [leads]);

  // Encontrar lead vinculado ao chat selecionado
  const linkedLead = useMemo(() => {
    if (!conversaSelecionada) return null;
    const telefone = conversaSelecionada.remote_jid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace(/\D/g, '');
    const normalized = telefone.slice(-8);
    return leadsByPhone.get(normalized) || null;
  }, [conversaSelecionada, leadsByPhone]);

  const filteredChats = chats.filter(chat => {
    const matchesSearch = (chat.push_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      chat.remote_jid.includes(searchTerm);
    return matchesSearch;
  });

  const isGroupJid = (jid: string) => jid.includes('@g.us');
  const isLinkedId = (jid: string) => jid.includes('@lid');

  const formatPhoneNumber = (jid: string) => {
    if (isGroupJid(jid)) return '';
    
    if (isLinkedId(jid)) {
      const digits = jid.replace('@lid', '').replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        if (digits.startsWith('55') && digits.length >= 12) {
          const ddd = digits.slice(2, 4);
          const rest = digits.slice(4);
          if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
          if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
        }
        return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
      }
      return '';
    }
    
    let number = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    if (/[a-zA-Z]/.test(number)) return '';
    
    number = number.replace(/\D/g, '');
    if (!number || number.length < 10) return '';
    
    if (number.startsWith('55') && number.length >= 12) {
      const ddd = number.slice(2, 4);
      const rest = number.slice(4);
      if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
    
    return `+${number.slice(0, 2)} ${number.slice(2)}`;
  };

  const getDisplayName = (chat: EvolutionChat) => {
    if (chat.push_name?.trim()) return chat.push_name;
    const formatted = formatPhoneNumber(chat.remote_jid);
    if (formatted) return formatted;
    if (chat.is_group) return 'Grupo';
    
    const rawId = chat.remote_jid.split('@')[0];
    if (rawId.length <= 15 && /^\d+$/.test(rawId)) {
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
    if (chat.push_name?.trim()) {
      const formatted = formatPhoneNumber(chat.remote_jid);
      if (formatted) return formatted;
      return 'WhatsApp';
    }
    return 'WhatsApp';
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-emerald-600', 'bg-blue-600', 'bg-purple-600', 
      'bg-orange-500', 'bg-pink-600', 'bg-cyan-600', 'bg-amber-600'
    ];
    return colors[index % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-500/20 text-yellow-500';
      case 'confirmado': return 'bg-blue-500/20 text-blue-500';
      case 'entregue': return 'bg-green-500/20 text-green-500';
      case 'cancelado': return 'bg-red-500/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="fixed inset-0 top-16 flex bg-background">
      {/* Sidebar */}
      <aside className={`
        w-full md:w-[380px] lg:w-[420px] flex-shrink-0 
        flex flex-col border-r border-border bg-card
        transition-transform duration-300 ease-out
        ${conversaSelecionada ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        ${conversaSelecionada ? 'absolute md:relative z-10' : 'relative'}
      `}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
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
            {isConnected ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={() => {
                    syncChats();
                    toast.success('Sincronizando conversas...');
                  }} 
                  disabled={isSyncing}
                  title="Sincronizar conversas"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={handleSyncContacts}
                  disabled={isSyncing}
                  title="Atualizar nomes dos contatos"
                >
                  <ContactRound className="h-4 w-4" />
                </Button>
                <LeadsContactsSheet
                  leads={leads}
                  isLoading={loadingLeads}
                  onStartConversation={handleStartConversation}
                  isStarting={isStartingConversation}
                />
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
            ) : (
              <>
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={() => setQrDialogOpen(true)}
                  title="Gerar QR Code"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Conteúdo quando desconectado */}
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <QrCode className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">WhatsApp não conectado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Escaneie o QR Code para conectar sua conta do WhatsApp
            </p>
            <Button onClick={() => setQrDialogOpen(true)} className="gap-2">
              <QrCode className="h-4 w-4" />
              Gerar QR Code
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-3 py-2 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-muted/50 border-0 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="flex-1">
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
                <div className="flex flex-col items-center justify-center h-full px-6 text-center py-20">
                  <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {chats.length === 0 ? 'Clique em sincronizar para carregar conversas' : 'Nenhuma conversa encontrada'}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat, index) => {
                  // Verificar se chat está vinculado a um lead
                  const chatPhone = chat.remote_jid
                    .replace('@s.whatsapp.net', '')
                    .replace('@c.us', '')
                    .replace(/\D/g, '')
                    .slice(-8);
                  const chatLead = leadsByPhone.get(chatPhone);
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleSelecionarConversa(chat)}
                      className={`
                        w-full px-3 py-3 flex items-center gap-3 
                        transition-colors duration-150 hover:bg-muted/50
                        ${conversaSelecionada?.id === chat.id ? 'bg-muted' : ''}
                      `}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={chat.profile_pic_url || undefined} />
                          <AvatarFallback className={`${getAvatarColor(index)} text-white font-medium`}>
                            {chat.is_group ? <Users className="h-5 w-5" /> : (getDisplayName(chat)?.[0]?.toUpperCase() || <User className="h-5 w-5" />)}
                          </AvatarFallback>
                        </Avatar>
                        {chatLead && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <UserCheck className="h-2.5 w-2.5 text-primary-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="font-medium text-[15px] truncate">{getDisplayName(chat)}</p>
                            {chatLead && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                                Lead
                              </Badge>
                            )}
                          </div>
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
                  );
                })
              )}
            </ScrollArea>
          </>
        )}
      </aside>

      {/* Chat Area */}
      <main className={`
        flex-1 flex flex-col min-w-0 bg-muted/30
        transition-transform duration-300 ease-out
        ${conversaSelecionada ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!conversaSelecionada ? 'absolute md:relative inset-0 top-0' : 'relative'}
      `}>
        {!conversaSelecionada ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 bg-muted/20">
            <div className="h-[200px] w-[200px] mb-8 rounded-full bg-muted/50 flex items-center justify-center">
              <MessageSquare className="h-24 w-24 text-muted-foreground/50" />
            </div>
            <h1 className="text-2xl font-light text-foreground mb-4">WhatsApp Web</h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Envie e receba mensagens diretamente do sistema.<br />
              Selecione uma conversa para começar.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="h-[60px] px-4 flex items-center gap-3 bg-card border-b border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConversaSelecionada(null)}
                className="h-9 w-9 md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {conversaSelecionada.is_group ? <Users className="h-5 w-5" /> : getDisplayName(conversaSelecionada)?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{getDisplayName(conversaSelecionada)}</p>
                  {linkedLead && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                      <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                      Lead
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {linkedLead ? linkedLead.nome : getSubtitle(conversaSelecionada)}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Botão Ver Pedidos */}
                <Sheet open={showClienteSheet} onOpenChange={setShowClienteSheet}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9"
                      title="Ver informações do cliente"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Informações do Cliente</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      {/* Info do contato / lead */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {linkedLead ? 'Lead Vinculado' : 'Contato'}
                        </h4>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {getDisplayName(conversaSelecionada)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{linkedLead?.nome || getDisplayName(conversaSelecionada)}</p>
                            <p className="text-sm text-muted-foreground">{formatPhoneNumber(conversaSelecionada.remote_jid) || 'WhatsApp'}</p>
                            {linkedLead?.email && (
                              <p className="text-sm text-muted-foreground">{linkedLead.email}</p>
                            )}
                          </div>
                        </div>
                        {linkedLead && (
                          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">Status do Lead</span>
                              <Badge variant="outline" className={`text-xs ${
                                linkedLead.status === 'novo_lead' ? 'bg-blue-500/20 text-blue-500' :
                                linkedLead.status === 'qualificado' ? 'bg-purple-500/20 text-purple-500' :
                                linkedLead.status === 'negociacao' ? 'bg-amber-500/20 text-amber-500' :
                                linkedLead.status === 'fechado' ? 'bg-green-500/20 text-green-500' :
                                'bg-red-500/20 text-destructive'
                              }`}>
                                {linkedLead.status === 'novo_lead' ? 'Novo Lead' :
                                 linkedLead.status === 'qualificado' ? 'Qualificado' :
                                 linkedLead.status === 'negociacao' ? 'Negociação' :
                                 linkedLead.status === 'fechado' ? 'Fechado' :
                                 linkedLead.status === 'perdido' ? 'Perdido' : linkedLead.status}
                              </Badge>
                            </div>
                            {linkedLead.valorEstimado > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Valor Estimado</span>
                                <span className="text-sm font-medium">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(linkedLead.valorEstimado)}
                                </span>
                              </div>
                            )}
                            {linkedLead.origem && (
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">Origem</span>
                                <span className="text-sm">{linkedLead.origem}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Pedidos recentes */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Pedidos Recentes</h4>
                        {pedidosCliente.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">Nenhum pedido encontrado para este contato.</p>
                        ) : (
                          <div className="space-y-2">
                            {pedidosCliente.map((pedido: any) => (
                              <Card key={pedido.id} className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{pedido.numero_pedido}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(pedido.data_pedido), 'dd/MM/yyyy')}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium text-sm">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}
                                    </p>
                                    <Badge variant="outline" className={getStatusColor(pedido.status)}>
                                      {pedido.status}
                                    </Badge>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9"
                  onClick={() => syncMessages(conversaSelecionada.remote_jid)}
                  title="Atualizar mensagens"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja apagar esta conversa?')) {
                      deleteChat(conversaSelecionada.remote_jid);
                      setConversaSelecionada(null);
                    }
                  }}
                  disabled={isDeleting}
                  title="Apagar conversa"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </header>

            {/* Messages */}
            <ScrollArea 
              className="flex-1 px-[5%] md:px-[10%] lg:px-[15%] py-4"
            >
              <div className="max-w-[900px] mx-auto space-y-1">
                {loadingMensagens ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
                  </div>
                ) : (
                  mensagens.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <footer className="px-4 py-3 bg-card border-t border-border flex items-center gap-3">
              <Input
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-11"
                disabled={isSending}
              />
              <Button
                onClick={handleEnviarMensagem}
                disabled={!novaMensagem.trim() || isSending}
                size="icon"
                className="h-11 w-11 rounded-full"
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
