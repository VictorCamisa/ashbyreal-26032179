import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Users, Link, Loader2 } from 'lucide-react';
import { EvolutionChat } from '@/hooks/useEvolution';

interface VincularChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChat: EvolutionChat | null;
  availableChats: EvolutionChat[];
  onLink: (targetChatId: string) => void;
  isLinking: boolean;
}

export function VincularChatDialog({ 
  open, 
  onOpenChange, 
  currentChat, 
  availableChats, 
  onLink,
  isLinking 
}: VincularChatDialogProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Filtrar chats disponíveis (excluir o chat atual e grupos)
  const filteredChats = availableChats.filter(chat => 
    chat.id !== currentChat?.id && 
    !chat.is_group &&
    chat.linked_to_chat_id !== currentChat?.id // Evitar ciclos
  );

  const formatPhoneNumber = (jid: string) => {
    if (jid.includes('@g.us')) return 'Grupo';
    
    const rawId = jid.split('@')[0];
    if (rawId.length <= 15 && /^\d+$/.test(rawId)) {
      if (rawId.startsWith('55') && rawId.length >= 12) {
        const ddd = rawId.slice(2, 4);
        const rest = rawId.slice(4);
        if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
        if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
      return `+${rawId.slice(0, 2)} ${rawId.slice(2)}`;
    }
    return rawId.slice(0, 15) + '...';
  };

  const getDisplayName = (chat: EvolutionChat) => {
    if (chat.push_name?.trim()) return chat.push_name;
    return formatPhoneNumber(chat.remote_jid);
  };

  const getJidType = (jid: string) => {
    if (jid.includes('@lid')) return 'Business ID';
    if (jid.includes('@s.whatsapp.net')) return 'Número';
    if (jid.includes('@g.us')) return 'Grupo';
    return 'Contato';
  };

  const handleConfirm = () => {
    if (selectedChatId) {
      onLink(selectedChatId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Vincular Conversas
          </DialogTitle>
          <DialogDescription>
            Selecione outra conversa para vincular com <strong>{currentChat ? getDisplayName(currentChat) : ''}</strong>. 
            As mensagens de ambas serão exibidas juntas.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {filteredChats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum chat disponível para vincular.
            </p>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full p-3 flex items-center gap-3 rounded-lg transition-colors ${
                  selectedChatId === chat.id 
                    ? 'bg-primary/10 border border-primary' 
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={chat.profile_pic_url || undefined} />
                  <AvatarFallback className="bg-muted">
                    {chat.is_group ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">{getDisplayName(chat)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getJidType(chat.remote_jid)} • {chat.last_message?.slice(0, 30) || 'Sem mensagens'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedChatId || isLinking}
          >
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vinculando...
              </>
            ) : (
              <>
                <Link className="mr-2 h-4 w-4" />
                Vincular
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
