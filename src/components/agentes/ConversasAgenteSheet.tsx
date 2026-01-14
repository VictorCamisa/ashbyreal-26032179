import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, Phone, Calendar, Star, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AIAgent {
  id: string;
  name: string;
}

interface ConversasAgenteSheetProps {
  agent: AIAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Conversation {
  id: string;
  remote_jid: string;
  status: string;
  qualification_status: string;
  qualification_score: number;
  qualification_notes: string | null;
  transferred_at: string | null;
  transferred_reason: string | null;
  created_at: string;
  updated_at: string;
  clientes?: {
    id: string;
    nome: string;
    telefone: string;
  } | null;
  _count?: {
    messages: number;
  };
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export function ConversasAgenteSheet({ agent, open, onOpenChange }: ConversasAgenteSheetProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["ai-conversations", agent.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select(`
          *,
          clientes (
            id,
            nome,
            telefone
          )
        `)
        .eq("agent_id", agent.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Conversation[];
    },
    enabled: open,
  });

  // Fetch messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["ai-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];

      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", selectedConversation.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "qualified":
        return "bg-green-500/10 text-green-500";
      case "not_interested":
        return "bg-red-500/10 text-red-500";
      case "transferred":
        return "bg-blue-500/10 text-blue-500";
      default:
        return "bg-yellow-500/10 text-yellow-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "qualified":
        return "Qualificado";
      case "not_interested":
        return "Sem Interesse";
      case "transferred":
        return "Transferido";
      default:
        return "Pendente";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas: {agent.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 h-[calc(100vh-120px)]">
          {selectedConversation ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
                  ← Voltar
                </Button>
                <div className="flex-1">
                  <p className="font-medium">
                    {selectedConversation.clientes?.nome || selectedConversation.remote_jid}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.clientes?.telefone || selectedConversation.remote_jid.split("@")[0]}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedConversation.qualification_status)}>
                  {getStatusLabel(selectedConversation.qualification_status)}
                </Badge>
              </div>

              <ScrollArea className="flex-1 border rounded-lg p-4">
                <div className="space-y-3">
                  {messages?.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedConversation.qualification_notes && (
                <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-1">Notas de Qualificação:</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.qualification_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {conversation.clientes?.nome || "Lead"}
                            </span>
                          </div>
                          <Badge className={getStatusColor(conversation.qualification_status)}>
                            {getStatusLabel(conversation.qualification_status)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {conversation.clientes?.telefone ||
                              conversation.remote_jid.split("@")[0]}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(conversation.updated_at), "dd/MM HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                          {conversation.qualification_score > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Score: {conversation.qualification_score}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end mt-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                  <p className="text-sm text-muted-foreground">
                    As conversas aparecerão aqui quando o agente for ativado.
                  </p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
