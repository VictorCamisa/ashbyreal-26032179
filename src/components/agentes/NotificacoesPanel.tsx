import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, Plus, Trash2, Clock, Send, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const REPORT_TYPES = [
  { value: "vendas_dia", label: "📊 Vendas do Dia", description: "Resumo completo das vendas realizadas hoje" },
  { value: "leads_base", label: "🎯 Leads na Base", description: "Quantidade e status dos leads cadastrados" },
  { value: "pedidos_pendentes", label: "📦 Pedidos Pendentes", description: "Pedidos que ainda não foram entregues" },
  { value: "estoque_baixo", label: "⚠️ Estoque Baixo", description: "Produtos com estoque abaixo do mínimo" },
  { value: "financeiro_resumo", label: "💰 Resumo Financeiro", description: "Entradas, saídas e saldo do dia" },
  { value: "barris_campo", label: "🍺 Barris em Campo", description: "Barris com clientes que precisam retornar" },
  { value: "boletos_vencer", label: "📅 Boletos a Vencer", description: "Boletos com vencimento próximo" },
  { value: "relatorio_completo", label: "📋 Relatório Completo", description: "Visão geral de todos os indicadores" },
];

const FREQUENCIES = [
  { value: "DIARIA", label: "Diária" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "MENSAL", label: "Mensal" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

interface NotificationSchedule {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  frequency: string;
  send_time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  recipient_user_id: string;
  instance_id: string | null;
  recipient_phone: string | null;
  is_active: boolean;
  last_sent_at: string | null;
  custom_prompt: string | null;
  created_at: string;
}

export function NotificacoesPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    report_type: "vendas_dia",
    frequency: "DIARIA",
    send_time: "08:00",
    day_of_week: 1,
    day_of_month: 1,
    recipient_user_id: "",
    instance_id: "",
    recipient_phone: "",
    custom_prompt: "",
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["notification-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NotificationSchedule[];
    },
    enabled: open,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, telefone")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, name, instance_name, status")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open || createOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notification_schedules").insert({
        name: form.name,
        description: form.description || null,
        report_type: form.report_type,
        frequency: form.frequency,
        send_time: form.send_time,
        day_of_week: form.frequency === "SEMANAL" ? form.day_of_week : null,
        day_of_month: form.frequency === "MENSAL" ? form.day_of_month : null,
        recipient_user_id: form.recipient_user_id,
        instance_id: form.instance_id || null,
        recipient_phone: form.recipient_phone || null,
        custom_prompt: form.custom_prompt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-schedules"] });
      toast.success("Notificação criada com sucesso!");
      setCreateOpen(false);
      setForm({
        name: "", description: "", report_type: "vendas_dia", frequency: "DIARIA",
        send_time: "08:00", day_of_week: 1, day_of_month: 1,
        recipient_user_id: "", instance_id: "", recipient_phone: "", custom_prompt: "",
      });
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("notification_schedules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["notification-schedules"] });
      toast.success(v.is_active ? "Notificação ativada!" : "Notificação desativada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-schedules"] });
      toast.success("Notificação excluída!");
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (schedule: NotificationSchedule) => {
      setSendingId(schedule.id);
      const { data, error } = await supabase.functions.invoke("send-notification-report", {
        body: { scheduleId: schedule.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-schedules"] });
      toast.success("Relatório enviado com sucesso via WhatsApp! ✅");
      setSendingId(null);
    },
    onError: (e) => {
      toast.error("Erro ao enviar: " + e.message);
      setSendingId(null);
    },
  });

  const getRecipientName = (userId: string) => {
    const profile = profiles?.find(p => p.id === userId);
    return profile?.nome || "Desconhecido";
  };

  const getReportLabel = (type: string) => {
    return REPORT_TYPES.find(r => r.value === type)?.label || type;
  };

  const getFrequencyLabel = (freq: string, dayOfWeek?: number | null, dayOfMonth?: number | null) => {
    if (freq === "SEMANAL" && dayOfWeek !== null && dayOfWeek !== undefined) {
      return `Semanal - ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label}`;
    }
    if (freq === "MENSAL" && dayOfMonth) {
      return `Mensal - Dia ${dayOfMonth}`;
    }
    return FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  // Auto-fill phone when user selected
  const handleRecipientChange = (userId: string) => {
    setForm(prev => ({ ...prev, recipient_user_id: userId }));
    const profile = profiles?.find(p => p.id === userId);
    if (profile?.telefone) {
      setForm(prev => ({ ...prev, recipient_phone: profile.telefone! }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações Recorrentes
          </SheetTitle>
          <SheetDescription>
            Configure relatórios automáticos enviados via WhatsApp
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button onClick={() => setCreateOpen(true)} className="w-full gap-2">
            <Plus className="h-4 w-4" /> Nova Notificação
          </Button>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-4"><div className="h-16 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : !schedules?.length ? (
            <Card className="p-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação configurada</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <Card key={s.id} className={s.is_active ? "border-primary/20" : "opacity-60"}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{s.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={checked => toggleMutation.mutate({ id: s.id, is_active: checked })}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">{getReportLabel(s.report_type)}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {s.send_time?.slice(0, 5)} • {getFrequencyLabel(s.frequency, s.day_of_week, s.day_of_month)}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                        👤 {getRecipientName(s.recipient_user_id)}
                      </Badge>
                    </div>

                    {s.last_sent_at && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        Último envio: {new Date(s.last_sent_at).toLocaleString("pt-BR")}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 flex-1"
                        disabled={sendingId === s.id}
                        onClick={() => sendNowMutation.mutate(s)}
                      >
                        {sendingId === s.id ? (
                          <><span className="animate-spin">⏳</span> Enviando...</>
                        ) : (
                          <><Send className="h-3 w-3" /> Enviar Agora</>
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(s.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Notificação Recorrente</DialogTitle>
              <DialogDescription>Configure um relatório automático via WhatsApp</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nome da Notificação *</Label>
                <Input
                  placeholder="Ex: Resumo diário de vendas"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={100}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder="Breve descrição do que será enviado"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={200}
                />
              </div>

              <div>
                <Label>Tipo de Relatório *</Label>
                <Select value={form.report_type} onValueChange={v => setForm(prev => ({ ...prev, report_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <div>
                          <span>{r.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequência *</Label>
                  <Select value={form.frequency} onValueChange={v => setForm(prev => ({ ...prev, frequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Horário de Envio *</Label>
                  <Input
                    type="time"
                    value={form.send_time}
                    onChange={e => setForm(prev => ({ ...prev, send_time: e.target.value }))}
                  />
                </div>
              </div>

              {form.frequency === "SEMANAL" && (
                <div>
                  <Label>Dia da Semana</Label>
                  <Select value={String(form.day_of_week)} onValueChange={v => setForm(prev => ({ ...prev, day_of_week: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(d => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.frequency === "MENSAL" && (
                <div>
                  <Label>Dia do Mês</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={form.day_of_month}
                    onChange={e => setForm(prev => ({ ...prev, day_of_month: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              )}

              <div>
                <Label>Destinatário (Usuário do Sistema) *</Label>
                <Select value={form.recipient_user_id} onValueChange={handleRecipientChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome || "Sem nome"} {p.telefone ? `(${p.telefone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Telefone WhatsApp do Destinatário *</Label>
                <Input
                  placeholder="5511999999999"
                  value={form.recipient_phone}
                  onChange={e => setForm(prev => ({ ...prev, recipient_phone: e.target.value }))}
                  maxLength={20}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Formato: código do país + DDD + número (sem espaços)</p>
              </div>

              <div>
                <Label>Instância WhatsApp</Label>
                <Select value={form.instance_id} onValueChange={v => setForm(prev => ({ ...prev, instance_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a instância" /></SelectTrigger>
                  <SelectContent>
                    {instances?.map(i => (
                      <SelectItem key={i.id} value={i.id}>
                        📱 {i.name} ({i.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Instruções Adicionais (opcional)</Label>
                <Textarea
                  placeholder="Ex: Inclua também o top 3 produtos mais vendidos e destaque clientes novos"
                  value={form.custom_prompt}
                  onChange={e => setForm(prev => ({ ...prev, custom_prompt: e.target.value }))}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.recipient_user_id || !form.recipient_phone || createMutation.isPending}
              >
                {createMutation.isPending ? "Criando..." : "Criar Notificação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
