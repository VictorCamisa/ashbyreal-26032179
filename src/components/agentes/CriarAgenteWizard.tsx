import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Bot, Check, ChevronLeft, ChevronRight, Database, 
  MessageSquare, Settings, Sparkles, Target, Zap,
  Rocket, ShoppingCart, UserCheck, HeadphonesIcon,
  Lightbulb, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CriarAgenteWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { id: 1, title: "Template", description: "Escolha um modelo base", icon: Sparkles },
  { id: 2, title: "Identidade", description: "Nome e personalidade", icon: Bot },
  { id: 3, title: "Comportamento", description: "Prompt e instruções", icon: MessageSquare },
  { id: 4, title: "Conhecimento", description: "Dados e contexto", icon: Database },
  { id: 5, title: "Qualificação", description: "Critérios de lead", icon: Target },
  { id: 6, title: "Configurações", description: "Modelo e parâmetros", icon: Settings },
  { id: 7, title: "Integração", description: "WhatsApp e ativação", icon: Zap },
];

const TEMPLATES = [
  {
    id: "vendas",
    name: "Vendedor de Chopp",
    description: "Qualifica leads interessados em comprar chopp para eventos e festas",
    icon: ShoppingCart,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    system_prompt: `Você é o assistente de vendas da Taubaté Chopp, especialista em ajudar clientes a planejar eventos perfeitos com nosso chopp artesanal.

## PERSONALIDADE
- Amigável, entusiasmado e profissional
- Conhecedor de cervejas e eventos
- Objetivo e eficiente nas respostas
- Nunca seja insistente ou agressivo

## OBJETIVO
Qualificar leads que responderam a campanhas de reativação, identificando:
1. Se há interesse genuíno em comprar
2. Detalhes do evento (tipo, data, quantidade de pessoas)
3. Localização para entrega
4. Urgência/prazo

## FLUXO DE CONVERSA
1. **Saudação calorosa** - Mostre que lembra do cliente
2. **Descoberta** - Pergunte sobre planos de eventos/ocasiões
3. **Qualificação** - Colete informações essenciais
4. **Sugestão** - Recomende produtos baseado no evento
5. **Transferência** - Quando qualificado, passe para humano

## INFORMAÇÕES PARA COLETAR
- Tipo de evento (aniversário, churrasco, festa, corporativo)
- Data do evento
- Número estimado de pessoas
- Endereço de entrega
- Produtos de interesse (tipos de chopp)

## REGRAS
- Responda sempre em português brasileiro
- Mantenha mensagens curtas (máximo 3 parágrafos)
- Use emojis com moderação (máximo 2 por mensagem)
- Se não souber algo, diga que vai verificar
- Nunca invente preços ou promoções`,
    greeting_message: "Olá! 👋 Que bom ver você por aqui novamente! Vi que você já conhece nosso chopp artesanal. Está planejando algum evento ou festa em breve?",
    transfer_keywords: ["quero comprar", "quero pedir", "fechar pedido", "falar com alguém", "orçamento", "quanto custa", "preço", "delivery", "entrega"],
    knowledge_tables: ["clientes", "pedidos", "produtos"],
    qualification_criteria: {
      fields: ["tipo_evento", "data_evento", "num_pessoas", "endereco"],
      min_score: 3
    }
  },
  {
    id: "reativacao",
    name: "Reativação de Clientes",
    description: "Reconquista clientes inativos com abordagem personalizada",
    icon: UserCheck,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    system_prompt: `Você é o assistente de relacionamento da Taubaté Chopp, responsável por reconectar com clientes que não compram há algum tempo.

## PERSONALIDADE
- Acolhedor e nostálgico
- Curioso sobre a experiência anterior
- Empático e não invasivo
- Focado em entender o cliente

## OBJETIVO
Reativar clientes inativos descobrindo:
1. Por que pararam de comprar
2. Se houve algum problema na experiência anterior
3. Se há interesse em voltar a comprar
4. O que poderia motivá-los a voltar

## FLUXO DE CONVERSA
1. **Reconexão** - Mostre que sentiu falta do cliente
2. **Descoberta gentil** - Pergunte como foram as coisas
3. **Escuta ativa** - Se houver problema, demonstre interesse em resolver
4. **Proposta de valor** - Mencione novidades, melhorias
5. **Convite suave** - Convide para um novo pedido

## TRATAMENTO DE OBJEÇÕES
- "Não preciso no momento" → Pergunte sobre ocasiões futuras
- "Estava caro" → Mencione opções econômicas ou kits
- "Tive problema" → Peça desculpas e ofereça compensação
- "Mudei" → Verifique se ainda está na área de entrega

## REGRAS
- Nunca force uma venda
- Ouça mais do que fala
- Agradeça pelo feedback, mesmo negativo
- Se o cliente não quer mais contato, respeite`,
    greeting_message: "Oi! 😊 Faz um tempinho que não nos falamos, né? Aqui é da Taubaté Chopp! Espero que esteja tudo bem por aí. Bateu uma saudade das nossas conversas!",
    transfer_keywords: ["quero voltar", "me interessei", "vou pedir", "qual promoção", "tem novidade", "podem entregar"],
    knowledge_tables: ["clientes", "pedidos", "produtos"],
    qualification_criteria: {
      fields: ["interesse_retorno", "motivo_inatividade", "disponibilidade"],
      min_score: 2
    }
  },
  {
    id: "suporte",
    name: "Suporte Básico",
    description: "Responde dúvidas comuns e direciona para atendimento",
    icon: HeadphonesIcon,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    system_prompt: `Você é o assistente de suporte da Taubaté Chopp, primeiro ponto de contato para dúvidas e solicitações.

## PERSONALIDADE
- Prestativo e paciente
- Claro e objetivo
- Solucionador de problemas
- Calmo mesmo sob pressão

## OBJETIVO
Fornecer suporte inicial e direcionar corretamente:
1. Responder dúvidas frequentes
2. Coletar informações para escalar
3. Identificar urgência
4. Tranquilizar o cliente

## TIPOS DE SOLICITAÇÃO

### Pode resolver:
- Horário de funcionamento
- Área de entrega
- Tipos de produto
- Como funciona o aluguel de barril
- Formas de pagamento

### Precisa escalar:
- Reclamações sobre pedidos
- Problemas de qualidade
- Solicitações de cancelamento
- Pedidos em andamento
- Negociação de preços

## FLUXO
1. Identifique o tipo de solicitação
2. Se puder resolver, resolva com clareza
3. Se precisar escalar, colete as informações necessárias
4. Informe que vai transferir para especialista
5. Tranquilize sobre tempo de resposta

## INFORMAÇÕES PARA ESCALAR
- Nome completo
- Número do pedido (se aplicável)
- Descrição do problema
- Urgência
- Melhor horário para contato`,
    greeting_message: "Olá! 👋 Sou o assistente virtual da Taubaté Chopp. Como posso ajudar você hoje?",
    transfer_keywords: ["reclamação", "problema", "cancelar", "meu pedido", "falar com atendente", "humano", "gerente", "supervisor"],
    knowledge_tables: ["clientes", "pedidos", "produtos", "barris"],
    qualification_criteria: {
      fields: ["tipo_solicitacao", "urgencia"],
      min_score: 1
    }
  },
  {
    id: "custom",
    name: "Criar do Zero",
    description: "Configure tudo manualmente para casos específicos",
    icon: Lightbulb,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    system_prompt: `Você é um assistente virtual. Configure este prompt de acordo com suas necessidades.

## PERSONALIDADE
[Defina a personalidade do agente]

## OBJETIVO
[Qual é o objetivo principal deste agente?]

## FLUXO DE CONVERSA
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

## REGRAS
- [Regra 1]
- [Regra 2]
- [Regra 3]`,
    greeting_message: "Olá! Como posso ajudar você hoje?",
    transfer_keywords: ["falar com atendente", "humano"],
    knowledge_tables: [],
    qualification_criteria: {
      fields: [],
      min_score: 1
    }
  }
];

