import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEvolution, EvolutionChat, EvolutionMessage } from "@/hooks/useEvolution";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Send, Search, RefreshCw, LogOut, Users, Phone, Check, CheckCheck, Wifi, WifiOff, RotateCcw, ShoppingBag, User } from "lucide-react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GerarQRCodeDialog } from "@/components/whatsapp/GerarQRCodeDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function WhatsApp() {
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedChat, setSelectedChat] = useState<EvolutionChat | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [clientOrders, setClientOrders] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    setSelectedChat(null);
    localStorage.removeItem("whatsapp_instance_name");
  }, []);

  const { chats, loadingChats, syncChats, syncingChats, syncMessages, syncingMessages, sendMessage, sendingMessage, syncContacts, syncingContacts, rebuildChats, rebuildingChats, getMessages } = useEvolution(instanceName, handleDisconnect);

  const { data: messages, isLoading: loadingMessages } = getMessages(selectedChat?.id || null);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem("whatsapp_instance_name");
      if (stored) {
        setInstanceName(stored);
        return;
      }
      const { data } = await supabase.from("whatsapp_instances").select("instance_name").limit(1).maybeSingle();
      if (data?.instance_name) {
        setInstanceName(data.instance_name);
        localStorage.setItem("whatsapp_instance_name", data.instance_name);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!instanceName) return;
    const check = async () => {
      try {
        const { data } = await supabase.functions.invoke("evolution-api", { body: { action: "check_connection", instance_name: instanceName } });
        if (data?.connected) {
          setIsConnected(true);
          syncChats();
        } else {
          setIsConnected(false);
        }
      } catch {
        setIsConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [instanceName]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (selectedChat) inputRef.current?.focus(); }, [selectedChat]);

  const handleSelectChat = (chat: EvolutionChat) => {
    setSelectedChat(chat);
    syncMessages(chat.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    const text = newMessage.trim();
    setNewMessage("");
    try { await sendMessage({ chatId: selectedChat.id, text }); } catch { setNewMessage(text); }
  };

  const handleLogout = async () => {
    if (!instanceName) return;
    await supabase.functions.invoke("evolution-api", { body: { action: "logout", instance_name: instanceName } });
    localStorage.removeItem("whatsapp_instance_name");
    setInstanceName(null);
    setIsConnected(false);
    setSelectedChat(null);
    toast.success("Desconectado");
  };

  const handleConnected = (name: string) => {
    setInstanceName(name);
    localStorage.setItem("whatsapp_instance_name", name);
    setIsConnected(true);
    setShowQRDialog(false);
    syncChats();
  };

  const fetchClientOrders = async (phone: string | null) => {
    if (!phone) { setClientOrders([]); return; }
    const digits = phone.replace(/\D/g, "");
    const { data } = await supabase.from("pedidos").select("*, clientes!inner(nome, telefone)").or(`clientes.telefone.ilike.%${digits.slice(-8)}%`).order("created_at", { ascending: false }).limit(5);
    setClientOrders(data || []);
  };

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) return chats;
    const term = searchTerm.toLowerCase();
    return chats.filter((c) => getDisplayName(c).toLowerCase().includes(term) || (c.phone_number || "").includes(term) || (c.last_message || "").toLowerCase().includes(term));
  }, [chats, searchTerm]);

  const groupedMessages = useMemo(() => {
    if (!messages) return {};
    const groups: Record<string, EvolutionMessage[]> = {};
    for (const msg of messages) {
      const date = format(parseISO(msg.timestamp), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    }
    return groups;
  }, [messages]);

  const stats = useMemo(() => ({ total: chats.length, groups: chats.filter((c) => c.is_group).length, unread: chats.reduce((a, c) => a + (c.unread_count || 0), 0) }), [chats]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">WhatsApp</h1>
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
            {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground mr-2">
                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {stats.total}</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {stats.groups}</span>
                {stats.unread > 0 && <Badge variant="destructive">{stats.unread}</Badge>}
              </div>
              <Button variant="outline" size="sm" onClick={() => syncContacts()} disabled={syncingContacts}><Users className="h-4 w-4 mr-1" />Contatos</Button>
              <Button variant="outline" size="sm" onClick={() => rebuildChats()} disabled={rebuildingChats}><RotateCcw className="h-4 w-4 mr-1" />Reconstruir</Button>
              <Button variant="destructive" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" />Sair</Button>
            </>
          ) : (
            <Button onClick={() => setShowQRDialog(true)}>Conectar WhatsApp</Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r flex flex-col bg-card">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loadingChats ? (
              <div className="p-3 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground"><MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Nenhuma conversa</p>{isConnected && <Button variant="link" onClick={() => syncChats()} disabled={syncingChats}><RefreshCw className={cn("h-4 w-4 mr-1", syncingChats && "animate-spin")} />Sincronizar</Button>}</div>
            ) : (
              <div className="divide-y">{filteredChats.map((chat) => <ChatListItem key={chat.id} chat={chat} isSelected={selectedChat?.id === chat.id} onClick={() => handleSelectChat(chat)} />)}</div>
            )}
          </ScrollArea>
        </aside>

        <main className="flex-1 flex flex-col bg-muted/30">
          {selectedChat ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">{selectedChat.is_group ? <Users className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}</div>
                  <div><h2 className="font-medium">{getDisplayName(selectedChat)}</h2><p className="text-sm text-muted-foreground">{selectedChat.phone_number ? formatPhone(selectedChat.phone_number) : ""}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => syncMessages(selectedChat.id)} disabled={syncingMessages}><RefreshCw className={cn("h-4 w-4", syncingMessages && "animate-spin")} /></Button>
                  {selectedChat.phone_number && <Button variant="ghost" size="icon" onClick={() => { fetchClientOrders(selectedChat.phone_number); setShowClientSheet(true); }}><ShoppingBag className="h-4 w-4" /></Button>}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}><Skeleton className="h-12 w-48 rounded-lg" /></div>)}</div> : Object.keys(groupedMessages).length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageCircle className="h-12 w-12 mb-3 opacity-50" /><p>Nenhuma mensagem</p></div> : (
                  <div className="space-y-4">
                    {Object.entries(groupedMessages).map(([date, msgs]) => (
                      <div key={date}>
                        <div className="flex justify-center mb-4"><Badge variant="secondary" className="text-xs">{formatDateLabel(date)}</Badge></div>
                        <div className="space-y-2">{msgs.map((msg) => <MessageBubble key={msg.id} message={msg} />)}</div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t bg-card">
                <div className="flex items-center gap-2">
                  <Input ref={inputRef} placeholder="Digite uma mensagem..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} disabled={sendingMessage} className="flex-1" />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendingMessage} size="icon"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><MessageCircle className="h-16 w-16 mb-4 opacity-50" /><h2 className="text-xl font-medium mb-2">WhatsApp</h2><p>Selecione uma conversa</p></div>
          )}
        </main>
      </div>

      <GerarQRCodeDialog open={showQRDialog} onOpenChange={setShowQRDialog} onConnected={handleConnected} />

      <Sheet open={showClientSheet} onOpenChange={setShowClientSheet}>
        <SheetContent>
          <SheetHeader><SheetTitle>Cliente</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            {selectedChat && <div><p className="font-medium">{getDisplayName(selectedChat)}</p><p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />{selectedChat.phone_number ? formatPhone(selectedChat.phone_number) : "Sem telefone"}</p></div>}
            <div className="border-t pt-4"><h3 className="font-medium mb-3">Últimos Pedidos</h3>{clientOrders.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido</p> : <div className="space-y-3">{clientOrders.map((o) => <div key={o.id} className="p-3 bg-muted rounded-lg"><div className="flex justify-between"><div><p className="font-medium">Pedido #{o.numero_pedido}</p><p className="text-sm text-muted-foreground">{format(parseISO(o.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div><Badge>{o.status}</Badge></div><p className="text-sm mt-2">R$ {o.valor_total?.toFixed(2) || "0.00"}</p></div>)}</div>}</div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ChatListItem({ chat, isSelected, onClick }: { chat: EvolutionChat; isSelected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left", isSelected && "bg-muted")}>
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">{chat.is_group ? <Users className="h-6 w-6 text-primary" /> : <User className="h-6 w-6 text-primary" />}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between"><span className="font-medium truncate">{getDisplayName(chat)}</span>{chat.last_message_at && <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(chat.last_message_at)}</span>}</div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground truncate">{chat.last_message || (chat.phone_number ? formatPhone(chat.phone_number) : "")}</span>{(chat.unread_count || 0) > 0 && <Badge variant="default" className="ml-2 h-5 min-w-[20px] flex-shrink-0">{chat.unread_count}</Badge>}</div>
      </div>
    </button>
  );
}

function MessageBubble({ message }: { message: EvolutionMessage }) {
  const isMe = message.from_me;
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[70%] rounded-lg px-3 py-2", isMe ? "bg-primary text-primary-foreground" : "bg-card border")}>
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <div className={cn("flex items-center justify-end gap-1 mt-1", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
          <span className="text-[10px]">{format(parseISO(message.timestamp), "HH:mm")}</span>
          {isMe && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status }: { status: string | null }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3" />;
  return <Check className="h-3 w-3" />;
}

function getDisplayName(chat: EvolutionChat): string {
  if (chat.push_name) return chat.push_name;
  if (chat.phone_number) return formatPhone(chat.phone_number);
  if (chat.is_group) return `Grupo ${chat.canonical_jid.split("@")[0].substring(0, 10)}...`;
  return "Contato";
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `+${d.substring(0, 2)} (${d.substring(2, 4)}) ${d.substring(4, 9)}-${d.substring(9)}`;
  if (d.length === 12 && d.startsWith("55")) return `+${d.substring(0, 2)} (${d.substring(2, 4)}) ${d.substring(4, 8)}-${d.substring(8)}`;
  return phone;
}

function formatTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd/MM", { locale: ptBR });
}

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "dd 'de' MMMM", { locale: ptBR });
}
