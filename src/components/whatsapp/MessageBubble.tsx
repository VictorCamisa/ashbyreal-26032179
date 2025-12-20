import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, Play, Pause, FileText, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: {
    id: string;
    from_me: boolean;
    body: string | null;
    message_type: string;
    media_url: string | null;
    timestamp: string;
    status: string | null;
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const renderContent = () => {
    const type = message.message_type?.toLowerCase() || 'text';

    // Imagem
    if (type === 'image' || type === 'imagemessage') {
      return (
        <div className="space-y-1">
          {message.media_url && !imageError ? (
            <img 
              src={message.media_url} 
              alt="Imagem"
              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media_url!, '_blank')}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-background/20 rounded-lg">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Imagem não disponível</span>
            </div>
          )}
          {message.body && (
            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Vídeo
    if (type === 'video' || type === 'videomessage') {
      return (
        <div className="space-y-1">
          {message.media_url ? (
            <video 
              src={message.media_url} 
              controls
              className="max-w-[280px] rounded-lg"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-background/20 rounded-lg">
              <Video className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vídeo não disponível</span>
            </div>
          )}
          {message.body && (
            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Áudio / PTT (Push-to-Talk / Voz)
    if (type === 'audio' || type === 'audiomessage' || type === 'ptt' || type === 'pttmessage') {
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          {message.media_url ? (
            <>
              <button
                onClick={toggleAudio}
                className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-primary hover:bg-primary/80"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-primary-foreground" />
                ) : (
                  <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                )}
              </button>
              <audio 
                ref={audioRef} 
                src={message.media_url}
                onEnded={handleAudioEnded}
                className="hidden"
              />
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-muted-foreground/40 rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full bg-muted-foreground rounded-full transition-all",
                    isPlaying ? 'w-1/2' : 'w-0'
                  )} />
                </div>
                <Mic className="h-4 w-4 text-muted-foreground" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-background/20 rounded-lg">
              <Mic className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Áudio não disponível</span>
            </div>
          )}
        </div>
      );
    }

    // Documento
    if (type === 'document' || type === 'documentmessage') {
      return (
        <div className="space-y-1">
          <a 
            href={message.media_url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-background/20 hover:bg-background/30"
          >
            <FileText className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Documento</p>
              <p className="text-xs text-muted-foreground">Clique para abrir</p>
            </div>
          </a>
          {message.body && (
            <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Sticker
    if (type === 'sticker' || type === 'stickermessage') {
      return message.media_url ? (
        <img 
          src={message.media_url} 
          alt="Sticker"
          className="w-32 h-32 object-contain"
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">Sticker</p>
      );
    }

    // Texto padrão (conversation, extendedTextMessage, etc.)
    return message.body ? (
      <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
        {message.body}
      </p>
    ) : (
      <p className="text-sm text-muted-foreground italic">Mensagem sem conteúdo</p>
    );
  };

  const renderStatus = () => {
    if (!message.from_me) return null;

    const status = message.status?.toLowerCase();
    
    if (status === 'read' || status === 'played') {
      return <CheckCheck className="h-4 w-4 text-blue-400" />;
    }
    if (status === 'delivered' || status === 'received') {
      return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
    }
    return <Check className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className={cn(
      "flex mb-1 animate-fade-in",
      message.from_me ? 'justify-end' : 'justify-start'
    )}>
      <div
        className={cn(
          "max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm",
          message.from_me
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-card text-card-foreground border border-border rounded-tl-none'
        )}
      >
        {renderContent()}
        <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
          <span className={cn(
            "text-[11px]",
            message.from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}