const AVAILABLE_MODELS = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini Flash Lite", description: "Ultra rápido e econômico. Ideal para tarefas simples.", cost: "$", speed: "Muito rápido" },
  { value: "google/gemini-2.5-flash", label: "Gemini Flash", description: "Equilibrado entre custo e qualidade. Recomendado.", cost: "$", speed: "Muito rápido" },
  { value: "google/gemini-2.5-pro", label: "Gemini Pro", description: "Alta qualidade. Melhor raciocínio e contexto.", cost: "$$", speed: "Rápido" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", description: "Nova geração, velocidade e capacidade.", cost: "$$", speed: "Rápido" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", description: "O melhor modelo. Máxima qualidade.", cost: "$$$", speed: "Moderado" },
];

const AVAILABLE_TABLES = [
  { value: "clientes", label: "Clientes", description: "Nome, telefone, histórico, ticket médio", icon: "👤" },
  { value: "pedidos", label: "Pedidos", description: "Últimos pedidos, valores, datas, status", icon: "📦" },
  { value: "produtos", label: "Produtos", description: "Catálogo, preços, estoque, descrições", icon: "🍺" },
  { value: "leads", label: "Leads", description: "Status de qualificação, interesse", icon: "🎯" },
  { value: "barris", label: "Barris", description: "Barris do cliente, devoluções pendentes", icon: "🛢️" },
];

