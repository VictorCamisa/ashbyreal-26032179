import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Settings, MessageSquare, Trash2, TestTube, Sparkles, Target, Zap, MoreHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CriarAgenteWizard } from "@/components/agentes/CriarAgenteWizard";
import { ConfigurarAgenteDialog } from "@/components/agentes/ConfigurarAgenteDialog";
import { TestarAgenteDialog } from "@/components/agentes/TestarAgenteDialog";
import { ConversasAgenteSheet } from "@/components/agentes/ConversasAgenteSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  knowledge_tables: string[];
  qualification_criteria: Record<string, any>;
  transfer_keywords: string[];
  greeting_message: string | null;
  instance_id: string | null;
  is_active: boolean;
  created_at: string;
  elevenlabs_voice_id: string | null;
  whatsapp_instances?: { id: string; name: string; status: string } | null;
}

const MODEL_LABELS: Record<string, string> = {
  "gpt-4o-mini": "GPT-4o Mini",
  "gpt-4o": "GPT-4o",
  "gpt-4-turbo": "GPT-4 Turbo"
};

export default function AgenteIA() {
  const queryClient = useQueryClient();
  const [criarAgenteOpen, setCriarAgenteOpen] = useState(false);
  const [configurarAgente, setConfigurarAgente] = useState<AIAgent | null>(null);
  const [testarAgente, setTestarAgente] = useState<AIAgent | null>(null);
  const [conversasAgente, setConversasAgente] = useState<AIAgent | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select(`*, whatsapp_instances (id, name, status)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AIAgent[];
    },
  });

  const { data: conversationCounts } = useQuery({
    queryKey: ["ai-conversation-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_conversations").select("agent_id, id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(conv => { counts[conv.agent_id] = (counts[conv.agent_id] || 0) + 1; });
      return counts;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ai_agents").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success(variables.is_active ? "Agente ativado!" : "Agente desativado!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente excluído!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const clearAllConversationsMutation = useMutation({
    mutationFn: async () => {
      // First delete all messages (using gte with a very old date to match all)
      const { error: msgError } = await supabase.from("ai_messages").delete().gte("created_at", "1970-01-01");
      if (msgError) throw msgError;
      // Then delete all conversations
      const { error: convError } = await supabase.from("ai_conversations").delete().gte("created_at", "1970-01-01");
      if (convError) throw convError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai-conversation-counts"] });
      toast.success("Histórico de conversas zerado!");
    },
    onError: (error) => toast.error("Erro ao zerar: " + error.message),
  });

  return (
    <PageLayout title="Agentes de IA" subtitle="Crie e gerencie agentes para qualificação automática de leads">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{agents?.length || 0}</p><p className="text-xs text-muted-foreground">Agentes</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><Zap className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{agents?.filter(a => a.is_active).length || 0}</p><p className="text-xs text-muted-foreground">Ativos</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><MessageSquare className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{Object.values(conversationCounts || {}).reduce((a, b) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Conversas</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><Target className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">-</p><p className="text-xs text-muted-foreground">Qualificados</p></div></div></CardContent></Card>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Button onClick={() => setCriarAgenteOpen(true)} size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />Criar Novo Agente
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className="gap-2">
              <RotateCcw className="h-4 w-4" />Zerar Histórico
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zerar histórico de conversas?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá excluir TODAS as conversas e mensagens de todos os agentes. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => clearAllConversationsMutation.mutate()} 
                className="bg-destructive text-destructive-foreground"
                disabled={clearAllConversationsMutation.isPending}
              >
                {clearAllConversationsMutation.isPending ? "Zerando..." : "Zerar Tudo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Card key={i} className="animate-pulse"><CardHeader><div className="h-6 bg-muted rounded w-1/2" /></CardHeader><CardContent><div className="h-24 bg-muted rounded" /></CardContent></Card>)}</div>
      ) : agents?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.id} className={cn("relative hover:shadow-md transition-all", agent.is_active && "border-green-500/30")}>
              <div className={cn("absolute top-3 right-3 w-2 h-2 rounded-full", agent.is_active ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", agent.is_active ? "bg-primary/10" : "bg-muted")}><Bot className={cn("h-5 w-5", agent.is_active ? "text-primary" : "text-muted-foreground")} /></div>
                  <div className="flex-1 min-w-0"><CardTitle className="text-base truncate">{agent.name}</CardTitle><CardDescription className="text-xs truncate">{agent.description || "Sem descrição"}</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={agent.is_active ? "default" : "secondary"} className="text-xs">{agent.is_active ? "Ativo" : "Inativo"}</Badge>
                  <Badge variant="outline" className="text-xs">{MODEL_LABELS[agent.model] || agent.model}</Badge>
                  {agent.whatsapp_instances && <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">📱 {agent.whatsapp_instances.name}</Badge>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/50"><p className="text-lg font-semibold">{agent.knowledge_tables?.length || 0}</p><p className="text-[10px] text-muted-foreground">Tabelas</p></div>
                  <div className="p-2 rounded-lg bg-muted/50"><p className="text-lg font-semibold">{agent.transfer_keywords?.length || 0}</p><p className="text-[10px] text-muted-foreground">Keywords</p></div>
                  <div className="p-2 rounded-lg bg-muted/50"><p className="text-lg font-semibold">{conversationCounts?.[agent.id] || 0}</p><p className="text-[10px] text-muted-foreground">Conversas</p></div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2"><Switch checked={agent.is_active} onCheckedChange={checked => toggleActiveMutation.mutate({ id: agent.id, is_active: checked })} /><span className="text-xs text-muted-foreground">{agent.is_active ? "Ativo" : "Inativo"}</span></div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTestarAgente(agent)}><TestTube className="h-4 w-4 mr-2" />Testar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfigurarAgente(agent)}><Settings className="h-4 w-4 mr-2" />Configurar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConversasAgente(agent)}><MessageSquare className="h-4 w-4 mr-2" />Conversas</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir agente?</AlertDialogTitle><AlertDialogDescription>Todas as conversas serão excluídas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteAgentMutation.mutate(agent.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"><Bot className="h-8 w-8 text-primary" /></div>
          <h3 className="text-xl font-semibold mb-2">Crie seu primeiro agente de IA</h3>
          <p className="text-muted-foreground mb-6">Agentes qualificam leads automaticamente via WhatsApp.</p>
          <Button onClick={() => setCriarAgenteOpen(true)} size="lg" className="gap-2"><Sparkles className="h-4 w-4" />Criar Agente</Button>
        </Card>
      )}

      <CriarAgenteWizard open={criarAgenteOpen} onOpenChange={setCriarAgenteOpen} />
      {configurarAgente && <ConfigurarAgenteDialog agent={configurarAgente} open={!!configurarAgente} onOpenChange={open => !open && setConfigurarAgente(null)} />}
      {testarAgente && <TestarAgenteDialog agent={testarAgente} open={!!testarAgente} onOpenChange={open => !open && setTestarAgente(null)} />}
      {conversasAgente && <ConversasAgenteSheet agent={conversasAgente} open={!!conversasAgente} onOpenChange={open => !open && setConversasAgente(null)} />}
    </PageLayout>
  );
}