import React, { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, CreditCard, 
  AlertTriangle, Calendar, ChevronRight, Copy, AlertCircle, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ImportarFaturaCartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  installment_number: number;
  total_installments: number;
  category_suggestion?: string;
  dedupe_key?: string;
  purchase_fingerprint?: string;
  status?: 'NEW' | 'DUPLICATE' | 'FUTURE_INSTALLMENT';
  selected?: boolean;
}

interface ImportSummary {
  new_items: number;
  duplicates: number;
  future_installments: number;
  total_value: number;
}

interface ExistingTransaction {
  id: string;
  description: string;
  amount: number;
  purchase_date: string;
  installment_number: number | null;
  total_installments: number | null;
  competencia: string;
}

interface PreviousImportInfo {
  import_id: string;
  imported_at: string;
  records_imported: number;
}

const CARD_PROVIDERS: Record<string, { label: string; formats: string[]; color: string }> = {
  'LATAM': { label: 'LATAM Pass', formats: ['CSV'], color: 'bg-red-500' },
  'AZUL': { label: 'Azul Itaucard', formats: ['CSV'], color: 'bg-blue-500' },
  'ITAU_EMPRESAS': { label: 'Itaú Empresas', formats: ['XLSX', 'XLS'], color: 'bg-orange-500' },
  'MERCADO_LIVRE': { label: 'Mercado Livre', formats: ['CSV'], color: 'bg-yellow-500' },
  'SANTANDER_SMILES': { label: 'Santander Smiles', formats: ['CSV'], color: 'bg-red-600' },
  'GENERICO': { label: 'Genérico', formats: ['CSV', 'XLSX'], color: 'bg-gray-500' },
};

export function ImportarFaturaCartaoDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: ImportarFaturaCartaoDialogProps) {
  const { cartoes } = useCartoes();
  const { createGasto, isCreating, confirmImport } = useGastosCartaoMutations();
  
  const [step, setStep] = useState<'select' | 'upload' | 'preview' | 'importing' | 'done'>('select');
  const [selectedCartao, setSelectedCartao] = useState<string>('');
  const [competenciaAlvo, setCompetenciaAlvo] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([]);
  const [previousImport, setPreviousImport] = useState<PreviousImportInfo | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [showExisting, setShowExisting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, skipped: 0 });

  const selectedCartaoData = cartoes?.find(c => c.id === selectedCartao);
  const cardProvider = selectedCartaoData?.card_provider || 'GENERICO';
  const providerInfo = CARD_PROVIDERS[cardProvider] || CARD_PROVIDERS['GENERICO'];

  const resetDialog = () => {
    setStep('select');
    setSelectedCartao('');
    setCompetenciaAlvo(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    setSelectedFile(null);
    setParsedTransactions([]);
    setExistingTransactions([]);
    setPreviousImport(null);
    setImportSummary(null);
    setImportId(null);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, skipped: 0 });
    setShowExisting(false);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const readFileAsBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          resolve(arrayBufferToBase64(buffer));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSVFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setStep('upload');

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      let content = '';
      let fileBase64 = '';

      if (fileExt === 'csv') {
        content = await parseCSVFile(file);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        fileBase64 = await readFileAsBase64(file);
      }

      const { data: result, error } = await supabase.functions.invoke('import-card-statement', {
        body: {
          creditCardId: selectedCartao,
          cardProvider: cardProvider,
          fileType: fileExt?.toUpperCase(),
          fileName: file.name,
          content,
          fileBase64,
          competenciaAlvo,
        }
      });

      if (error) throw error;

      // Allow incremental imports - just warn if previously imported
      if (result.previous_import) {
        toast.info(`Arquivo já importado anteriormente (${result.previous_import.records_imported} transações). Verificando novas transações...`);
      }

      if (result.error && !result.transactions?.length) {
        toast.error(result.error);
        setStep('select');
        return;
      }

      // Store existing transactions for display
      if (result.existing_transactions) {
        setExistingTransactions(result.existing_transactions);
      }
      
      if (result.previous_import) {
        setPreviousImport(result.previous_import);
      }

      if (result.transactions && result.transactions.length > 0) {
        // Marcar todos como selecionados, exceto duplicatas
        const txsWithSelection = result.transactions.map((t: ParsedTransaction) => ({
          ...t,
          selected: t.status !== 'DUPLICATE'
        }));
        
        setParsedTransactions(txsWithSelection);
        setImportSummary(result.summary);
        setImportId(result.import_id);
        setStep('preview');
        
        if (result.summary.duplicates > 0) {
          toast.info(`${result.summary.duplicates} transações duplicadas serão ignoradas`);
        }
      } else if (result.existing_transactions?.length > 0) {
        // No new transactions but has existing - show preview anyway
        setParsedTransactions([]);
        setImportSummary({ new_items: 0, duplicates: 0, future_installments: 0, total_value: 0 });
        setStep('preview');
        toast.info('Nenhuma transação nova encontrada. Todas já estão cadastradas.');
      } else {
        toast.warning('Nenhuma transação encontrada no arquivo.');
        setStep('select');
      }
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err);
      toast.error('Erro ao processar arquivo: ' + (err.message || 'Erro desconhecido'));
      setStep('select');
    }
  }, [selectedCartao, cardProvider, competenciaAlvo]);

  const toggleTransaction = (index: number) => {
    setParsedTransactions(prev => 
      prev.map((t, i) => {
        if (i !== index) return t;
        // Não permite selecionar duplicatas
        if (t.status === 'DUPLICATE') return t;
        return { ...t, selected: !t.selected };
      })
    );
  };

  const toggleAllNew = () => {
    const newItems = parsedTransactions.filter(t => t.status === 'NEW');
    const allNewSelected = newItems.every(t => t.selected);
    setParsedTransactions(prev => prev.map(t => {
      if (t.status !== 'NEW') return t;
      return { ...t, selected: !allNewSelected };
    }));
  };

  const handleImport = async () => {
    const toImport = parsedTransactions.filter(t => t.selected && t.status === 'NEW');
    if (toImport.length === 0) {
      toast.error('Selecione ao menos uma transação nova');
      return;
    }

    setStep('importing');
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < toImport.length; i++) {
      const t = toImport[i];
      try {
        const result = await createGasto({
          credit_card_id: selectedCartao,
          description: t.description,
          amount: t.amount,
          purchase_date: t.date,
          installment_number: t.installment_number,
          total_installments: t.total_installments,
          force_competencia: competenciaAlvo,
          create_remaining_installments: true,
          dedupe_key: t.dedupe_key,
          purchase_fingerprint: t.purchase_fingerprint,
          source_import_id: importId || undefined,
        });
        
        if (result && result.length > 0) {
          success++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error('Erro ao importar transação:', err);
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    // Confirmar import no banco
    if (importId && success > 0) {
      await confirmImport({ importId, recordsImported: success });
    }

    setImportResults({ success, failed, skipped });
    setStep('done');
    
    if (success > 0) {
      toast.success(`${success} transações importadas com sucesso!`);
      onSuccess?.();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Valor total das transações já existentes
  const existingTotal = useMemo(() => {
    return existingTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [existingTransactions]);

  // Estatísticas das transações selecionadas
  const selectedStats = useMemo(() => {
    const selected = parsedTransactions.filter(t => t.selected && t.status === 'NEW');
    const total = selected.reduce((sum, t) => sum + t.amount, 0);
    const futureInstallments = selected.reduce((sum, t) => {
      if (t.total_installments > 1 && t.installment_number < t.total_installments) {
        return sum + (t.total_installments - t.installment_number);
      }
      return sum;
    }, 0);
    // Valor total da fatura após importação = existentes + novas
    const grandTotal = existingTotal + total;
    return { count: selected.length, total, futureInstallments, grandTotal };
  }, [parsedTransactions, existingTotal]);

  // Calcular resumo de parcelas futuras por mês
  const futureInstallmentsSummary = useMemo(() => {
    const selected = parsedTransactions.filter(t => t.selected && t.status === 'NEW');
    const summary: Record<string, { count: number; total: number; items: { description: string; amount: number; installment: string }[] }> = {};
    
    const baseDate = new Date(`${competenciaAlvo}-15`);
    
    for (const t of selected) {
      const totalInst = t.total_installments || 1;
      const currentInst = t.installment_number || 1;
      const remainingCount = totalInst - currentInst;
      
      if (remainingCount > 0) {
        for (let i = 1; i <= remainingCount; i++) {
          const futureDate = new Date(baseDate);
          futureDate.setMonth(futureDate.getMonth() + i);
          const monthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
          
          if (!summary[monthKey]) {
            summary[monthKey] = { count: 0, total: 0, items: [] };
          }
          summary[monthKey].count++;
          summary[monthKey].total += t.amount;
          summary[monthKey].items.push({
            description: t.description,
            amount: t.amount,
            installment: `${currentInst + i}/${totalInst}`
          });
        }
      }
    }
    
    return Object.entries(summary)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        monthLabel: new Date(`${month}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        ...data
      }));
  }, [parsedTransactions, competenciaAlvo]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'NEW':
        return <Badge className="bg-emerald-500 text-white">Novo</Badge>;
      case 'DUPLICATE':
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Duplicado</Badge>;
      case 'FUTURE_INSTALLMENT':
        return <Badge className="bg-blue-500 text-white">Futuro</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Importar Fatura de Cartão
            {step !== 'select' && selectedCartaoData && (
              <Badge className={cn("ml-2", providerInfo.color, "text-white")}>
                {selectedCartaoData.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Card & Competência */}
        {step === 'select' && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Selecione o Cartão</Label>
              <Select value={selectedCartao} onValueChange={setSelectedCartao}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um cartão..." />
                </SelectTrigger>
                <SelectContent>
                  {cartoes?.map((cartao) => {
                    const info = CARD_PROVIDERS[cartao.card_provider || 'GENERICO'];
                    return (
                      <SelectItem key={cartao.id} value={cartao.id}>
                        <div className="flex items-center gap-3">
                          <div className={cn("w-3 h-3 rounded-full", info?.color || 'bg-gray-500')} />
                          <span>{cartao.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (venc. dia {cartao.due_day})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedCartao && (
              <>
                <div className="grid gap-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Competência da Fatura
                  </Label>
                  <Input
                    type="month"
                    value={competenciaAlvo}
                    onChange={(e) => setCompetenciaAlvo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Todas as transações serão lançadas na fatura deste mês.
                    Parcelas futuras serão criadas automaticamente nos meses seguintes.
                  </p>
                </div>

                <div className="bg-primary/10 rounded-lg p-4 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      Formato: {providerInfo.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Arquivos aceitos: {providerInfo.formats.join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sistema de idempotência ativo - duplicatas serão detectadas automaticamente
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Arraste o arquivo ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {providerInfo.formats.join(', ')}
                    </p>
                  </label>
                </div>
              </>
            )}

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Instruções
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Exporte a fatura do site do seu banco no formato correto</li>
                <li>• Duplicatas são detectadas automaticamente e ignoradas</li>
                <li>• Parcelas futuras são criadas automaticamente</li>
                <li>• Você pode reimportar a mesma fatura sem criar duplicatas</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Processando arquivo...</p>
            <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Comparison Summary Banner */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-muted-foreground">{formatCurrency(existingTotal)}</p>
                    <p className="text-xs text-muted-foreground">{existingTransactions.length} já cadastradas</p>
                  </div>
                  <span className="text-xl text-muted-foreground">+</span>
                  <div className="text-center px-3">
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(selectedStats.total)}</p>
                    <p className="text-xs text-emerald-600">{importSummary?.new_items || 0} novas</p>
                  </div>
                  <span className="text-xl text-muted-foreground">=</span>
                  <div className="text-center px-3 bg-primary/20 rounded-lg py-2">
                    <p className="text-xl font-bold text-primary">{formatCurrency(selectedStats.grandTotal)}</p>
                    <p className="text-xs text-primary">Fatura após importação</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {previousImport && (
                    <Badge variant="outline" className="text-xs">
                      Última importação: {new Date(previousImport.imported_at).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Existing Transactions Collapsible */}
            {existingTransactions.length > 0 && (
              <Collapsible open={showExisting} onOpenChange={setShowExisting} className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      {existingTransactions.length} transações já cadastradas nesta competência
                    </span>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", showExisting && "rotate-90")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border rounded-lg max-h-40 overflow-y-auto bg-muted/30">
                    <Table>
                      <TableBody>
                        {existingTransactions.map((t) => (
                          <TableRow key={t.id} className="text-muted-foreground">
                            <TableCell className="py-2 text-xs font-mono">
                              {new Date(t.purchase_date).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="py-2 text-xs max-w-xs truncate">{t.description}</TableCell>
                            <TableCell className="py-2 text-xs">
                              {t.total_installments && t.total_installments > 1 
                                ? `${t.installment_number}/${t.total_installments}` 
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="py-2 text-xs text-right font-medium">
                              {formatCurrency(t.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Summary Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div className="flex items-center gap-4">
                {importSummary && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm">{importSummary.new_items} novas</span>
                    </div>
                    {importSummary.duplicates > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted" />
                        <span className="text-sm text-muted-foreground">{importSummary.duplicates} duplicadas</span>
                      </div>
                    )}
                    {selectedStats.futureInstallments > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">{selectedStats.futureInstallments} parcelas futuras</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={toggleAllNew} disabled={!parsedTransactions.some(t => t.status === 'NEW')}>
                {parsedTransactions.filter(t => t.status === 'NEW').every(t => t.selected) 
                  ? 'Desmarcar Novas' 
                  : 'Selecionar Novas'}
              </Button>
            </div>

            {/* Transaction Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((t, index) => (
                    <TableRow 
                      key={index} 
                      className={cn(
                        "cursor-pointer transition-colors",
                        t.status === 'DUPLICATE' && "opacity-50 bg-muted/30",
                        t.selected && t.status === 'NEW' && "bg-emerald-50 dark:bg-emerald-950/20"
                      )}
                      onClick={() => toggleTransaction(index)}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={t.selected} 
                          disabled={t.status === 'DUPLICATE'}
                          onCheckedChange={() => toggleTransaction(index)}
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                      <TableCell>
                        {t.total_installments > 1 
                          ? <Badge variant="outline">{t.installment_number}/{t.total_installments}</Badge>
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Future Installments Summary */}
            {futureInstallmentsSummary.length > 0 && (
              <div className="mt-4 border rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Parcelas Futuras a Criar
                  </h4>
                  <Badge variant="secondary" className="ml-auto">
                    {selectedStats.futureInstallments} parcelas
                  </Badge>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {futureInstallmentsSummary.slice(0, 6).map((monthData) => (
                    <div key={monthData.month} className="flex items-center justify-between p-2 rounded bg-blue-100/50 dark:bg-blue-900/30">
                      <span className="font-medium capitalize">{monthData.monthLabel}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {monthData.count} {monthData.count === 1 ? 'parcela' : 'parcelas'}
                        </Badge>
                        <span className="font-semibold text-sm">{formatCurrency(monthData.total)}</span>
                      </div>
                    </div>
                  ))}
                  {futureInstallmentsSummary.length > 6 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {futureInstallmentsSummary.length - 6} meses...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={selectedStats.count === 0}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Importar {selectedStats.count} Transações
                {selectedStats.futureInstallments > 0 && ` + ${selectedStats.futureInstallments} futuras`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Importando transações...</p>
            <Progress value={importProgress} className="w-64" />
            <p className="text-sm text-muted-foreground">{importProgress}%</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <p className="text-xl font-semibold">Importação Concluída!</p>
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{importResults.success}</p>
                <p className="text-sm text-muted-foreground">Importadas</p>
              </div>
              {importResults.skipped > 0 && (
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">{importResults.skipped}</p>
                  <p className="text-sm text-muted-foreground">Ignoradas</p>
                </div>
              )}
              {importResults.failed > 0 && (
                <div>
                  <p className="text-3xl font-bold text-destructive">{importResults.failed}</p>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                </div>
              )}
            </div>
            <Button onClick={handleClose} className="mt-4">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
