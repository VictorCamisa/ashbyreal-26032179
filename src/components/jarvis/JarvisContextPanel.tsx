import { AlertCircle, Brain, Check, Loader2, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { JARVIS_ACTIVITY, JARVIS_MEMORY } from "./mock";
import type { JarvisSkill } from "./types";

interface JarvisContextPanelProps {
  skills: JarvisSkill[];
  onToggleSkill: (key: string, enabled: boolean) => void;
}

const ACTIVITY_ICON = {
  done: <Check className="h-3 w-3 text-success" />,
  running: <Loader2 className="h-3 w-3 animate-spin text-primary" />,
  failed: <AlertCircle className="h-3 w-3 text-destructive" />,
} as const;

export function JarvisContextPanel({ skills, onToggleSkill }: JarvisContextPanelProps) {
  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <Tabs defaultValue="habilidades" className="flex h-full flex-col">
      <div className="p-3 pb-0">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="habilidades" className="rounded-lg text-xs">
            Habilidades
          </TabsTrigger>
          <TabsTrigger value="memoria" className="rounded-lg text-xs">
            Memória
          </TabsTrigger>
          <TabsTrigger value="atividade" className="rounded-lg text-xs">
            Atividade
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="habilidades" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 py-3">
          <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">
            O Jarvis só enxerga os módulos habilitados aqui.{" "}
            <span className="text-foreground/80">{enabledCount} de {skills.length} ativos.</span>
          </p>
          <div className="space-y-1.5">
            {skills.map((skill) => (
              <div
                key={skill.key}
                className={cn(
                  "rounded-xl border p-2.5 transition-colors duration-200",
                  skill.enabled ? "border-primary/25 bg-primary/[0.04]" : "border-border/50 bg-card",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                      skill.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <skill.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium text-foreground">{skill.label}</p>
                      <Switch
                        checked={skill.enabled}
                        onCheckedChange={(checked) => onToggleSkill(skill.key, checked)}
                        aria-label={`Habilitar ${skill.label}`}
                        className="ml-auto scale-75"
                      />
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {skill.description}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1.5 h-4 px-1.5 text-[9px] font-normal uppercase tracking-wide",
                        skill.scope === "leitura e escrita" && "border-warning/40 text-warning",
                      )}
                    >
                      {skill.scope}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="memoria" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 py-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">O que o Jarvis lembra sobre a operação.</p>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">Adicionar memória</span>
            </Button>
          </div>
          <div className="space-y-2">
            {JARVIS_MEMORY.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/50 bg-card p-2.5">
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 shrink-0 text-chart-3" />
                  <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground/70">{item.origin}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="atividade" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full px-3 py-3">
          <div className="space-y-3">
            {JARVIS_ACTIVITY.map((item) => (
              <div key={item.id} className="flex gap-2.5">
                <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border/60 bg-card">
                  {ACTIVITY_ICON[item.state]}
                </div>
                <div className="min-w-0 flex-1 border-b border-border/40 pb-3">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.detail}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {item.at.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-3">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Ações automáticas ficarão registradas aqui quando o agente entrar em operação.
            </p>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
}
