import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'LOJA' | 'PARTICULAR';
  tipo: 'PAGAR' | 'RECEBER';
}

export function NovaTransacaoDialog({ open, onOpenChange, entityType, tipo }: NovaTransacaoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Transação - {entityType}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input placeholder="Descrição da transação" />
          </div>
          <div>
            <Label>Valor</Label>
            <Input type="number" placeholder="0,00" />
          </div>
          <div>
            <Label>Data de Vencimento</Label>
            <Input type="date" />
          </div>
          <Button className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
