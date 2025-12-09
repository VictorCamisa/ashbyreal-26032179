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
            <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg">
              <ImageIcon className="h-5 w-5 text-[#8696a0]" />
              <span className="text-sm text-[#8696a0]">Imagem não disponível</span>
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
            <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg">
              <Video className="h-5 w-5 text-[#8696a0]" />
              <span className="text-sm text-[#8696a0]">Vídeo não disponível</span>
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
                className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors bg-[#00a884] hover:bg-[#00a884]/80"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" />
                )}
              </button>
              <audio 
                ref={audioRef} 
                src={message.media_url}
                onEnded={handleAudioEnded}
                className="hidden"
              />
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#8696a0]/40 rounded-full overflow-hidden">
                  <div className={`h-full bg-[#8696a0] rounded-full transition-all ${isPlaying ? 'w-1/2' : 'w-0'}`} />
                </div>
                <Mic className="h-4 w-4 text-[#8696a0]" />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg">
              <Mic className="h-5 w-5 text-[#8696a0]" />
              <span className="text-sm text-[#8696a0]">Áudio não disponível</span>
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors bg-black/20 hover:bg-black/30"
          >
            <FileText className="h-8 w-8 text-[#8696a0]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Documento</p>
              <p className="text-xs text-[#8696a0]">Clique para abrir</p>
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
        <p className="text-sm text-[#8696a0] italic">Sticker</p>
      );
    }

    // Texto padrão (conversation, extendedTextMessage, etc.)
    return message.body ? (
      <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
        {message.body}
      </p>
    ) : (
      <p className="text-sm text-[#8696a0] italic">Mensagem sem conteúdo</p>
    );
  };

  const renderStatus = () => {
    if (!message.from_me) return null;

    const status = message.status?.toLowerCase();
    
    if (status === 'read' || status === 'played') {
      return <CheckCheck className="h-4 w-4 text-[#53bdeb]" />;
    }
    if (status === 'delivered' || status === 'received') {
      return <CheckCheck className="h-4 w-4 text-[#8696a0]" />;
    }
    return <Check className="h-4 w-4 text-[#8696a0]" />;
  };

  return (
    <div className={`flex ${message.from_me ? 'justify-end' : 'justify-start'} mb-1 animate-fade-in`}>
      <div
        className={`
          max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm
          ${message.from_me
            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
          }
        `}
      >
        {renderContent()}
        <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
          <span className="text-[11px] text-[#8696a0]">
            {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
}
