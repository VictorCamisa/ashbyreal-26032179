import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Loader2, Bot, User, Minimize2, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionsExecuted?: Array<{ tool: string; result: any }>;
}

interface SystemAssistantProps {
  moduleName: string;
  moduleContext: string;
}

const ACTION_LABELS: Record<string, string> = {
  criar_pedido: "Pedido criado",
  alterar_status_pedido: "Status alterado",
  listar_pedidos: "Pedidos consultados",
  criar_oportunidade: "Lead criado",
  mover_lead: "Lead movido",
  listar_leads: "Leads consultados",
  criar_transacao: "Transação lançada",
  resumo_financeiro: "Resumo gerado",
  listar_contas_vencer: "Contas listadas",
  listar_pendencias: "Pendências listadas",
  listar_documentos_fiscais: "Documentos listados",
  resolver_pendencia: "Pendência resolvida",
};

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

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) inputRef.current.focus();
  }, [isOpen, isMinimized]);

  const getGreeting = useCallback(() => {
    const actionModules = ["Pedidos", "CRM", "Financeiro", "Contabilidade"];
    const hasActions = actionModules.includes(moduleName);
    
    if (hasActions) {
      const examples: Record<string, string> = {
        "Pedidos": 'Posso **criar pedidos**, **alterar status** e **consultar vendas** direto aqui. Experimente: _"Cria um pedido de 2 barris de Chopp Pilsen para o Bar do João"_',
        "CRM": 'Posso **criar leads**, **mover no funil** e **listar oportunidades**. Experimente: _"Registra o lead Maria, tel 12 99999-0000"_',
        "Financeiro": 'Posso **lançar receitas/despesas**, **ver resumo financeiro** e **listar contas a vencer**. Experimente: _"Quanto entrou e saiu esse mês?"_',
        "Contabilidade": 'Posso **listar pendências fiscais**, **consultar notas** e **resolver pendências**. Experimente: _"Quais pendências fiscais estão abertas?"_',
      };
      return `⚡ Olá! Sou seu assistente com **poder de ação** no módulo **${moduleName}**.\n\n${examples[moduleName] || ""}`;
    }
    return `Olá! 👋 Estou aqui para te ajudar com o módulo **${moduleName}**. O que precisa?`;
  }, [moduleName]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ role: "assistant", content: getGreeting(), timestamp: new Date() }]);
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
          conversation_history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data?.response || "Desculpe, não consegui processar.",
        timestamp: new Date(),
        actionsExecuted: data?.actions_executed,
      }]);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro. Tente novamente.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, height: isMinimized ? "auto" : "min(600px, calc(100vh - 140px))" }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-20 lg:bottom-6 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[400px]",
              "bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Assistente IA</h3>
                  <p className="text-xs opacity-80">{moduleName} • Com ações</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setIsMinimized(!isMinimized)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="flex-1 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn("flex gap-3", message.role === "user" ? "flex-row-reverse" : "flex-row")}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                            {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className="max-w-[80%] space-y-2">
                            {/* Action badges */}
                            {message.actionsExecuted && message.actionsExecuted.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {message.actionsExecuted.map((action, i) => (
                                  <span
                                    key={i}
                                    className={cn(
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                                      action.result?.error
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    )}
                                  >
                                    {action.result?.error ? <AlertCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                    {ACTION_LABELS[action.tool] || action.tool}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm",
                              message.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}>
                              <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} className="leading-relaxed" />
                              <span className={cn(
                                "text-[10px] mt-1 block",
                                message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {isLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Executando...</span>
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
                          placeholder="Peça uma ação ou faça uma pergunta..."
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
                      <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="h-12 w-12 rounded-xl shrink-0">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      ⚡ Este assistente executa ações reais no sistema
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
