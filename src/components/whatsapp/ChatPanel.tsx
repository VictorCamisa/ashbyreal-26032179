import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Image, FileText, Mic, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WhatsAppMessage, Conversation } from '@/hooks/useWhatsAppMessages';

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: WhatsAppMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
}

export function ChatPanel({ conversation, messages, isLoading, onSendMessage, isSending }: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isSending) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageContent = (msg: WhatsAppMessage) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div className="space-y-1">
            {msg.media_url && (
              <img 
                src={msg.media_url} 
                alt="Imagem" 
                className="max-w-[250px] rounded-lg"
              />
            )}
            {msg.content && msg.content !== '[Imagem]' && (
              <p className="text-sm">{msg.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span className="text-sm">Mensagem de áudio</span>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{msg.content || 'Documento'}</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="text-sm">{msg.content || 'Vídeo'}</span>
          </div>
        );
      case 'sticker':
        return <span className="text-2xl">🎨 Figurinha</span>;
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Selecione uma conversa</h3>
        <p className="text-sm text-muted-foreground/70">
          Escolha uma conversa na lista para começar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(conversation.contact_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{conversation.contact_name}</h3>
          <p className="text-sm text-muted-foreground">
            +{conversation.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDateLabel = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));

              return (
                <div key={msg.id}>
                  {showDateLabel && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2',
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted rounded-bl-none'
                      )}
                    >
                      {renderMessageContent(msg)}
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1',
                        msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        <span className="text-[10px]">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="text-[10px]">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Digite uma mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={!inputMessage.trim() || isSending}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
