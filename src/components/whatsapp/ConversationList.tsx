import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation } from '@/hooks/useWhatsAppMessages';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedJid: string | null;
  onSelect: (jid: string) => void;
}

export function ConversationList({ conversations, isLoading, selectedJid, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter(conv => {
    const searchLower = search.toLowerCase();
    return (
      conv.contact_name.toLowerCase().includes(searchLower) ||
      conv.phone_number.includes(search)
    );
  });

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, 'dd/MM/yy');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="flex-1 p-3 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map(conv => (
              <button
                key={conv.remote_jid}
                onClick={() => onSelect(conv.remote_jid)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50',
                  selectedJid === conv.remote_jid && 'bg-muted'
                )}
              >
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(conv.contact_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{conv.contact_name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message || 'Sem mensagens'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
