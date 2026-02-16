import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface NovoAgenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini Flash (Recomendado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini Pro (Alta qualidade)" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Nova geração)" },
];

const AVAILABLE_TABLES = [
  { value: "clientes", label: "Clientes" },
  { value: "pedidos", label: "Pedidos" },
  { value: "produtos", label: "Produtos" },
  { value: "leads", label: "Leads" },
];

export function NovoAgenteDialog({ open, onOpenChange }: NovoAgenteDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    model: "google/gemini-2.5-flash",
    system_prompt: `Você é um assistente de vendas da Taubaté Chopp. Seu objetivo é qualificar leads que responderam a uma campanha de reativação.

INSTRUÇÕES:
1. Seja amigável e profissional
2. Identifique o interesse do cliente em comprar chopp
3. Colete informações sobre quantidade desejada, data do evento, endereço
4. Se o cliente demonstrar interesse real, sinalize para transferência humana

QUALIFICAÇÃO:
- Pergunta inicial sobre evento/ocasião
- Quantidade aproximada de pessoas
- Data desejada para entrega
- Endereço de entrega

TRANSFERÊNCIA:
Quando identificar interesse genuíno, diga: "Que ótimo! Vou transferir você para um de nossos especialistas que vai finalizar seu pedido."`,
    greeting_message: "Olá! 👋 Vi que você já conhece nosso chopp! Está planejando algum evento ou festa em breve?",
    knowledge_tables: ["clientes", "pedidos", "produtos"],
    transfer_keywords: ["quero comprar", "quero pedir", "fechar pedido", "falar com alguém"],
  });

  // Fetch WhatsApp instances
  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, name, status")
        .eq("status", "connected");

      if (error) throw error;
      return data;
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ai_agents").insert({
        name: formData.name,
        description: formData.description || null,
        model: formData.model,
        system_prompt: formData.system_prompt,
        greeting_message: formData.greeting_message || null,
        knowledge_tables: formData.knowledge_tables,
        transfer_keywords: formData.transfer_keywords,
        temperature: 0.7,
        max_tokens: 1000,
        is_active: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente criado com sucesso!");
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        model: "google/gemini-2.5-flash",
        system_prompt: formData.system_prompt,
        greeting_message: formData.greeting_message,
        knowledge_tables: ["clientes", "pedidos", "produtos"],
        transfer_keywords: ["quero comprar", "quero pedir", "fechar pedido", "falar com alguém"],
      });
    },
    onError: (error) => {
      toast.error("Erro ao criar agente: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.system_prompt) {
      toast.error("Preencha nome e prompt do sistema");
      return;
    }
    createAgentMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Agente de IA</DialogTitle>
          <DialogDescription>
            Configure um agente para qualificar leads automaticamente via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Assistente de Vendas"
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
              placeholder="Breve descrição do propósito do agente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de Saudação</Label>
            <Textarea
              id="greeting"
              value={formData.greeting_message}
              onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
              placeholder="Primeira mensagem enviada ao lead"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt do Sistema *</Label>
            <Textarea
              id="prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              placeholder="Instruções detalhadas para o agente..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Este é o prompt que define o comportamento do agente. Seja específico sobre objetivos
              e critérios de qualificação.
            </p>
          </div>

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
              O agente terá acesso a essas tabelas para buscar informações relevantes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords de Transferência</Label>
            <Input
              id="keywords"
              value={formData.transfer_keywords.join(", ")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  transfer_keywords: e.target.value.split(",").map((k) => k.trim()),
                })
              }
              placeholder="quero comprar, falar com alguém, fechar pedido"
            />
            <p className="text-xs text-muted-foreground">
              Quando o lead usar essas palavras, será sinalizado para transferência humana.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createAgentMutation.isPending}>
              {createAgentMutation.isPending ? "Criando..." : "Criar Agente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
