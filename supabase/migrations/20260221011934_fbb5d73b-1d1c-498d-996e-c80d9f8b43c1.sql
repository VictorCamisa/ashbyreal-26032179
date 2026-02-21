
-- Tabela de notificações recorrentes
CREATE TABLE public.notification_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  report_type text NOT NULL DEFAULT 'vendas_dia',
  frequency text NOT NULL DEFAULT 'DIARIA',
  send_time time NOT NULL DEFAULT '08:00',
  day_of_week integer, -- 0=domingo, 6=sábado (para semanal)
  day_of_month integer, -- 1-28 (para mensal)
  recipient_user_id uuid NOT NULL,
  instance_id uuid REFERENCES public.whatsapp_instances(id),
  recipient_phone text,
  is_active boolean DEFAULT true,
  last_sent_at timestamptz,
  custom_prompt text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage notification_schedules"
ON public.notification_schedules FOR ALL
USING (true) WITH CHECK (true);

CREATE TRIGGER update_notification_schedules_updated_at
BEFORE UPDATE ON public.notification_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
