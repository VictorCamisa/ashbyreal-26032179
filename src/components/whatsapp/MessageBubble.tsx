import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, Play, Pause, FileText, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { useState, useRef } from 'react';

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
    if (type === 'image' || type === 'imageMessage') {
      return (
        <div className="space-y-2">
          {message.media_url && !imageError ? (
            <img 
              src={message.media_url} 
              alt="Imagem"
              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(message.media_url!, '_blank')}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Imagem não disponível</span>
            </div>
          )}
          {message.body && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Vídeo
    if (type === 'video' || type === 'videoMessage') {
      return (
        <div className="space-y-2">
          {message.media_url ? (
            <video 
              src={message.media_url} 
              controls
              className="max-w-[280px] rounded-lg"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <Video className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vídeo não disponível</span>
            </div>
          )}
          {message.body && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Áudio / PTT (Push-to-Talk / Voz)
    if (type === 'audio' || type === 'audioMessage' || type === 'ptt' || type === 'pttMessage') {
      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          {message.media_url ? (
            <>
              <button
                onClick={toggleAudio}
                className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  message.from_me 
                    ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30' 
                    : 'bg-primary/20 hover:bg-primary/30'
                }`}
              >
                {isPlaying ? (
                  <Pause className={`h-5 w-5 ${message.from_me ? 'text-primary-foreground' : 'text-primary'}`} />
                ) : (
                  <Play className={`h-5 w-5 ${message.from_me ? 'text-primary-foreground' : 'text-primary'}`} />
                )}
              </button>
              <audio 
                ref={audioRef} 
                src={message.media_url}
                onEnded={handleAudioEnded}
                className="hidden"
              />
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-current opacity-30 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-current opacity-60 rounded-full" />
                </div>
                <Mic className="h-4 w-4 opacity-60" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
              <Mic className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Áudio não disponível</span>
            </div>
          )}
        </div>
      );
    }

    // Documento
    if (type === 'document' || type === 'documentMessage') {
      return (
        <div className="space-y-2">
          <a 
            href={message.media_url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              message.from_me 
                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' 
                : 'bg-muted/50 hover:bg-muted/70'
            }`}
          >
            <FileText className="h-8 w-8 opacity-70" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Documento</p>
              <p className="text-xs opacity-60">Clique para abrir</p>
            </div>
          </a>
          {message.body && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
          )}
        </div>
      );
    }

    // Sticker
    if (type === 'sticker' || type === 'stickerMessage') {
      return message.media_url ? (
        <img 
          src={message.media_url} 
          alt="Sticker"
          className="w-32 h-32 object-contain"
        />
      ) : (
        <p className="text-sm opacity-60 italic">Sticker</p>
      );
    }

    // Texto padrão (conversation, extendedTextMessage, etc.)
    return message.body ? (
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {message.body}
      </p>
    ) : (
      <p className="text-sm opacity-60 italic">Mensagem sem conteúdo</p>
    );
  };

  const renderStatus = () => {
    if (!message.from_me) return null;

    const status = message.status?.toLowerCase();
    
    if (status === 'read' || status === 'played') {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
    }
    if (status === 'delivered' || status === 'received') {
      return <CheckCheck className="h-3.5 w-3.5 opacity-60" />;
    }
    return <Check className="h-3.5 w-3.5 opacity-60" />;
  };

  return (
    <div className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} mb-1`}>
      <div
        className={`
          max-w-[75%] rounded-2xl px-3 py-2 shadow-sm
          ${message.from_me
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border/50 rounded-bl-md'
          }
        `}
      >
        {renderContent()}
        <div className={`flex items-center justify-end gap-1.5 mt-1 ${message.from_me ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
          <span className="text-[10px] opacity-70">
            {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}
