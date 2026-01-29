import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Store, Loader2 } from 'lucide-react';
import { useLojistas, Lojista, LojistaInput } from '@/hooks/useLojistas';

interface EditarLojistaDialogProps {
  lojista: Lojista | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditarLojistaDialog({ lojista, open, onOpenChange, onSuccess }: EditarLojistaDialogProps) {
  const { updateLojista, isUpdating } = useLojistas();

  const [form, setForm] = useState<LojistaInput>({
    nome: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    contato_responsavel: '',
    observacoes: '',
  });

  // Sync form with lojista data when dialog opens
  useEffect(() => {
    if (lojista && open) {
      setForm({
        nome: lojista.nome || '',
        nome_fantasia: lojista.nome_fantasia || '',
        cnpj: lojista.cnpj || '',
        telefone: lojista.telefone || '',
        email: lojista.email || '',
        contato_responsavel: lojista.contato_responsavel || '',
        observacoes: lojista.observacoes || '',
      });
    }
  }, [lojista, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lojista) return;
    
    try {
      await updateLojista({ id: lojista.id, ...form });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Editar Lojista
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-nome">Razão Social *</Label>
              <Input
                id="edit-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-nome_fantasia">Nome Fantasia</Label>
              <Input
                id="edit-nome_fantasia"
                value={form.nome_fantasia}
                onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-cnpj">CNPJ</Label>
              <Input
                id="edit-cnpj"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: formatCNPJ(e.target.value) })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="edit-telefone">Telefone *</Label>
              <Input
                id="edit-telefone"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-contato_responsavel">Contato Responsável</Label>
              <Input
                id="edit-contato_responsavel"
                value={form.contato_responsavel}
                onChange={(e) => setForm({ ...form, contato_responsavel: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-observacoes">Observações</Label>
              <Textarea
                id="edit-observacoes"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
