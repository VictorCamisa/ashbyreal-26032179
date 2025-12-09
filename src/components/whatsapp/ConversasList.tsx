import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { WhatsAppConversa } from '@/hooks/useWhatsApp';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversasListProps {
  conversas: WhatsAppConversa[];
  isLoading: boolean;
  onSelectConversa: (conversa: WhatsAppConversa) => void;
  selectedConversaId?: string;
  onNovaConversa: () => void;
}

export function ConversasList({
  conversas,
  isLoading,
  onSelectConversa,
  selectedConversaId,
  onNovaConversa,
}: ConversasListProps) {
  const [filtro, setFiltro] = useState('');

  const conversasFiltradas = conversas.filter(
    (c) =>
      c.nome_contato.toLowerCase().includes(filtro.toLowerCase()) ||
      c.telefone.includes(filtro) ||
      c.ultima_mensagem?.toLowerCase().includes(filtro.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border/50 bg-card/30 overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="h-9 bg-muted rounded animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border/50 bg-card/30 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Conversas</h2>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onNovaConversa}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-border text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Nenhuma conversa
            </p>
          </div>
        ) : (
          conversasFiltradas.map((conversa) => (
            <button
              key={conversa.id}
              onClick={() => onSelectConversa(conversa)}
              className={`
                w-full text-left p-3 rounded-lg transition-all
                ${selectedConversaId === conversa.id 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'hover:bg-muted/50 border border-transparent'
                }
              `}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {conversa.nome_contato}
                    </span>
                    {conversa.nao_lida && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversa.telefone}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(conversa.ultima_interacao), "HH:mm", { locale: ptBR })}
                </span>
              </div>
              {conversa.ultima_mensagem && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {conversa.ultima_mensagem}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
