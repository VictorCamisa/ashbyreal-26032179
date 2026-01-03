import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Image, FileText, Mic, MessageSquare, Paperclip, X, Play, Square } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { WhatsAppMessage, Conversation } from '@/hooks/useWhatsAppMessages';

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
      
      // Convert to base64 for sending
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

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        stream.getTracks().forEach(track => track.stop());
        
        // Convert to base64
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
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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
              <img 
                src={msg.media_url} 
                alt="Imagem" 
                className="max-w-[250px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(msg.media_url!, '_blank')}
              />
            )}
            {msg.content && msg.content !== '[Imagem]' && (
              <p className="text-sm">{msg.content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="min-w-[200px]">
            {msg.media_url ? (
              <audio 
                controls 
                className="w-full h-10"
                preload="metadata"
              >
                <source src={msg.media_url} type="audio/ogg" />
                <source src={msg.media_url} type="audio/mpeg" />
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mic className="h-4 w-4" />
                </div>
                <span className="text-sm">{msg.content || 'Áudio'}</span>
              </div>
            )}
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
            <FileText className="h-8 w-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.content || 'Documento'}</p>
              <p className="text-xs text-muted-foreground">Documento</p>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="space-y-1">
            {msg.media_url ? (
              <video 
                controls 
                className="max-w-[250px] rounded-lg"
                preload="metadata"
              >
                <source src={msg.media_url} type="video/mp4" />
                Seu navegador não suporta vídeo.
              </video>
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
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30">
        <MessageSquare className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Selecione uma conversa</h3>
        <p className="text-sm text-muted-foreground/70">
          Escolha uma conversa na lista para começar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(conversation.contact_name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{conversation.contact_name}</h3>
          <p className="text-sm text-muted-foreground">
            +{conversation.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const prevMsg = messages[index - 1];
              const showDateLabel = !prevMsg || !isSameDay(new Date(prevMsg.created_at), new Date(msg.created_at));

              return (
                <div key={msg.id}>
                  {showDateLabel && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg px-3 py-2',
                        msg.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-muted rounded-bl-none'
                      )}
                    >
                      {renderMessageContent(msg)}
                      <div className={cn(
                        'flex items-center justify-end gap-1 mt-1',
                        msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        <span className="text-[10px]">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {msg.direction === 'outbound' && (
                          <span className="text-[10px]">
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
      </ScrollArea>

      {/* Image Preview */}
      {imagePreview && (
        <div className="p-4 border-t bg-card">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg" />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={clearSelectedImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-card">
        {isRecording ? (
          // Recording UI
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              onClick={cancelRecording}
              className="h-11 w-11 text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3">
              <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${Math.min(recordingTime * 2, 100)}%` }}
                />
              </div>
            </div>
            
            <Button
              size="icon"
              onClick={stopRecording}
              className="h-11 w-11 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          // Normal input UI
          <div className="flex items-end gap-2">
            {/* Attach button */}
            <Popover open={isAttachOpen} onOpenChange={setIsAttachOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-11 w-11 shrink-0"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" side="top" align="start">
                <div className="grid gap-1">
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image className="h-4 w-4 text-blue-500" />
                    <span>Imagem</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-start gap-2"
                    onClick={() => {
                      toast.info('Documentos em breve!');
                      setIsAttachOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span>Documento</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Textarea
              placeholder="Digite uma mensagem..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            
            {inputMessage.trim() || selectedImage ? (
              <Button 
                onClick={handleSend} 
                disabled={isSending}
                size="icon"
                className="h-11 w-11 shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            ) : (
              <Button 
                onClick={startRecording}
                size="icon"
                variant="ghost"
                className="h-11 w-11 shrink-0"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
