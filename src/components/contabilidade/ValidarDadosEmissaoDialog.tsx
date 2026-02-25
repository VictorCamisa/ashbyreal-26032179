import { useState, useEffect } from 'react';
import { AlertTriangle, Check, Loader2, MapPin, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ClienteData {
  id: string;
  nome: string;
  cpf_cnpj?: string | null;
  endereco?: any;
  telefone?: string;
  email?: string;
}

interface ValidarDadosEmissaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'NFE' | 'NFCE';
  clienteId?: string | null;
  onValidated: () => void;
}

interface MissingField {
  key: string;
  label: string;
  required: boolean;
  group: 'identification' | 'address';
}

export function ValidarDadosEmissaoDialog({
  open,
  onOpenChange,
  tipo,
  clienteId,
  onValidated,
}: ValidarDadosEmissaoDialogProps) {
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    cpf_cnpj: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    cep: '',
  });

  useEffect(() => {
    if (open && clienteId) {
      loadCliente();
    } else if (open && !clienteId) {
      setLoading(false);
      setCliente(null);
    }
  }, [open, clienteId]);

  const loadCliente = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId!)
        .single();
      if (error) throw error;
      setCliente(data);
      const endereco = (data.endereco as any) || {};
      setFormData({
        cpf_cnpj: data.cpf_cnpj || '',
        rua: endereco.rua || endereco.logradouro || '',
        numero: endereco.numero || '',
        bairro: endereco.bairro || '',
        cidade: endereco.cidade || '',
        estado: endereco.estado || 'SP',
        cep: endereco.cep || '',
      });
    } catch {
      toast({ title: 'Erro ao carregar cliente', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getMissingFields = (): MissingField[] => {
    const missing: MissingField[] = [];

    if (tipo === 'NFE') {
      const cpf = formData.cpf_cnpj.replace(/\D/g, '');
      if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
        missing.push({ key: 'cpf_cnpj', label: 'CPF ou CNPJ', required: true, group: 'identification' });
      }
    }

    // Address is optional for NFC-e, recommended for NF-e
    if (tipo === 'NFE') {
      if (!formData.rua) missing.push({ key: 'rua', label: 'Rua/Logradouro', required: false, group: 'address' });
      if (!formData.bairro) missing.push({ key: 'bairro', label: 'Bairro', required: false, group: 'address' });
      if (!formData.cidade) missing.push({ key: 'cidade', label: 'Cidade', required: false, group: 'address' });
      if (!formData.cep) missing.push({ key: 'cep', label: 'CEP', required: false, group: 'address' });
    }

    return missing;
  };

  const missingFields = loading ? [] : getMissingFields();
  const hasRequiredMissing = missingFields.some(f => f.required);
  const hasAnyMissing = missingFields.length > 0;

  const handleSaveAndContinue = async () => {
    if (hasRequiredMissing) {
      const cpf = formData.cpf_cnpj.replace(/\D/g, '');
      if (tipo === 'NFE' && (!cpf || (cpf.length !== 11 && cpf.length !== 14))) {
        toast({ title: 'CPF/CNPJ inválido', description: 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.', variant: 'destructive' });
        return;
      }
    }

    if (!clienteId) {
      onValidated();
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {};
      
      if (formData.cpf_cnpj) {
        updateData.cpf_cnpj = formData.cpf_cnpj;
      }

      if (formData.rua || formData.bairro || formData.cidade || formData.cep) {
        const currentEndereco = (cliente?.endereco as any) || {};
        updateData.endereco = {
          ...currentEndereco,
          rua: formData.rua || currentEndereco.rua || '',
          numero: formData.numero || currentEndereco.numero || '',
          bairro: formData.bairro || currentEndereco.bairro || '',
          cidade: formData.cidade || currentEndereco.cidade || '',
          estado: formData.estado || currentEndereco.estado || 'SP',
          cep: formData.cep || currentEndereco.cep || '',
        };
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('clientes')
          .update(updateData)
          .eq('id', clienteId);
        if (error) throw error;
        toast({ title: '✅ Dados do cliente atualizados!' });
      }

      onOpenChange(false);
      onValidated();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasRequiredMissing ? (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            ) : (
              <Check className="h-5 w-5 text-green-500" />
            )}
            Verificação de Dados para Emissão
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !clienteId && tipo === 'NFCE' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              NFC-e para consumidor final sem identificação. Nenhum dado adicional necessário.
            </p>
            <DialogFooter>
              <Button onClick={() => { onOpenChange(false); onValidated(); }}>
                Continuar Emissão
              </Button>
            </DialogFooter>
          </div>
        ) : !clienteId && tipo === 'NFE' ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive font-medium">
              NF-e exige um cliente com CPF/CNPJ. Selecione um cliente antes de emitir.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Client info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{cliente?.nome}</p>
                <p className="text-xs text-muted-foreground">{cliente?.telefone}</p>
              </div>
            </div>

            {!hasAnyMissing ? (
              <div className="text-center py-4">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium">Todos os dados estão preenchidos!</p>
                <p className="text-xs text-muted-foreground mt-1">Pronto para emitir.</p>
              </div>
            ) : (
              <>
                {hasRequiredMissing && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      ⚠️ Dados obrigatórios faltando
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Preencha os campos abaixo para emitir. Os dados serão salvos no cadastro do cliente.
                    </p>
                  </div>
                )}

                {/* CPF/CNPJ */}
                {(tipo === 'NFE' || formData.cpf_cnpj === '') && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      CPF/CNPJ
                      {tipo === 'NFE' && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                    </Label>
                    <Input
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      value={formData.cpf_cnpj}
                      onChange={e => setFormData(p => ({ ...p, cpf_cnpj: e.target.value }))}
                    />
                  </div>
                )}

                {/* Address */}
                {tipo === 'NFE' && missingFields.some(f => f.group === 'address') && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5" /> Endereço
                      <Badge variant="secondary" className="text-[10px]">Recomendado</Badge>
                    </Label>
                    <div className="grid grid-cols-[1fr_80px] gap-2">
                      <Input placeholder="Rua / Logradouro" value={formData.rua} onChange={e => setFormData(p => ({ ...p, rua: e.target.value }))} />
                      <Input placeholder="Nº" value={formData.numero} onChange={e => setFormData(p => ({ ...p, numero: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Bairro" value={formData.bairro} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} />
                      <Input placeholder="Cidade" value={formData.cidade} onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="CEP" value={formData.cep} onChange={e => setFormData(p => ({ ...p, cep: e.target.value }))} />
                      <Input placeholder="UF" value={formData.estado} onChange={e => setFormData(p => ({ ...p, estado: e.target.value }))} maxLength={2} />
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handleSaveAndContinue}
                disabled={saving || (hasRequiredMissing && !formData.cpf_cnpj.replace(/\D/g, ''))}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {hasAnyMissing ? 'Salvar e Emitir' : 'Continuar Emissão'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
