import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Nem todo prospect chega pelo WhatsApp — feira, indicação, telefonema.
 * O card entra pelo mesmo caminho das conversas: se o telefone já for de um
 * cliente ou lojista conhecido, ele nasce direto no quadro de Operação.
 */
export function NovoContatoDialog() {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', origem: 'Manual', observacoes: '' });
  const queryClient = useQueryClient();

  const salvar = async () => {
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    if (!nome || !telefone) {
      toast.error('Nome e telefone são obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const { data: cardId, error } = await supabase.rpc('crm_upsert_contato' as never, {
        p_telefone: telefone,
        p_nome: nome,
        p_remote_jid: null,
        p_origem: form.origem || 'Manual',
      } as never);

      if (error) throw error;
      if (!cardId) throw new Error('Telefone inválido.');

      if (form.observacoes.trim()) {
        await supabase
          .from('crm_cards' as never)
          .update({ observacoes: form.observacoes.trim() } as never)
          .eq('id', cardId as string);
      }

      queryClient.invalidateQueries({ queryKey: ['crm-quadro'] });
      toast.success(`${nome} entrou no quadro.`);
      setForm({ nome: '', telefone: '', origem: 'Manual', observacoes: '' });
      setOpen(false);
    } catch (e) {
      toast.error('Não foi possível criar o contato: ' + (e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo contato
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>
            Se o telefone já for de um cliente ou lojista, o card entra direto na Operação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ct-nome" className="text-xs">Nome *</Label>
            <Input id="ct-nome" autoFocus value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Quem é o contato" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-fone" className="text-xs">Telefone *</Label>
              <Input id="ct-fone" inputMode="tel" value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                placeholder="(12) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-origem" className="text-xs">Origem</Label>
              <Input id="ct-origem" value={form.origem}
                onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                placeholder="Indicação, feira, Instagram..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ct-obs" className="text-xs">Observações</Label>
            <Textarea id="ct-obs" rows={2} value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              placeholder="Contexto da conversa, evento, volume estimado..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || !form.nome.trim() || !form.telefone.trim()} className="gap-2">
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
