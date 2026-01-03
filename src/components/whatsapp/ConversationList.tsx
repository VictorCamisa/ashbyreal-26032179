import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, ArrowLeft, MoreVertical, MessageSquarePlus, Users } from 'lucide-react';
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

  // Generate a consistent color based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-600',
      'bg-sky-600',
      'bg-violet-600',
      'bg-rose-600',
      'bg-amber-600',
      'bg-teal-600',
      'bg-indigo-600',
      'bg-pink-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#111B21]">
        <div className="h-14 px-4 flex items-center justify-between bg-[#202C33]">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
        <div className="p-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111B21]">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-[#202C33] border-b border-[#2A3942]/50">
        <h2 className="text-xl font-medium text-[#E9EDEF]">Conversas</h2>
        <div className="flex items-center gap-5 text-[#AEBAC1]">
          <button className="hover:text-white transition-colors p-1 rounded-full hover:bg-[#374248]">
            <Users className="h-5 w-5" />
          </button>
          <button className="hover:text-white transition-colors p-1 rounded-full hover:bg-[#374248]">
            <MessageSquarePlus className="h-5 w-5" />
          </button>
          <button className="hover:text-white transition-colors p-1 rounded-full hover:bg-[#374248]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2">
        <div className={cn(
          "flex items-center gap-4 h-9 rounded-lg px-3 transition-all duration-200",
          "bg-[#202C33] hover:bg-[#2A3942]",
          isSearchFocused && "bg-[#2A3942] ring-1 ring-[#00A884]/50"
        )}>
          <div className="w-5 flex justify-center shrink-0">
            {isSearchFocused ? (
              <ArrowLeft 
                className="h-[18px] w-[18px] text-[#00A884] cursor-pointer" 
                onClick={() => {
                  setIsSearchFocused(false);
                  setSearch('');
                }} 
              />
            ) : (
              <Search className="h-[18px] w-[18px] text-[#8696A0]" />
            )}
          </div>
          <input
            type="text"
            placeholder="Pesquisar ou começar uma nova conversa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => !search && setIsSearchFocused(false)}
            className="flex-1 bg-transparent border-none outline-none text-[#E9EDEF] text-[15px] placeholder:text-[#8696A0]"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#8696A0] px-8">
            <div className="w-16 h-16 rounded-full bg-[#202C33] flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-[#8696A0]" />
            </div>
            <p className="text-base font-medium text-[#E9EDEF]">Nenhuma conversa encontrada</p>
            <p className="text-sm text-center mt-1">Tente pesquisar por outro nome ou número</p>
          </div>
        ) : (
          <div className="divide-y divide-[#222D34]/50">
            {filteredConversations.map(conv => {
              const isSelected = selectedJid === conv.remote_jid;
              const hasUnread = conv.unread_count > 0;
              
              return (
                <button
                  key={conv.remote_jid}
                  onClick={() => onSelect(conv.remote_jid)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150',
                    'hover:bg-[#202C33]',
                    isSelected && 'bg-[#2A3942] hover:bg-[#2A3942]'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 ring-2 ring-[#2A3942]">
                      <AvatarFallback className={cn(
                        'text-white text-base font-medium',
                        getAvatarColor(conv.contact_name)
                      )}>
                        {getInitials(conv.contact_name)}
                      </AvatarFallback>
                    </Avatar>
                    {hasUnread && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-[#00A884] rounded-full border-2 border-[#111B21]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={cn(
                        "text-[16px] truncate",
                        hasUnread ? "font-semibold text-white" : "font-normal text-[#E9EDEF]"
                      )}>
                        {conv.contact_name}
                      </span>
                      <span className={cn(
                        "text-xs whitespace-nowrap shrink-0",
                        hasUnread ? "text-[#00A884] font-medium" : "text-[#8696A0]"
                      )}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-[14px] truncate",
                        hasUnread ? "text-[#D1D7DB] font-medium" : "text-[#8696A0]"
                      )}>
                        {conv.last_message || 'Clique para iniciar uma conversa'}
                      </p>
                      {hasUnread && (
                        <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-bold bg-[#00A884] text-[#111B21] rounded-full shrink-0">
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
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
    </div>
  );
}