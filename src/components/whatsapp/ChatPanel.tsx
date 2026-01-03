import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Image, FileText, Mic, Paperclip, X, Smile, MoreVertical, Search, Phone, Video } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { WhatsAppMessage, Conversation } from '@/hooks/useWhatsAppMessages';
import { MediaRenderer } from '@/components/whatsapp/MediaRenderer';
import { chatBackgroundPatternDark } from './WhatsAppTheme';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleSend = async () => {
    if (isSending) return;

    // Send image if selected
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

    // Send text message
    if (!inputMessage.trim()) return;
    
    const message = inputMessage.trim();
    setInputMessage('');
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
    if (isToday(date)) return 'HOJE';
    if (isYesterday(date)) return 'ONTEM';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageContent = (msg: WhatsAppMessage) => {
    switch (msg.message_type) {
      case 'image':
        return (
          <div className="space-y-1">
            {msg.media_url && (
              <MediaRenderer
                kind="image"
                url={msg.media_url}
                alt="Imagem"
                className="max-w-[330px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              />
            )}
            {msg.content && msg.content !== '[Imagem]' && (
              <p className="text-[14.2px] leading-[19px]">{msg.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="min-w-[200px]">
            {msg.media_url ? (
              <MediaRenderer kind="audio" url={msg.media_url} className="w-full h-10" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#00A884] flex items-center justify-center">
                  <Mic className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm">{msg.content || 'Áudio'}</span>
              </div>
            )}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-black/5 rounded">
            <FileText className="h-8 w-8 text-[#00A884]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.content || 'Documento'}</p>
              <p className="text-xs opacity-60">Documento</p>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-1">
            {msg.media_url ? (
              <MediaRenderer kind="video" url={msg.media_url} className="max-w-[330px] rounded-lg" />
            ) : (
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="text-sm">{msg.content || 'Vídeo'}</span>
              </div>
            )}
          </div>
        );
      case 'sticker':
        return <span className="text-2xl">🎨 Figurinha</span>;
      default:
        return <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  // Empty state - WhatsApp Web style
  if (!conversation) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-full"
        style={{ backgroundColor: '#222E35' }}
      >
        <div className="text-center max-w-[560px] px-8">
          <div className="w-[320px] h-[188px] mx-auto mb-10 flex items-center justify-center">
            <svg viewBox="0 0 303 172" width="320" height="188" preserveAspectRatio="xMidYMid meet" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M229.565 160.229C262.212 149.245 286.931 118.241 283.39 73.4194C278.009 5.31929 212.365 -11.5738 171.472 8.48673C115.998 35.6999 108.478 40.3167 69.293 28.5765C30.108 16.8363 -17.7597 76.0314 8.17017 119.069C34.1001 162.107 40.0497 176.065 98.0497 162.107C135.55 152.852 174.617 157.661 197.943 160.019C206.703 160.925 218.32 163.828 229.565 160.229Z" fill="#364147"></path>
              <path fillRule="evenodd" clipRule="evenodd" d="M131.589 68.9422C131.589 86.0365 115.756 99.8967 96.5765 99.8967C84.0615 99.8967 73.1714 93.7873 67.0538 84.6374C66.0074 91.3851 62.6811 97.5286 57.7136 102.009C54.9875 104.464 52.3005 106.54 49.4867 107.906C47.5633 108.835 44.4069 109.937 41.3635 110.475C40.1544 110.689 38.9293 110.77 37.7026 110.77C36.8073 110.77 35.9114 110.716 35.0168 110.609C29.8292 109.975 24.3824 108.103 19.2122 105.418C17.6255 104.567 15.8385 103.281 14.1203 102.008C11.1727 99.8149 8.54345 97.5263 7.35553 96.5804C6.88447 96.2042 6.41342 95.8281 5.94237 95.4519C6.28771 95.1277 6.63113 94.8012 6.97265 94.4724C13.1922 88.4924 18.0515 81.1498 19.4562 73.0429C6.49467 64.5617 -1.74451 51.0344 0.352031 35.6128C3.52886 11.4385 30.7519 0.509766 52.82 0.509766C67.6385 0.509766 80.768 6.04151 89.5765 14.7433C98.3851 6.04151 111.515 0.509766 126.333 0.509766C153.321 0.509766 175.18 18.9234 175.18 41.6814C175.18 55.8331 166.065 68.2407 152.529 75.6081C151.049 76.4117 149.536 77.1594 147.994 77.8486C140.936 74.8198 136.583 72.099 131.589 68.9422Z" fill="#6B8F91"></path>
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-[#E9EDEF] mb-4">
            WhatsApp Web
          </h1>
          <p className="text-[14px] text-[#8696A0] leading-[20px]">
            Envie e receba mensagens sem precisar manter seu celular online.
            <br />
            Use o WhatsApp em até 4 aparelhos conectados e 1 celular ao mesmo tempo.
          </p>
        </div>
        <div className="absolute bottom-6 flex items-center gap-2 text-[#8696A0] text-xs">
          <svg viewBox="0 0 10 12" height="12" width="10" preserveAspectRatio="xMidYMid meet">
            <path d="M5.00048 11.1248C2.37537 11.1248 0.250488 9.00001 0.250488 6.37488V5.24989C0.250488 2.62476 2.37537 0.499878 5.00048 0.499878C7.62559 0.499878 9.75048 2.62476 9.75048 5.24989V6.37488C9.75048 9.00001 7.62559 11.1248 5.00048 11.1248ZM5.00048 1.49988C2.93275 1.49988 1.25049 3.18213 1.25049 5.24989V6.37488C1.25049 8.44261 2.93275 10.1249 5.00048 10.1249C7.06821 10.1249 8.75048 8.44261 8.75048 6.37488V5.24989C8.75048 3.18213 7.06821 1.49988 5.00048 1.49988Z" fill="currentColor"></path>
          </svg>
          <span>Suas mensagens pessoais são protegidas com a criptografia de ponta a ponta</span>
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

      {/* WhatsApp Header */}
      <div className="h-[59px] px-4 flex items-center justify-between bg-[#202C33] shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarFallback className="bg-[#6B7C85] text-white text-sm">
              {getInitials(conversation.contact_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-[16px] font-normal text-[#E9EDEF]">{conversation.contact_name}</h3>
            <p className="text-[13px] text-[#8696A0]">
              clique aqui para ver o perfil
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[#AEBAC1]">
          <Search className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
          <MoreVertical className="h-5 w-5 cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-[63px] py-2"
        ref={scrollRef}
        style={{ 
          backgroundColor: '#0B141A',
          backgroundImage: chatBackgroundPatternDark,
        }}
      >
        {isLoading ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[#8696A0]">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-[2px] py-2">
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDateLabel = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));
              const isOutbound = msg.direction === 'outbound';

              return (
                <div key={msg.id}>
                  {showDateLabel && (
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-[6px] text-[12.5px] bg-[#182229] text-[#8696A0] rounded-lg shadow-sm">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={cn('flex mb-[2px]', isOutbound ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'relative max-w-[65%] rounded-lg px-[9px] py-[6px] shadow-sm',
                        isOutbound
                          ? 'bg-[#005C4B] text-[#E9EDEF]'
                          : 'bg-[#202C33] text-[#E9EDEF]'
                      )}
                      style={{
                        borderTopRightRadius: isOutbound ? '0' : undefined,
                        borderTopLeftRadius: !isOutbound ? '0' : undefined,
                      }}
                    >
                      {/* Message tail */}
                      <div 
                        className={cn(
                          'absolute top-0 w-[8px] h-[13px]',
                          isOutbound ? '-right-[8px]' : '-left-[8px]'
                        )}
                        style={{
                          backgroundImage: isOutbound 
                            ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 8 13' width='8' height='13' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.188 0H0v13l8-6.5L5.188 0z' fill='%23005C4B'/%3E%3C/svg%3E")`
                            : `url("data:image/svg+xml,%3Csvg viewBox='0 0 8 13' width='8' height='13' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.812 0H8v13L0 6.5 2.812 0z' fill='%23202C33'/%3E%3C/svg%3E")`,
                        }}
                      />
                      
                      {renderMessageContent(msg)}
                      
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1 -mb-[3px]',
                        'text-[11px]',
                        isOutbound ? 'text-[#FFFFFF99]' : 'text-[#8696A0]'
                      )}>
                        <span>{format(new Date(msg.created_at), 'HH:mm')}</span>
                        {isOutbound && (
                          <span className="text-[#53BDEB]">
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
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
        <div className="px-4 py-3 bg-[#1F2C34] border-t border-[#2A3942]">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
            <button
              onClick={clearSelectedImage}
              className="absolute -top-2 -right-2 h-6 w-6 bg-[#EF4444] rounded-full flex items-center justify-center"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="h-[62px] px-4 flex items-center gap-2 bg-[#202C33] shrink-0">
        {isRecording ? (
          // Recording UI
          <>
            <button
              onClick={cancelRecording}
              className="h-[42px] w-[42px] flex items-center justify-center text-[#EF4444] hover:bg-[#2A3942] rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex-1 flex items-center gap-3 px-3">
              <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-[#E9EDEF]">{formatRecordingTime(recordingTime)}</span>
              <div className="flex-1 h-1 bg-[#374248] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${Math.min(recordingTime * 2, 100)}%` }}
                />
              </div>
            </div>
            
            <button
              onClick={stopRecording}
              className="h-[42px] w-[42px] flex items-center justify-center bg-[#00A884] text-white rounded-full hover:bg-[#008069] transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </>
        ) : (
          // Normal input UI
          <>
            <button className="h-[42px] w-[42px] flex items-center justify-center text-[#8696A0] hover:text-[#E9EDEF] transition-colors">
              <Smile className="h-[26px] w-[26px]" />
            </button>
            
            {/* Attach button */}
            <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
              <PopoverTrigger asChild>
                <button className="h-[42px] w-[42px] flex items-center justify-center text-[#8696A0] hover:text-[#E9EDEF] transition-colors">
                  <Paperclip className="h-[26px] w-[26px] rotate-45" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-[#233138] border-none shadow-lg" side="top" align="start">
                <div className="grid gap-1">
                  <button
                    className="flex items-center gap-3 px-3 py-2 text-[#E9EDEF] hover:bg-[#374248] rounded transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="h-[40px] w-[40px] rounded-full bg-[#0063CB] flex items-center justify-center">
                      <Image className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm">Fotos e vídeos</span>
                  </button>
                  <button
                    className="flex items-center gap-3 px-3 py-2 text-[#E9EDEF] hover:bg-[#374248] rounded transition-colors"
                    onClick={() => {
                      toast.info('Documentos em breve!');
                      setIsAttachOpen(false);
                    }}
                  >
                    <div className="h-[40px] w-[40px] rounded-full bg-[#7F66FF] flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm">Documento</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Digite uma mensagem"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full h-[42px] px-3 bg-[#2A3942] text-[#E9EDEF] text-[15px] rounded-lg border-none outline-none placeholder:text-[#8696A0]"
              />
            </div>
            
            {inputMessage.trim() || selectedImage ? (
              <button 
                onClick={handleSend} 
                disabled={isSending}
                className="h-[42px] w-[42px] flex items-center justify-center text-[#8696A0] hover:text-[#E9EDEF] transition-colors disabled:opacity-50"
              >
                {isSending ? (
                  <Loader2 className="h-[26px] w-[26px] animate-spin" />
                ) : (
                  <Send className="h-[26px] w-[26px]" />
                )}
              </button>
            ) : (
              <button 
                onClick={startRecording}
                className="h-[42px] w-[42px] flex items-center justify-center text-[#8696A0] hover:text-[#E9EDEF] transition-colors"
              >
                <Mic className="h-[26px] w-[26px]" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
