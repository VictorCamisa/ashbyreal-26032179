import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Loader2, Bot, User, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SystemAssistantProps {
  moduleName: string;
  moduleContext: string;
}

export function SystemAssistant({ moduleName, moduleContext }: SystemAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Generate contextual greeting based on module
  const getGreeting = useCallback(() => {
    const greetings: Record<string, string> = {
      "Dashboard": "Olá! 👋 Estou aqui para te ajudar a entender os indicadores e métricas do seu negócio. Pode me perguntar sobre vendas, faturamento ou qualquer KPI que apareça aqui!",
      "Clientes": "Olá! 👋 Posso te ajudar a gerenciar sua base de clientes e lojistas. Quer saber como cadastrar um novo cliente, importar uma lista ou entender os status?",
      "CRM": "Olá! 👋 Aqui você gerencia suas oportunidades de venda. Posso explicar como funciona o pipeline, como mover leads entre etapas ou criar novas oportunidades!",
      "Pedidos": "Olá! 👋 Estou aqui para ajudar com a gestão de pedidos. Pode me perguntar como criar um pedido, acompanhar entregas ou gerar comprovantes!",
      "Barris": "Olá! 👋 Posso te ajudar no controle de barris. Quer saber como registrar saídas, devoluções ou verificar onde estão seus barris?",
      "Estoque": "Olá! 👋 Aqui você controla seu estoque de produtos. Posso explicar como dar entrada em chopp, ajustar quantidades ou cadastrar novos produtos!",
      "Financeiro": "Olá! 👋 Posso te ajudar com o módulo financeiro. Pergunte sobre lançamentos, boletos, cartões, DRE ou qualquer controle de fluxo de caixa!",
      "Contabilidade": "Olá! 👋 Estou aqui para ajudar com documentos fiscais e contabilidade. Posso explicar como emitir notas, reconciliar pagamentos ou resolver pendências!",
      "WhatsApp": "Olá! 👋 Posso te ajudar com o módulo de WhatsApp. Quer saber como enviar mensagens, criar campanhas ou configurar instâncias?",
      "Agente IA": "Olá! 👋 Aqui você configura agentes de IA para atendimento. Posso explicar como criar um agente, definir prompts ou ativar em uma instância!",
      "Configurações": "Olá! 👋 Posso te ajudar com as configurações do sistema. Pergunte sobre usuários, permissões ou qualquer ajuste do sistema!"
    };
    return greetings[moduleName] || `Olá! 👋 Estou aqui para te ajudar com o módulo de **${moduleName}**. O que você gostaria de saber?`;
  }, [moduleName]);

  // Add greeting when chat opens for first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: getGreeting(),
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length, getGreeting]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("system-assistant", {
        body: {
          message: userMessage,
          module_name: moduleName,
          module_context: moduleContext,
          conversation_history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data?.response || "Desculpe, não consegui processar sua pergunta.",
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 lg:bottom-6 right-4 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-success"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? "auto" : "min(600px, calc(100vh - 140px))"
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-20 lg:bottom-6 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[400px]",
              "bg-background border border-border rounded-2xl shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                  <p className="text-xs opacity-80">{moduleName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "flex gap-3",
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            message.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          )}>
                            {message.role === "user" 
                              ? <User className="h-4 w-4" />
                              : <Bot className="h-4 w-4" />
                            }
                          </div>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}>
                            <div 
                              dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                              className="leading-relaxed"
                            />
                            <span className={cn(
                              "text-[10px] mt-1 block",
                              message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                            )}>
                              {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </motion.div>
                      ))}

                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex gap-3"
                        >
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Digite sua pergunta..."
                          className={cn(
                            "w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50",
                            "placeholder:text-muted-foreground",
                            "min-h-[48px] max-h-[120px]"
                          )}
                          rows={1}
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className="h-12 w-12 rounded-xl shrink-0"
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Pressione Enter para enviar • Shift+Enter para nova linha
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
