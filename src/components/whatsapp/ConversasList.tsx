import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MessageSquare } from 'lucide-react';
import { WhatsAppConversa } from '@/hooks/useWhatsApp';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conversas</CardTitle>
          <Button size="sm" onClick={onNovaConversa}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {conversasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conversa encontrada</p>
            <Button variant="link" onClick={onNovaConversa} className="mt-2">
              Iniciar primeira conversa
            </Button>
          </div>
        ) : (
          conversasFiltradas.map((conversa) => (
            <div
              key={conversa.id}
              onClick={() => onSelectConversa(conversa)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent ${
                selectedConversaId === conversa.id ? 'bg-accent border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conversa.nome_contato}</p>
                  <p className="text-xs text-muted-foreground truncate">{conversa.telefone}</p>
                </div>
                {conversa.nao_lida && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    !
                  </Badge>
                )}
              </div>
              {conversa.ultima_mensagem && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                  {conversa.ultima_mensagem}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(conversa.ultima_interacao), "dd/MM 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
                <Badge variant="outline" className="text-xs">
                  {conversa.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
