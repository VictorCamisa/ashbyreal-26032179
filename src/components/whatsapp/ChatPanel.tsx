import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Mic, Paperclip, X, Smile, MoreVertical, Search, Check, CheckCheck, Image as ImageIcon, FileText, StopCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { formatDateShort } from '@/lib/dateUtils';
import { toast } from 'sonner';
import type { WhatsAppMessage, Conversation } from '@/hooks/useWhatsAppMessages';
import { MediaRenderer } from '@/components/whatsapp/MediaRenderer';

interface ChatPanelProps {
  conversation: Conversation | null;
  messages: WhatsAppMessage[];
  isLoading: boolean;
  onSendMessage: (message: string, messageType?: string, mediaUrl?: string) => Promise<void>;
  isSending: boolean;
}

export function ChatPanel({ conversation, messages, isLoading, onSendMessage, isSending }: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup recording interval
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [inputMessage]);

  const handleSend = async () => {
    if (isSending) return;

    if (selectedImage && imagePreview) {
      const caption = inputMessage.trim();
      setInputMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await onSendMessage(caption || '[Imagem]', 'image', base64);
      };
      reader.readAsDataURL(selectedImage);
      return;
    }

    if (!inputMessage.trim()) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    await onSendMessage(message, 'text');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 10MB');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setIsAttachOpen(false);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await onSendMessage('[Áudio]', 'audio', base64);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      audioChunksRef.current = [];
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return formatDateShort(date);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  const renderMessageContent = (msg: WhatsAppMessage) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div className="space-y-2">
            {msg.media_url && (
              <MediaRenderer
                kind="image"
                url={msg.media_url}
                alt="Imagem"
                className="max-w-[300px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              />
            )}
            {msg.content && msg.content !== '[Imagem]' && (
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="min-w-[240px]">
            {msg.media_url ? (
              <MediaRenderer kind="audio" url={msg.media_url} className="w-full h-12" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#00A884] flex items-center justify-center">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm">{msg.content || 'Áudio'}</span>
              </div>
            )}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-black/10 rounded-lg">
            <FileText className="h-10 w-10 text-[#00A884]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.content || 'Documento'}</p>
              <p className="text-xs opacity-60">Documento</p>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-2">
            {msg.media_url ? (
              <MediaRenderer kind="video" url={msg.media_url} className="max-w-[300px] rounded-lg" />
            ) : (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm">{msg.content || 'Vídeo'}</span>
              </div>
            )}
          </div>
        );
      case 'sticker':
        return <span className="text-4xl">🎨</span>;
      default:
        return <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>;
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#222E35]">
        <div className="text-center max-w-md px-8">
          {/* WhatsApp Logo */}
          <div className="w-64 h-64 mx-auto mb-8 flex items-center justify-center opacity-30">
            <svg viewBox="0 0 212 212" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
              <path fill="#6B8F91" d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z"/>
              <path fill="#222E35" d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.678 0 52.761-11.103 71.055-29.095v-.289s-.619-1.45-1.992-3.778a58.346 58.346 0 0 0-1.446-2.322zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-1.215-5.494 36.68 36.68 0 0 0-3.648-8.298 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 37.67 37.67 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-light text-[#E9EDEF] mb-4">
            Taubatéchopp WhatsApp
          </h1>
          <p className="text-[15px] text-[#8696A0] leading-relaxed">
            Selecione uma conversa ao lado para começar a enviar mensagens
          </p>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-8 flex items-center gap-2 text-[#667781] text-sm">
          <div className="h-4 w-4 flex items-center justify-center">
            <svg viewBox="0 0 10 12" height="12" width="10" preserveAspectRatio="xMidYMid meet">
              <path d="M5.00048 11.1248C2.37537 11.1248 0.250488 9.00001 0.250488 6.37488V5.24989C0.250488 2.62476 2.37537 0.499878 5.00048 0.499878C7.62559 0.499878 9.75048 2.62476 9.75048 5.24989V6.37488C9.75048 9.00001 7.62559 11.1248 5.00048 11.1248Z" fill="currentColor"/>
            </svg>
          </div>
          <span>Mensagens protegidas com criptografia</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0B141A]">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-[#202C33] border-b border-[#2A3942]/50 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer group">
          <Avatar className="h-10 w-10 ring-2 ring-[#2A3942] group-hover:ring-[#00A884] transition-all">
            <AvatarFallback className={cn(
              'text-white text-sm font-medium',
              getAvatarColor(conversation.contact_name)
            )}>
              {getInitials(conversation.contact_name)}
            </AvatarFallback>
          </Avatar>
          <div className="group-hover:translate-x-0.5 transition-transform">
            <h3 className="text-[17px] font-medium text-[#E9EDEF] group-hover:text-white transition-colors">
              {conversation.contact_name}
            </h3>
            <p className="text-[13px] text-[#8696A0]">
              {conversation.phone_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-[#AEBAC1]">
          <button className="p-2 rounded-full hover:bg-[#374248] transition-colors hover:text-white">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-[#374248] transition-colors hover:text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto"
        ref={scrollRef}
        style={{ 
          backgroundColor: '#0B141A',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23111B21' fill-opacity='0.4'%3E%3Cpath d='M20 20h10v10H20V20zm20 0h10v10H40V20zm20 0h10v10H60V20zm20 0h10v10H80V20zm20 0h10v10h-10V20zm20 0h10v10h-10V20zm20 0h10v10h-10V20zm20 0h10v10h-10V20z'/%3E%3Cpath d='M20 40h10v10H20V40zm40 0h10v10H60V40zm40 0h10v10h-10V40zm40 0h10v10h-10V40z'/%3E%3Cpath d='M20 60h10v10H20V60zm20 0h10v10H40V60zm20 0h10v10H60V60zm20 0h10v10H80V60zm20 0h10v10h-10V60zm20 0h10v10h-10V60zm20 0h10v10h-10V60zm20 0h10v10h-10V60z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-14 w-52 rounded-xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-8 py-6 bg-[#182229] rounded-xl">
              <p className="text-sm text-[#8696A0]">
                Esta é uma nova conversa. Envie uma mensagem para começar.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-[5%] md:px-[10%] lg:px-[15%] py-4 space-y-1">
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDateLabel = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));
              const isOutbound = msg.direction === 'outbound';
              const nextMsg = messages[index + 1];
              const isLastInGroup = !nextMsg || nextMsg.direction !== msg.direction || !isSameDay(new Date(nextMsg.created_at), new Date(msg.created_at));

              return (
                <div key={msg.id}>
                  {showDateLabel && (
                    <div className="flex justify-center my-4">
                      <span className="px-4 py-1.5 text-xs font-medium bg-[#182229] text-[#8696A0] rounded-lg shadow-lg">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={cn(
                    'flex animate-fade-in',
                    isOutbound ? 'justify-end' : 'justify-start',
                    !isLastInGroup ? 'mb-0.5' : 'mb-2'
                  )}>
                    <div
                      className={cn(
                        'relative max-w-[75%] md:max-w-[65%] rounded-xl px-3 py-2 shadow-md',
                        isOutbound
                          ? 'bg-[#005C4B] text-[#E9EDEF]'
                          : 'bg-[#202C33] text-[#E9EDEF]',
                        isLastInGroup && (isOutbound ? 'rounded-br-sm' : 'rounded-bl-sm')
                      )}
                    >
                      {renderMessageContent(msg)}
                      
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1',
                        'text-[11px]',
                        isOutbound ? 'text-white/60' : 'text-[#8696A0]'
                      )}>
                        <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isOutbound && (
                          <span className="text-[#53BDEB] ml-0.5">
                            {msg.status === 'read' ? (
                              <CheckCheck className="h-4 w-4" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="h-4 w-4 text-[#8696A0]" />
                            ) : (
                              <Check className="h-4 w-4 text-[#8696A0]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-4 bg-[#1F2C34] border-t border-[#2A3942]">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-h-40 rounded-xl shadow-lg" />
            <button
              onClick={clearSelectedImage}
              className="absolute -top-2 -right-2 h-7 w-7 bg-[#EF4444] hover:bg-[#DC2626] rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-4 py-3 flex items-end gap-2 bg-[#202C33] border-t border-[#2A3942]/50 shrink-0">
        {isRecording ? (
          // Recording UI
          <div className="flex-1 flex items-center gap-4 h-12 bg-[#1F2C34] rounded-xl px-4">
            <button
              onClick={cancelRecording}
              className="p-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="h-3 w-3 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="text-[#E9EDEF] font-medium text-lg tabular-nums">
                {formatRecordingTime(recordingTime)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="p-2.5 bg-[#00A884] hover:bg-[#00916F] rounded-full text-white transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        ) : (
          // Normal input UI
          <>
            <div className="flex items-center gap-1">
              <button className="p-2.5 text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition-colors">
                <Smile className="h-6 w-6" />
              </button>
              <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
                <PopoverTrigger asChild>
                  <button className="p-2.5 text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition-colors">
                    <Paperclip className="h-6 w-6" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-[#233138] border-[#2A3942]" align="start" side="top">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 px-4 py-2.5 text-[#E9EDEF] hover:bg-[#374248] rounded-lg transition-colors w-full"
                  >
                    <div className="h-10 w-10 rounded-full bg-[#BF59CF] flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium">Fotos e vídeos</span>
                  </button>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 flex items-end bg-[#2A3942] rounded-xl px-4 py-2">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite uma mensagem"
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#E9EDEF] placeholder:text-[#8696A0] resize-none max-h-[150px] py-1"
                style={{ minHeight: '24px' }}
              />
            </div>

            {inputMessage.trim() || selectedImage ? (
              <button
                onClick={handleSend}
                disabled={isSending}
                className="p-3 bg-[#00A884] hover:bg-[#00916F] disabled:opacity-50 rounded-full text-white transition-colors shadow-lg"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-3 text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition-colors"
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}