import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Plus, Settings, MessageSquare, Trash2, TestTube } from "lucide-react";
import { toast } from "sonner";
import { NovoAgenteDialog } from "@/components/agentes/NovoAgenteDialog";
import { ConfigurarAgenteDialog } from "@/components/agentes/ConfigurarAgenteDialog";
import { TestarAgenteDialog } from "@/components/agentes/TestarAgenteDialog";
import { ConversasAgenteSheet } from "@/components/agentes/ConversasAgenteSheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  whatsapp_instances?: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export default function AgenteIA() {
  const queryClient = useQueryClient();
  const [novoAgenteOpen, setNovoAgenteOpen] = useState(false);
  const [configurarAgente, setConfigurarAgente] = useState<AIAgent | null>(null);
  const [testarAgente, setTestarAgente] = useState<AIAgent | null>(null);
  const [conversasAgente, setConversasAgente] = useState<AIAgent | null>(null);

  // Fetch agents
  const { data: agents, isLoading } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select(`
          *,
          whatsapp_instances (
            id,
            name,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AIAgent[];
    },
  });

  // Toggle agent active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_agents")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Status do agente atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });

  // Delete agent
  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir agente: " + error.message);
    },
  });

  return (
    <PageLayout
      title="Agentes de IA"
      subtitle="Crie e gerencie agentes de IA para qualificação de leads"
    >

      <div className="mb-6">
        <Button onClick={() => setNovoAgenteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    {agent.name}
                  </CardTitle>
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: agent.id, is_active: checked })
                    }
                  />
                </div>
                <CardDescription>{agent.description || "Sem descrição"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={agent.is_active ? "default" : "secondary"}>
                    {agent.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{agent.model}</Badge>
                  {agent.whatsapp_instances && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      {agent.whatsapp_instances.name}
                    </Badge>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Tabelas:</strong>{" "}
                    {agent.knowledge_tables?.length > 0
                      ? agent.knowledge_tables.join(", ")
                      : "Nenhuma"}
                  </p>
                  <p>
                    <strong>Keywords transferência:</strong>{" "}
                    {agent.transfer_keywords?.length > 0
                      ? agent.transfer_keywords.slice(0, 3).join(", ")
                      : "Nenhuma"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigurarAgente(agent)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestarAgente(agent)}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Testar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConversasAgente(agent)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Conversas
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. Todas as conversas e mensagens do
                          agente também serão excluídas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteAgentMutation.mutate(agent.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum agente criado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro agente de IA para começar a qualificar leads automaticamente.
          </p>
          <Button onClick={() => setNovoAgenteOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Agente
          </Button>
        </Card>
      )}

      <NovoAgenteDialog open={novoAgenteOpen} onOpenChange={setNovoAgenteOpen} />

      {configurarAgente && (
        <ConfigurarAgenteDialog
          agent={configurarAgente}
          open={!!configurarAgente}
          onOpenChange={(open) => !open && setConfigurarAgente(null)}
        />
      )}

      {testarAgente && (
        <TestarAgenteDialog
          agent={testarAgente}
          open={!!testarAgente}
          onOpenChange={(open) => !open && setTestarAgente(null)}
        />
      )}

      {conversasAgente && (
        <ConversasAgenteSheet
          agent={conversasAgente}
          open={!!conversasAgente}
          onOpenChange={(open) => !open && setConversasAgente(null)}
        />
      )}
    </PageLayout>
  );
}
