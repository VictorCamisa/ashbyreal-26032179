import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, FileText } from 'lucide-react';
import { WhatsAppConversa, WhatsAppMensagem } from '@/hooks/useWhatsApp';
import { Skeleton } from '@/components/ui/skeleton';
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
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Send className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Selecione uma conversa para começar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{conversa.nome_contato}</CardTitle>
            <p className="text-sm text-muted-foreground">{conversa.telefone}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSelecionarTemplate}>
            <FileText className="h-4 w-4 mr-1" />
            Templates
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={i % 2 === 0 ? 'flex justify-end' : 'flex justify-start'}>
                <Skeleton className="h-16 w-64" />
              </div>
            ))}
          </div>
        ) : mensagens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma mensagem ainda</p>
            <p className="text-sm mt-1">Envie a primeira mensagem para iniciar a conversa</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.tipo === 'enviada' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.tipo === 'enviada'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.mensagem}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p className="text-xs opacity-70">
                    {format(new Date(msg.data_hora), 'HH:mm', { locale: ptBR })}
                  </p>
                  {msg.tipo === 'enviada' && (
                    <span className="text-xs opacity-70">
                      {msg.status === 'lida' ? '✓✓' : msg.status === 'entregue' ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="min-h-[80px] resize-none"
            disabled={enviando}
          />
          <Button
            onClick={handleEnviar}
            disabled={!novaMensagem.trim() || enviando}
            size="icon"
            className="h-[80px] w-12"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </Card>
  );
}
