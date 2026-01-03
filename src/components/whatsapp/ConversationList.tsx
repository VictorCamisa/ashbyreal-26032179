import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import type { Conversation } from '@/hooks/useWhatsAppMessages';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  selectedJid: string | null;
  onSelect: (jid: string) => void;
}

export function ConversationList({ conversations, isLoading, selectedJid, onSelect }: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    return format(date, 'dd/MM/yyyy');
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
      <div className="flex flex-col h-full bg-[#111B21]">
        {/* Header skeleton */}
        <div className="h-[59px] px-4 flex items-center bg-[#202C33]">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        {/* Search skeleton */}
        <div className="px-3 py-2 bg-[#111B21]">
          <Skeleton className="h-[35px] w-full rounded-lg" />
        </div>
        {/* Conversations skeleton */}
        <div className="flex-1 px-0">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="h-[49px] w-[49px] rounded-full shrink-0" />
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
    <div className="flex flex-col h-full bg-[#111B21]">
      {/* WhatsApp Header */}
      <div className="h-[59px] px-4 flex items-center justify-between bg-[#202C33] shrink-0">
        <Avatar className="h-10 w-10 cursor-pointer">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-[#6B7C85] text-white text-sm">EU</AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-6 text-[#AEBAC1]">
          <Filter className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2 bg-[#111B21] shrink-0">
        <div className={cn(
          "flex items-center gap-6 h-[35px] rounded-lg px-3 transition-all duration-200",
          isSearchFocused ? "bg-[#202C33]" : "bg-[#202C33]"
        )}>
          <div className="w-6 flex justify-center">
            {isSearchFocused ? (
              <ArrowLeft className="h-4 w-4 text-[#00A884] cursor-pointer" onClick={() => setIsSearchFocused(false)} />
            ) : (
              <Search className="h-4 w-4 text-[#8696A0]" />
            )}
          </div>
          <input
            type="text"
            placeholder="Pesquisar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => !search && setIsSearchFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-[#E9EDEF] text-sm placeholder:text-[#8696A0]"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#8696A0]">
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map(conv => (
              <button
                key={conv.remote_jid}
                onClick={() => onSelect(conv.remote_jid)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-[10px] text-left transition-colors hover:bg-[#202C33]',
                  selectedJid === conv.remote_jid && 'bg-[#2A3942]'
                )}
              >
                {/* Avatar */}
                <Avatar className="h-[49px] w-[49px] shrink-0">
                  <AvatarFallback className="bg-[#6B7C85] text-white text-lg font-light">
                    {getInitials(conv.contact_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0 border-b border-[#222D34] py-[14px] -my-[10px] ml-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-normal text-[17px] text-[#E9EDEF] truncate">
                      {conv.contact_name}
                    </span>
                    <span className={cn(
                      "text-xs whitespace-nowrap",
                      conv.unread_count > 0 ? "text-[#00A884]" : "text-[#8696A0]"
                    )}>
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-[2px]">
                    <p className="text-sm text-[#8696A0] truncate">
                      {conv.last_message || 'Sem mensagens'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="flex items-center justify-center h-[20px] min-w-[20px] px-[6px] text-xs font-medium bg-[#00A884] text-[#111B21] rounded-full">
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
