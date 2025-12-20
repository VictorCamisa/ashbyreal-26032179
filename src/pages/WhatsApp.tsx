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
import { Separator } from '@/components/ui/separator';
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
  UserCheck,
  Wifi,
  WifiOff,
  Phone,
  MoreVertical,
  Smile,
  Paperclip
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useLeads } from '@/hooks/useLeads';
import type { Lead } from '@/types/lead';
import { cn } from '@/lib/utils';

const DEFAULT_CLIENT_SLUG = 'ashby';

// Função para limpar instance_name com "=" do localStorage
const cleanInstanceName = () => {
  const stored = localStorage.getItem('whatsapp_instance_name');
  if (stored?.startsWith('=')) {
    const cleaned = stored.substring(1);
    localStorage.setItem('whatsapp_instance_name', cleaned);
    return cleaned;
  }
  return stored;
};

export default function WhatsApp() {
  const [conversaSelecionada, setConversaSelecionada] = useState<EvolutionChat | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novaMensagem, setNovaMensagem] = useState('');
  const [showClienteSheet, setShowClienteSheet] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hook de leads
  const { leads, isLoading: loadingLeads } = useLeads();
  
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(() => {
    return cleanInstanceName();
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

  // Buscar pedidos do cliente vinculado
  const { data: pedidosCliente = [] } = useQuery({
    queryKey: ['pedidos-cliente', conversaSelecionada?.remote_jid],
    queryFn: async () => {
      if (!conversaSelecionada) return [];
      
      const telefone = conversaSelecionada.remote_jid
        .replace('@s.whatsapp.net', '')
        .replace('@c.us', '')
        .replace(/\D/g, '');
      
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .or(`telefone.ilike.%${telefone.slice(-8)}%`)
        .maybeSingle();
      
      if (!cliente) return [];
      
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

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensagens]);

  // Foco no input ao selecionar conversa
  useEffect(() => {
    if (conversaSelecionada && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [conversaSelecionada]);

  const getInstanceName = useCallback(async (): Promise<string | null> => {
    if (instanceName) return instanceName;

    const stored = cleanInstanceName();
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
      toast.success('WhatsApp desconectado');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleSyncContacts = async () => {
    syncContacts();
    toast.success('Sincronizando contatos...');
  };

  // Iniciar conversa com lead
  const handleStartConversation = async (lead: Lead) => {
    if (!instanceName) {
      toast.error('WhatsApp não conectado');
      return;
    }

    setIsStartingConversation(true);
    
    try {
      let phone = lead.telefone.replace(/\D/g, '');
      if (!phone.startsWith('55') && phone.length <= 11) {
        phone = '55' + phone;
      }
      const remoteJid = `${phone}@s.whatsapp.net`;

      const existingChat = chats.find(chat => {
        const chatPhone = chat.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
        return chatPhone.slice(-8) === phone.slice(-8);
      });

      if (existingChat) {
        handleSelecionarConversa(existingChat);
        toast.success(`Conversa com ${lead.nome} aberta`);
      } else {
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

        handleSelecionarConversa(newChat as EvolutionChat);
        toast.success(`Nova conversa com ${lead.nome} criada`);
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
    
    let number = jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
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
    return 'Contato';
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM/yy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-amber-500/20 text-amber-600';
      case 'confirmado': return 'bg-blue-500/20 text-blue-600';
      case 'entregue': case 'pago': return 'bg-emerald-500/20 text-emerald-600';
      case 'cancelado': return 'bg-red-500/20 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Agrupar mensagens por data
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: typeof mensagens }[] = [];
    let currentDate = '';
    
    mensagens.forEach((msg) => {
      const msgDate = format(new Date(msg.timestamp), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    
    return groups;
  }, [mensagens]);

  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <div className="fixed inset-0 top-16 flex bg-[#eae6df] dark:bg-[#0b141a]">
      {/* Sidebar - Lista de Conversas */}
      <aside className={cn(
        "w-full md:w-[400px] lg:w-[420px] flex-shrink-0 flex flex-col",
        "bg-card border-r border-border/50",
        "transition-transform duration-300 ease-out",
        conversaSelecionada && "-translate-x-full md:translate-x-0",
        conversaSelecionada && "absolute md:relative z-10"
      )}>
        {/* Header da Sidebar */}
        <div className="h-16 px-4 flex items-center justify-between bg-card border-b border-border/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-emerald-600 text-white">
                <MessageSquare className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">WhatsApp Business</p>
              <div className="flex items-center gap-1.5">
                {isConnected ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-500">Conectado</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {isLoadingStatus ? 'Verificando...' : 'Desconectado'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            {isConnected ? (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => { syncChats(); toast.success('Sincronizando...'); }}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={handleSyncContacts}
                  disabled={isSyncing}
                >
                  <ContactRound className="h-5 w-5" />
                </Button>
                <LeadsContactsSheet
                  leads={leads}
                  isLoading={loadingLeads}
                  onStartConversation={handleStartConversation}
                  isStarting={isStartingConversation}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Desconectar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={fetchWhatsappStatus}
                  disabled={isLoadingStatus}
                >
                  <RefreshCw className={cn("h-5 w-5", isLoadingStatus && "animate-spin")} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <QrCode className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Conteúdo quando desconectado */}
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background/50">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <WifiOff className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">WhatsApp Desconectado</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Conecte seu WhatsApp escaneando o QR Code para enviar e receber mensagens.
            </p>
            <Button onClick={() => setQrDialogOpen(true)} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
              <QrCode className="h-5 w-5 mr-2" />
              Conectar WhatsApp
            </Button>
          </div>
        ) : (
          <>
            {/* Barra de Busca */}
            <div className="px-3 py-2 bg-card">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar ou começar nova conversa"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-muted/50 border-0 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-emerald-500"
                />
              </div>
            </div>

            {/* Lista de Conversas */}
            <ScrollArea className="flex-1">
              {loadingChats ? (
                <div className="p-4 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-48 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">
                    {chats.length === 0 ? 'Clique em sincronizar para carregar' : 'Nenhuma conversa encontrada'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredChats.map((chat, index) => {
                    const chatPhone = chat.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '').slice(-8);
                    const chatLead = leadsByPhone.get(chatPhone);
                    const isSelected = conversaSelecionada?.id === chat.id;
                    
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleSelecionarConversa(chat)}
                        className={cn(
                          "w-full px-3 py-3 flex items-center gap-3 text-left transition-colors",
                          "hover:bg-muted/50",
                          isSelected && "bg-emerald-50 dark:bg-emerald-950/30"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={chat.profile_pic_url || undefined} />
                            <AvatarFallback className={cn(
                              "text-white font-medium",
                              index % 7 === 0 && "bg-emerald-600",
                              index % 7 === 1 && "bg-blue-600",
                              index % 7 === 2 && "bg-purple-600",
                              index % 7 === 3 && "bg-orange-500",
                              index % 7 === 4 && "bg-pink-600",
                              index % 7 === 5 && "bg-cyan-600",
                              index % 7 === 6 && "bg-amber-600",
                            )}>
                              {chat.is_group ? <Users className="h-5 w-5" /> : getDisplayName(chat)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {chatLead && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-card">
                              <UserCheck className="h-2.5 w-2.5 text-white" />
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">{getDisplayName(chat)}</span>
                              {chatLead && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                  Lead
                                </Badge>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs flex-shrink-0",
                              chat.unread_count > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"
                            )}>
                              {chat.last_message_at && formatMessageDate(chat.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.last_message || (chat.is_group ? 'Grupo' : formatPhoneNumber(chat.remote_jid) || 'WhatsApp')}
                            </p>
                            {chat.unread_count > 0 && (
                              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center justify-center">
                                {chat.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </aside>

      {/* Área do Chat */}
      <main className={cn(
        "flex-1 flex flex-col min-w-0",
        "bg-[#eae6df] dark:bg-[#0b141a]",
        "transition-transform duration-300 ease-out",
        !conversaSelecionada && "translate-x-full md:translate-x-0",
        !conversaSelecionada && "absolute md:relative inset-0 top-0"
      )}>
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='m96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z'/%3E%3Cpath d='M6 5V0H5v5H0v1h5v94h1V6h94V5H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />

        {!conversaSelecionada ? (
          <div className="relative flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-64 h-64 mb-8">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 303 172'%3E%3Cpath fill='%2300a884' d='M229.565 160.229c32.647-44.643 23.47-107.876-20.485-141.104S101.086-4.353 68.44 40.29 44.97 148.166 88.925 181.394c18.804 14.21 40.247 21.136 61.465 21.136 29.87 0 59.388-12.789 79.175-42.301M75.954 45.381c35.538-48.62 103.616-59.16 152.148-23.558 48.532 35.602 58.946 103.854 23.408 152.474-37.134 50.779-107.166 60.168-154.652 23.137-47.486-37.031-58.037-102.832-20.904-152.053'/%3E%3Cpath fill='%2300a884' d='M194.466 131.867c-4.096-2.603-8.109-5.287-11.39-8.855-3.206-3.483-5.716-7.696-7.996-11.916a139.96 139.96 0 0 0 22.43-4.142c.5-.132.998-.27 1.497-.408-.3 5.382-1.247 10.682-3.05 15.817-.563 1.6-1.179 3.161-1.491 4.838-.086.464-.133.932-.085 1.4.049.469.218.925.497 1.301a1.98 1.98 0 0 0 .872.646c.336.137.704.19 1.066.15.361-.04.71-.172 1.005-.387a2.173 2.173 0 0 0 .68-.87c.9-2.082 1.693-4.23 2.38-6.407l.032-.102c1.09-3.461 2.001-7.01 2.48-10.614.228-1.717.363-3.453.403-5.192a93.614 93.614 0 0 0 9.527-4.017c5.24-2.492 10.297-5.54 14.376-9.67 4.078-4.13 7.133-9.427 8.005-15.179.827-5.465-.192-11.333-3.24-15.907-.51-.765-1.234-1.391-2.074-1.79-.84-.399-1.77-.555-2.673-.449-.904.106-1.753.47-2.44 1.045-.686.575-1.18 1.337-1.418 2.181-.235.838-.21 1.74.07 2.568.28.828.8 1.558 1.483 2.076a9.64 9.64 0 0 1 1.962 1.852c.513.693.917 1.464 1.199 2.279.561 1.63.789 3.367.67 5.097-.239 3.462-1.598 6.756-3.563 9.593-1.966 2.837-4.54 5.228-7.375 7.213a78.588 78.588 0 0 1-14.091 8.068 133.09 133.09 0 0 1-2.987-15.988 59.674 59.674 0 0 0-.893-5.32c-.485-2.1-1.24-4.17-2.53-5.848-1.292-1.678-3.159-2.93-5.292-3.235-2.073-.297-4.281.233-5.969 1.467-1.688 1.234-2.868 3.097-3.488 5.088-.619 1.991-.693 4.103-.582 6.164.11 2.061.403 4.103.78 6.123a66.83 66.83 0 0 0 2.625 9.913 143.602 143.602 0 0 1-24.756 5.268c-3.39-6.59-6.42-13.392-8.282-20.531a55.098 55.098 0 0 1-1.655-10.35c-.185-2.65-.108-5.478.984-7.885 1.091-2.406 3.314-4.401 5.937-4.85a7.01 7.01 0 0 1 4.065.549c1.212.543 2.293 1.355 3.148 2.38a12.205 12.205 0 0 1 1.921 3.308c.471 1.186.806 2.425.996 3.69.26 1.734-.112 3.58.303 5.284.162.665.513 1.28 1.009 1.752a3.353 3.353 0 0 0 1.721.909 3.362 3.362 0 0 0 1.925-.191c.603-.247 1.123-.664 1.483-1.205.64-1.018.907-2.283.861-3.497a15.877 15.877 0 0 0-.524-3.377c-.662-2.488-1.619-4.885-2.846-7.118-1.226-2.232-2.726-4.3-4.474-6.124a18.92 18.92 0 0 0-6.077-4.281c-2.285-1.003-4.802-1.533-7.316-1.414-2.514.12-5.009.891-7.189 2.233a16.155 16.155 0 0 0-5.378 5.69c-2.478 4.392-3.048 9.626-2.695 14.625s1.607 9.846 3.178 14.575a133.655 133.655 0 0 0 9.206 21.8c-5.912 0-11.812-.402-17.668-1.189a116.71 116.71 0 0 1-1.413-18.103c.053-6.157.598-12.4 2.183-18.318 1.584-5.918 4.244-11.546 8.364-15.852.41-.428.835-.845 1.273-1.242.367-.333.67-.743.881-1.2.212-.456.326-.954.336-1.46a3.21 3.21 0 0 0-.285-1.44 3.176 3.176 0 0 0-.858-1.168 3.063 3.063 0 0 0-1.23-.68 3.01 3.01 0 0 0-1.393-.082c-.462.077-.9.249-1.285.503-1.082.736-2.054 1.61-2.952 2.54a39.39 39.39 0 0 0-7.128 10.932c-3.424 7.638-4.65 16.094-4.835 24.43a123.13 123.13 0 0 0 1.245 18.913 187.9 187.9 0 0 1-28.645-8.442c-.11-.044-.221-.085-.332-.121a5.58 5.58 0 0 0-.306-.094c-1.048-.338-2.163-.478-3.265-.408-1.103.07-2.18.35-3.161.826-.981.476-1.848 1.139-2.536 1.947a6.547 6.547 0 0 0-1.308 2.753c-.24 1.011-.26 2.068-.055 3.09.205 1.023.628 1.99 1.244 2.837l.02.027a6.466 6.466 0 0 0 2.346 2.004c.919.479 1.94.749 2.979.786h.017a172.07 172.07 0 0 0 27.82-.696c5.105-.52 10.175-1.27 15.215-2.152a126.89 126.89 0 0 0 18.088 31.77 116.053 116.053 0 0 0 28.05 25.473 3.104 3.104 0 0 0 1.7.503c.568 0 1.128-.152 1.62-.44a3.208 3.208 0 0 0 1.19-1.186c.276-.49.43-1.043.447-1.608a3.214 3.214 0 0 0-.374-1.584 3.167 3.167 0 0 0-1.13-1.224 110.405 110.405 0 0 1-25.015-23.034 120.19 120.19 0 0 1-16.063-27.27c7.092-1.09 14.22-1.86 21.376-2.145a82.72 82.72 0 0 0 4.636 8.257c3.43 5.373 7.554 10.382 12.68 14.153 1.168.859 2.527 1.55 3.992 1.602.76.027 1.524-.124 2.21-.444.687-.32 1.28-.805 1.723-1.41a4.31 4.31 0 0 0 .685-3.85c-.204-.694-.58-1.326-1.085-1.831-.506-.506-1.127-.872-1.8-1.06-2.24-.623-4.355-1.767-6.285-3.159m-24.728-22.287c-.258-1.335-.452-2.688-.551-4.047-.1-1.36-.102-2.73.063-4.082.082-.677.205-1.353.389-2.009.184-.657.43-1.297.768-1.878.17-.29.372-.561.612-.792a2.608 2.608 0 0 1 .825-.53c.303-.12.628-.177.954-.168a2.11 2.11 0 0 1 .912.235c.285.148.54.353.748.601.208.249.366.536.468.845a8.655 8.655 0 0 1 .455 2.187c.155 1.368.186 2.753.19 4.133.004 1.381-.02 2.762-.071 4.14l-.08 2.04c-.023.616-.052 1.232-.082 1.847-.08 1.588-.188 3.176-.318 4.76a149.393 149.393 0 0 1-4.27-4.878 63.6 63.6 0 0 1-1.012-2.404'/%3E%3C/svg%3E"
                alt="WhatsApp"
                className="w-full h-full object-contain opacity-30"
              />
            </div>
            <h1 className="text-3xl font-light text-muted-foreground/80 mb-3">WhatsApp Web</h1>
            <p className="text-muted-foreground max-w-md">
              Envie e receba mensagens diretamente do seu sistema.<br />
              Selecione uma conversa para começar.
            </p>
          </div>
        ) : (
          <>
            {/* Header do Chat */}
            <header className="relative h-16 px-4 flex items-center gap-3 bg-card border-b border-border/30 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConversaSelecionada(null)}
                className="h-10 w-10 rounded-full md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <Avatar className="h-10 w-10 cursor-pointer" onClick={() => setShowClienteSheet(true)}>
                <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                <AvatarFallback className="bg-emerald-600 text-white">
                  {conversaSelecionada.is_group ? <Users className="h-5 w-5" /> : getDisplayName(conversaSelecionada)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowClienteSheet(true)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{getDisplayName(conversaSelecionada)}</span>
                  {linkedLead && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <UserCheck className="h-3 w-3 mr-0.5" />
                      Lead
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {linkedLead ? linkedLead.nome : formatPhoneNumber(conversaSelecionada.remote_jid) || 'WhatsApp'}
                </p>
              </div>
              
              <div className="flex items-center gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => syncMessages(conversaSelecionada.remote_jid)}
                  disabled={isSyncing}
                >
                  <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
                </Button>
                
                <Sheet open={showClienteSheet} onOpenChange={setShowClienteSheet}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <ShoppingBag className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[380px] sm:w-[420px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        {linkedLead ? (
                          <>
                            <UserCheck className="h-5 w-5 text-emerald-500" />
                            Lead Vinculado
                          </>
                        ) : (
                          <>
                            <User className="h-5 w-5" />
                            Informações do Contato
                          </>
                        )}
                      </SheetTitle>
                    </SheetHeader>
                    
                    <div className="mt-6 space-y-6">
                      {/* Perfil */}
                      <div className="flex flex-col items-center py-4">
                        <Avatar className="h-20 w-20 mb-4">
                          <AvatarImage src={conversaSelecionada.profile_pic_url || undefined} />
                          <AvatarFallback className="bg-emerald-600 text-white text-2xl">
                            {getDisplayName(conversaSelecionada)[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="text-lg font-semibold">{linkedLead?.nome || getDisplayName(conversaSelecionada)}</h3>
                        <p className="text-sm text-muted-foreground">{formatPhoneNumber(conversaSelecionada.remote_jid) || 'WhatsApp'}</p>
                        {linkedLead?.email && (
                          <p className="text-sm text-muted-foreground">{linkedLead.email}</p>
                        )}
                      </div>

                      {/* Info do Lead */}
                      {linkedLead && (
                        <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Status</span>
                              <Badge variant="outline" className={cn(
                                "text-xs",
                                linkedLead.status === 'novo_lead' && "bg-blue-500/20 text-blue-600 border-blue-300",
                                linkedLead.status === 'qualificado' && "bg-purple-500/20 text-purple-600 border-purple-300",
                                linkedLead.status === 'negociacao' && "bg-amber-500/20 text-amber-600 border-amber-300",
                                linkedLead.status === 'fechado' && "bg-emerald-500/20 text-emerald-600 border-emerald-300",
                                linkedLead.status === 'perdido' && "bg-red-500/20 text-red-600 border-red-300",
                              )}>
                                {linkedLead.status === 'novo_lead' ? 'Novo Lead' :
                                 linkedLead.status === 'qualificado' ? 'Qualificado' :
                                 linkedLead.status === 'negociacao' ? 'Negociação' :
                                 linkedLead.status === 'fechado' ? 'Fechado' :
                                 linkedLead.status === 'perdido' ? 'Perdido' : linkedLead.status}
                              </Badge>
                            </div>
                            {linkedLead.valorEstimado > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Valor Estimado</span>
                                <span className="font-semibold text-emerald-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(linkedLead.valorEstimado)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Origem</span>
                              <span className="text-sm">{linkedLead.origem}</span>
                            </div>
                          </div>
                        </Card>
                      )}

                      {/* Pedidos */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pedidos Recentes</h4>
                        {pedidosCliente.length === 0 ? (
                          <p className="text-sm text-muted-foreground/70 italic text-center py-4">
                            Nenhum pedido encontrado
                          </p>
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
                                    <p className="font-semibold text-sm">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valor_total)}
                                    </p>
                                    <Badge variant="outline" className={cn("text-[10px]", getStatusColor(pedido.status))}>
                                      {pedido.status}
                                    </Badge>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <Separator />
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja apagar esta conversa?')) {
                            deleteChat(conversaSelecionada.remote_jid);
                            setConversaSelecionada(null);
                            setShowClienteSheet(false);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Apagar Conversa
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </header>

            {/* Área de Mensagens */}
            <ScrollArea className="relative flex-1 px-4 py-4 md:px-[10%] lg:px-[15%]">
              <div className="space-y-4 max-w-3xl mx-auto">
                {loadingMensagens ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : mensagens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-sm text-muted-foreground/70">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.date}>
                      {/* Separador de Data */}
                      <div className="flex justify-center mb-4">
                        <span className="px-3 py-1 bg-card/90 text-muted-foreground text-xs rounded-lg shadow-sm">
                          {formatGroupDate(group.date)}
                        </span>
                      </div>
                      {/* Mensagens do dia */}
                      <div className="space-y-1">
                        {group.messages.map((msg) => (
                          <MessageBubble key={msg.id} message={msg} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input de Mensagem */}
            <footer className="relative px-4 py-3 bg-card border-t border-border/30">
              <div className="flex items-center gap-2 max-w-3xl mx-auto md:px-[5%]">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex-shrink-0">
                  <Smile className="h-6 w-6 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full flex-shrink-0">
                  <Paperclip className="h-6 w-6 text-muted-foreground" />
                </Button>
                <Input
                  ref={inputRef}
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite uma mensagem"
                  className="flex-1 h-11 rounded-lg bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-emerald-500"
                  disabled={isSending}
                />
                <Button
                  onClick={handleEnviarMensagem}
                  disabled={!novaMensagem.trim() || isSending}
                  size="icon"
                  className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                >
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
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
