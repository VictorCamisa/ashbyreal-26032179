import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Volume2 } from "lucide-react";

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
  elevenlabs_voice_id: string | null;
}

interface ElevenLabsVoice {
  id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

interface ConfigurarAgenteDialogProps {
  agent: AIAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido e econômico)" },
  { value: "gpt-4o", label: "GPT-4o (Equilibrado)" },
  { value: "gpt-4.1-2025-04-14", label: "GPT-4.1 (Mais recente e poderoso)" },
  { value: "gpt-5-mini-2025-08-07", label: "GPT-5 Mini (Nova geração, eficiente)" },
  { value: "gpt-5-2025-08-07", label: "GPT-5 (Flagship - máxima qualidade)" },
  { value: "o4-mini-2025-04-16", label: "O4 Mini (Raciocínio avançado)" },
];

const AVAILABLE_TABLES = [
  { value: "clientes", label: "Clientes" },
  { value: "pedidos", label: "Pedidos" },
  { value: "produtos", label: "Produtos" },
  { value: "leads", label: "Leads" },
  { value: "barris", label: "Barris" },
];

export function ConfigurarAgenteDialog({ agent, open, onOpenChange }: ConfigurarAgenteDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description || "",
    model: agent.model,
    system_prompt: agent.system_prompt,
    greeting_message: agent.greeting_message || "",
    knowledge_tables: agent.knowledge_tables || [],
    transfer_keywords: agent.transfer_keywords || [],
    temperature: agent.temperature || 0.7,
    max_tokens: agent.max_tokens || 1000,
    instance_id: agent.instance_id || "",
    qualification_criteria: agent.qualification_criteria || {},
    elevenlabs_voice_id: agent.elevenlabs_voice_id || "XrExE9yKIg1WjnnlVkGX",
  });

  // Sync form data when agent changes
  useEffect(() => {
    setFormData({
      name: agent.name,
      description: agent.description || "",
      model: agent.model,
      system_prompt: agent.system_prompt,
      greeting_message: agent.greeting_message || "",
      knowledge_tables: agent.knowledge_tables || [],
      transfer_keywords: agent.transfer_keywords || [],
      temperature: agent.temperature || 0.7,
      max_tokens: agent.max_tokens || 1000,
      instance_id: agent.instance_id || "",
      qualification_criteria: agent.qualification_criteria || {},
      elevenlabs_voice_id: agent.elevenlabs_voice_id || "XrExE9yKIg1WjnnlVkGX",
    });
  }, [agent]);

  // Fetch WhatsApp instances
  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, name, status")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch ElevenLabs voices
  const { data: elevenLabsVoices, isLoading: isLoadingVoices } = useQuery({
    queryKey: ["elevenlabs-voices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("elevenlabs-voices");
      if (error) throw error;
      return data?.voices as ElevenLabsVoice[] || [];
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ai_agents")
        .update({
          name: formData.name,
          description: formData.description || null,
          model: formData.model,
          system_prompt: formData.system_prompt,
          greeting_message: formData.greeting_message || null,
          knowledge_tables: formData.knowledge_tables,
          transfer_keywords: formData.transfer_keywords,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          instance_id: formData.instance_id || null,
          qualification_criteria: formData.qualification_criteria,
          elevenlabs_voice_id: formData.elevenlabs_voice_id || null,
        })
        .eq("id", agent.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar agente: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.system_prompt) {
      toast.error("Preencha nome e prompt do sistema");
      return;
    }
    updateAgentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Agente: {agent.name}</DialogTitle>
          <DialogDescription>
            Ajuste as configurações do agente de IA.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="conhecimento">Conhecimento</TabsTrigger>
              <TabsTrigger value="integracao">Integração</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Agente *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Modelo de IA</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Temperatura: {formData.temperature.toFixed(1)}
                </Label>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={([value]) => setFormData({ ...formData, temperature: value })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Valores mais altos = respostas mais criativas. Valores mais baixos = respostas mais focadas.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Máximo de Tokens: {formData.max_tokens}</Label>
                <Slider
                  value={[formData.max_tokens]}
                  onValueChange={([value]) => setFormData({ ...formData, max_tokens: value })}
                  min={100}
                  max={4000}
                  step={100}
                />
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="greeting">Mensagem de Saudação</Label>
                <Textarea
                  id="greeting"
                  value={formData.greeting_message}
                  onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt do Sistema *</Label>
                <Textarea
                  id="prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords de Transferência</Label>
                <Input
                  id="keywords"
                  value={formData.transfer_keywords.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transfer_keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Separe por vírgula. Ex: quero comprar, falar com atendente
                </p>
              </div>
            </TabsContent>

            <TabsContent value="conhecimento" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tabelas de Conhecimento</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TABLES.map((table) => (
                    <Button
                      key={table.value}
                      type="button"
                      variant={formData.knowledge_tables.includes(table.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newTables = formData.knowledge_tables.includes(table.value)
                          ? formData.knowledge_tables.filter((t) => t !== table.value)
                          : [...formData.knowledge_tables, table.value];
                        setFormData({ ...formData, knowledge_tables: newTables });
                      }}
                    >
                      {table.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  O agente poderá consultar essas tabelas para buscar informações do cliente.
                </p>
              </div>

              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Como funciona:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Clientes:</strong> Nome, telefone, histórico de compras</li>
                  <li>• <strong>Pedidos:</strong> Últimos pedidos, valores, status</li>
                  <li>• <strong>Produtos:</strong> Catálogo, preços, disponibilidade</li>
                  <li>• <strong>Leads:</strong> Status de qualificação, interesse</li>
                  <li>• <strong>Barris:</strong> Barris do cliente, devoluções pendentes</li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="integracao" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Instância WhatsApp</Label>
                <Select
                  value={formData.instance_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, instance_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {instances?.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name} ({instance.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule este agente a uma instância do WhatsApp para ativar a automação.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Voz para Respostas em Áudio (ElevenLabs)</Label>
                {isLoadingVoices ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando vozes...
                  </div>
                ) : (
                  <Select
                    value={formData.elevenlabs_voice_id}
                    onValueChange={(value) => setFormData({ ...formData, elevenlabs_voice_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma voz" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {elevenLabsVoices?.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <Volume2 className="h-3 w-3" />
                            {voice.name}
                            <span className="text-xs text-muted-foreground">
                              ({voice.category})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Quando o cliente enviar um áudio, o agente responderá com áudio usando esta voz.
                </p>
              </div>

              {formData.instance_id && (
                <div className="p-4 border rounded-lg bg-green-500/10">
                  <h4 className="font-medium text-green-600 mb-2">✓ Integração Ativa</h4>
                  <p className="text-sm text-muted-foreground">
                    Quando este agente estiver ativo, ele responderá automaticamente às mensagens
                    recebidas nesta instância do WhatsApp.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateAgentMutation.isPending}>
              {updateAgentMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