const QUALIFICATION_FIELDS = [
  { id: "tipo_evento", label: "Tipo de Evento", description: "Aniversário, churrasco, corporativo, etc." },
  { id: "data_evento", label: "Data do Evento", description: "Quando o cliente precisa do produto" },
  { id: "num_pessoas", label: "Número de Pessoas", description: "Estimativa de convidados" },
  { id: "endereco", label: "Endereço de Entrega", description: "Local para delivery" },
  { id: "orcamento", label: "Orçamento", description: "Quanto pretende gastar" },
  { id: "interesse_retorno", label: "Interesse em Retornar", description: "Para reativação" },
  { id: "motivo_inatividade", label: "Motivo da Inatividade", description: "Por que parou de comprar" },
  { id: "urgencia", label: "Urgência", description: "Nível de pressa do cliente" },
];

export function CriarAgenteWizard({ open, onOpenChange }: CriarAgenteWizardProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    model: "google/gemini-2.5-flash",
    system_prompt: "",
    greeting_message: "",
    knowledge_tables: [] as string[],
    transfer_keywords: [] as string[],
    temperature: 0.7,
    max_tokens: 1000,
    instance_id: "",
    is_active: false,
    qualification_criteria: {
      fields: [] as string[],
      min_score: 2
    }
  });

  // Fetch WhatsApp instances
  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances-connected"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, name, status, phone_number")
        .order("name");

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
        temperature: formData.temperature,
        max_tokens: formData.max_tokens,
        instance_id: formData.instance_id || null,
        is_active: formData.is_active,
        qualification_criteria: formData.qualification_criteria,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("🎉 Agente criado com sucesso!");
      handleClose();
    },
    onError: (error) => {
      toast.error("Erro ao criar agente: " + error.message);
    },
  });

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setFormData({
      name: "",
      description: "",
      model: "google/gemini-2.5-flash",
      system_prompt: "",
      greeting_message: "",
      knowledge_tables: [],
      transfer_keywords: [],
      temperature: 0.7,
      max_tokens: 1000,
      instance_id: "",
      is_active: false,
      qualification_criteria: { fields: [], min_score: 2 }
    });
    onOpenChange(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData(prev => ({
        ...prev,
        name: template.name,
        description: template.description,
        system_prompt: template.system_prompt,
        greeting_message: template.greeting_message,
        transfer_keywords: template.transfer_keywords,
        knowledge_tables: template.knowledge_tables,
        qualification_criteria: template.qualification_criteria
      }));
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return !!selectedTemplate;
      case 2: return !!formData.name.trim();
      case 3: return !!formData.system_prompt.trim();
      case 4: return true;
      case 5: return true;
      case 6: return true;
      case 7: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      createAgentMutation.mutate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Escolha um template para começar</h3>
              <p className="text-sm text-muted-foreground">
                Templates vêm pré-configurados para casos de uso comuns. Você pode personalizar tudo depois.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEMPLATES.map((template) => (
                <Card 
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedTemplate === template.id ? "ring-2 ring-primary" : ""
                  )}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg border", template.color)}>
                        <template.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                      </div>
                      {selectedTemplate === template.id && (
                        <Check className="ml-auto h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{template.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Identidade do Agente</h3>
              <p className="text-sm text-muted-foreground">
                Dê um nome e descrição para identificar facilmente este agente
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Nome do Agente *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vendedor de Chopp, Atendente Virtual..."
                  className="text-lg h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Este nome aparecerá na lista de agentes para você identificar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-base">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva brevemente o propósito deste agente..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting" className="text-base">Mensagem de Saudação</Label>
                <Textarea
                  id="greeting"
                  value={formData.greeting_message}
                  onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                  placeholder="Primeira mensagem que o agente enviará..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta é a primeira mensagem enviada quando o agente inicia uma conversa
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Comportamento e Instruções</h3>
              <p className="text-sm text-muted-foreground">
                O prompt do sistema define como o agente se comporta e responde
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt" className="text-base">Prompt do Sistema *</Label>
                  <Badge variant="outline" className="text-xs">
                    {formData.system_prompt.length} caracteres
                  </Badge>
                </div>
                <Textarea
                  id="prompt"
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Instruções detalhadas para o agente..."
                  rows={16}
                  className="font-mono text-sm"
                />
              </div>

              <Card className="bg-amber-500/5 border-amber-500/20">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-600 mb-1">Dicas para um bom prompt:</p>
                      <ul className="text-muted-foreground space-y-1 text-xs">
                        <li>• Defina claramente a personalidade e tom de voz</li>
                        <li>• Liste os objetivos principais da conversa</li>
                        <li>• Especifique o que o agente deve coletar</li>
                        <li>• Inclua regras e limitações importantes</li>
                        <li>• Defina quando deve transferir para humano</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-base">Keywords de Transferência</Label>
                <Input
                  value={formData.transfer_keywords.join(", ")}
                  onChange={(e) => setFormData({
                    ...formData,
                    transfer_keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean)
                  })}
                  placeholder="quero comprar, falar com atendente, orçamento..."
                />
                <p className="text-xs text-muted-foreground">
                  Separe por vírgula. Quando detectadas, o lead é marcado para transferência
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Base de Conhecimento</h3>
              <p className="text-sm text-muted-foreground">
                Selecione quais dados do Supabase o agente pode consultar
              </p>
            </div>

            <div className="grid gap-3">
              {AVAILABLE_TABLES.map((table) => (
                <Card 
                  key={table.value}
                  className={cn(
                    "cursor-pointer transition-all",
                    formData.knowledge_tables.includes(table.value) 
                      ? "ring-2 ring-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => {
                    const newTables = formData.knowledge_tables.includes(table.value)
                      ? formData.knowledge_tables.filter(t => t !== table.value)
                      : [...formData.knowledge_tables, table.value];
                    setFormData({ ...formData, knowledge_tables: newTables });
                  }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{table.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{table.label}</p>
                        <p className="text-sm text-muted-foreground">{table.description}</p>
                      </div>
                      {formData.knowledge_tables.includes(table.value) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Database className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="text-sm text-muted-foreground">
                    <p>O agente poderá buscar informações nestas tabelas durante as conversas.</p>
                    <p className="mt-1">Exemplo: buscar histórico de compras pelo telefone do cliente.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Critérios de Qualificação</h3>
              <p className="text-sm text-muted-foreground">
                Defina quais informações o agente deve coletar para qualificar o lead
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Campos para Coletar</Label>
              <div className="grid gap-2">
                {QUALIFICATION_FIELDS.map((field) => (
                  <Card 
                    key={field.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      formData.qualification_criteria.fields.includes(field.id) 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => {
                      const newFields = formData.qualification_criteria.fields.includes(field.id)
                        ? formData.qualification_criteria.fields.filter(f => f !== field.id)
                        : [...formData.qualification_criteria.fields, field.id];
                      setFormData({
                        ...formData,
                        qualification_criteria: { ...formData.qualification_criteria, fields: newFields }
                      });
                    }}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{field.label}</p>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        </div>
                        {formData.qualification_criteria.fields.includes(field.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">
                  Score Mínimo para Qualificação: {formData.qualification_criteria.min_score}
                </Label>
                <Badge variant="outline">
                  {formData.qualification_criteria.fields.length} campo(s) selecionado(s)
                </Badge>
              </div>
              <Slider
                value={[formData.qualification_criteria.min_score]}
                onValueChange={([value]) => setFormData({
                  ...formData,
                  qualification_criteria: { ...formData.qualification_criteria, min_score: value }
                })}
                min={1}
                max={Math.max(formData.qualification_criteria.fields.length, 1)}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                O lead será considerado qualificado quando {formData.qualification_criteria.min_score} ou mais campos forem coletados
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Configurações do Modelo</h3>
              <p className="text-sm text-muted-foreground">
                Escolha o modelo de IA e ajuste os parâmetros de resposta
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Modelo de IA</Label>
              <div className="grid gap-3">
                {AVAILABLE_MODELS.map((model) => (
                  <Card 
                    key={model.value}
                    className={cn(
                      "cursor-pointer transition-all",
                      formData.model === model.value 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setFormData({ ...formData, model: model.value })}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{model.label}</p>
                            <Badge variant="secondary" className="text-xs">{model.cost}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{model.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Velocidade: {model.speed}</p>
                        </div>
                        {formData.model === model.value && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-base">
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
                  Baixo = focado e consistente. Alto = criativo e variado.
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-base">
                  Max Tokens: {formData.max_tokens}
                </Label>
                <Slider
                  value={[formData.max_tokens]}
                  onValueChange={([value]) => setFormData({ ...formData, max_tokens: value })}
                  min={100}
                  max={4000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Tamanho máximo da resposta do agente.
                </p>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Integração e Ativação</h3>
              <p className="text-sm text-muted-foreground">
                Conecte o agente a uma instância do WhatsApp
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Instância do WhatsApp</Label>
              <Select
                value={formData.instance_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, instance_id: value === "none" ? "" : value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Selecione uma instância..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma instância</SelectItem>
                  {instances?.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id || "unknown"}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          instance.status === "connected" ? "bg-green-500" : "bg-gray-400"
                        )} />
                        <span>{instance.name}</span>
                        {instance.phone_number && (
                          <span className="text-muted-foreground">({instance.phone_number})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O agente responderá automaticamente mensagens recebidas nesta instância
              </p>
            </div>

            {formData.instance_id && (
              <Card className="bg-green-500/5 border-green-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600" />
                    <div className="text-sm">
                      <p className="font-medium text-green-600">Integração Configurada</p>
                      <p className="text-muted-foreground">
                        O agente será vinculado a esta instância do WhatsApp
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Resumo da Configuração</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{formData.name || "-"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Modelo</p>
                  <p className="font-medium">{AVAILABLE_MODELS.find(m => m.value === formData.model)?.label}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Tabelas de Conhecimento</p>
                  <p className="font-medium">{formData.knowledge_tables.length || "Nenhuma"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Campos de Qualificação</p>
                  <p className="font-medium">{formData.qualification_criteria.fields.length || "Nenhum"}</p>
                </div>
              </div>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Rocket className="h-5 w-5 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium">Pronto para criar!</p>
                    <p className="text-muted-foreground">
                      Clique em "Criar Agente" para finalizar. Você poderá testar e ajustar depois.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header with progress */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Criar Novo Agente de IA</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Passo {currentStep} de {STEPS.length}: {STEPS[currentStep - 1].description}
              </p>
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <step.icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>

          <Progress value={progress} className="h-1 mt-2" />
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between bg-background">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createAgentMutation.isPending}
            >
              {currentStep === STEPS.length ? (
                createAgentMutation.isPending ? (
                  <>Criando...</>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Criar Agente
                  </>
                )
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}