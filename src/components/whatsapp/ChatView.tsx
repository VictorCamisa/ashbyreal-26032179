import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText, MessageCircle } from 'lucide-react';
import { WhatsAppConversa, WhatsAppMensagem } from '@/hooks/useWhatsApp';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatViewProps {
  conversa?: WhatsAppConversa;
  mensagens?: WhatsAppMensagem[];
  isLoading: boolean;
  onEnviarMensagem: (mensagem: string) => Promise<void>;
  onSelecionarTemplate: () => void;
}

export function ChatView({
  conversa,
  mensagens = [],
  isLoading,
  onEnviarMensagem,
  onSelecionarTemplate,
}: ChatViewProps) {
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const handleEnviar = async () => {
    if (!novaMensagem.trim() || enviando) return;

    setEnviando(true);
    try {
      await onEnviarMensagem(novaMensagem.trim());
      setNovaMensagem('');
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  if (!conversa) {
    return (
      <div className="h-full rounded-xl border border-border/50 bg-card/30 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            Selecione uma conversa
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border/50 bg-card/30 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{conversa.nome_contato}</h3>
          <p className="text-xs text-muted-foreground">{conversa.telefone}</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSelecionarTemplate}
          className="h-8 px-3 text-xs"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Templates
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="h-12 w-48 bg-muted rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[75%] rounded-2xl px-4 py-2.5
                  ${msg.tipo === 'enviada'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md'
                  }
                `}
              >
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {msg.mensagem}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] opacity-60">
                    {format(new Date(msg.data_hora), 'HH:mm', { locale: ptBR })}
                  </span>
                  {msg.tipo === 'enviada' && (
                    <span className="text-[10px] opacity-60">
                      {msg.status === 'lida' ? '✓✓' : msg.status === 'entregue' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Textarea
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className="min-h-[48px] max-h-[120px] resize-none bg-muted/30 border-transparent focus:border-border text-sm rounded-xl"
            disabled={enviando}
          />
          <Button
            onClick={handleEnviar}
            disabled={!novaMensagem.trim() || enviando}
            size="icon"
            className="h-12 w-12 rounded-xl flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
