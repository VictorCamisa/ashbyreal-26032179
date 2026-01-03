import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportarTransacoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  tipo: string;
  data: string;
  valor: number;
  descricao: string;
  categoria: string;
  conta: string;
  subcategoria: string;
  dataCompetencia: string;
  dataCriacao: string;
}

// Normalize string for comparison
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Find best match for category
const findCategoryMatch = (
  categoryName: string, 
  categories: any[], 
  type: 'RECEITA' | 'DESPESA'
) => {
  const normalized = normalizeString(categoryName);
  
  // Try exact match first
  let match = categories.find(c => 
    c.is_active && 
    c.type === type && 
    normalizeString(c.name) === normalized
  );
  
  if (match) return match;
  
  // Try partial match
  match = categories.find(c => 
    c.is_active && 
    c.type === type && 
    (normalizeString(c.name).includes(normalized) || normalized.includes(normalizeString(c.name)))
  );
  
  return match || null;
};

// Find best match for subcategory
const findSubcategoryMatch = (
  subcategoryName: string, 
  subcategories: any[], 
  categoryId?: string
) => {
  const normalized = normalizeString(subcategoryName);
  
  // Filter by category if provided
  const filtered = categoryId 
    ? subcategories.filter(s => s.category_id === categoryId && s.is_active)
    : subcategories.filter(s => s.is_active);
  
  // Try exact match
  let match = filtered.find(s => normalizeString(s.name) === normalized);
  if (match) return match;
  
  // Try partial match
  match = filtered.find(s => 
    normalizeString(s.name).includes(normalized) || normalized.includes(normalizeString(s.name))
  );
  
  return match || null;
};

// Find account by name
const findAccountMatch = (accountName: string, accounts: any[]) => {
  const normalized = normalizeString(accountName);
  
  // Try exact match
  let match = accounts.find(a => 
    a.is_active && normalizeString(a.name) === normalized
  );
  if (match) return match;
  
  // Try partial match
  match = accounts.find(a => 
    a.is_active && 
    (normalizeString(a.name).includes(normalized) || normalized.includes(normalizeString(a.name)))
  );
  
  return match || null;
};

export function ImportarTransacoesDialog({ open, onOpenChange }: ImportarTransacoesDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Fetch entities
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch categories (only active)
  const { data: categories } = useQuery({
    queryKey: ['categories-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch subcategories (only active)
  const { data: subcategories } = useQuery({
    queryKey: ['subcategories-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch accounts
  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect header to identify format (Meu Dinheiro format)
    const header = lines[0].toLowerCase();
    const isMeuDinheiroFormat = header.includes('tipo') && 
                                 header.includes('valor') && 
                                 header.includes('categoria');

    // Skip header
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Handle CSV with possible quotes and semicolons
      let cols: string[];
      
      // Try semicolon first (common in Brazilian CSVs)
      if (line.includes(';')) {
        cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, ''));
      } else {
        // Handle comma-separated with quoted values
        cols = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cols.push(current.trim());
      }
      
      // Parse valor (handle Brazilian format: 1.390,00 or -1.390,00)
      let valorStr = cols[2] || '0';
      // Remove currency symbols
      valorStr = valorStr.replace(/R\$\s*/g, '').trim();
      // Convert Brazilian format to standard
      valorStr = valorStr.replace(/\./g, '').replace(',', '.');
      const valor = Math.abs(parseFloat(valorStr) || 0);

      return {
        tipo: cols[0] || '',
        data: cols[1] || '',
        valor,
        descricao: cols[3] || '',
        categoria: cols[4] || '',
        conta: cols[5] || '',
        subcategoria: cols[6] || '',
        dataCompetencia: cols[7] || '',
        dataCriacao: cols[8] || ''
      };
    }).filter(row => row.descricao.trim() !== '');
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setPreviewMode(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);
      
      if (parsed.length > 0) {
        setPreviewMode(true);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Determine entity based on account name
  const getEntityForAccount = (accountName: string): string | null => {
    const normalized = normalizeString(accountName);
    
    // ITAU EMPRESAS -> LOJA
    if (normalized.includes('empresas') || normalized.includes('empresa')) {
      return entities?.find(e => e.type === 'LOJA')?.id || null;
    }
    
    // PERSONALITE or PARTICULAR -> PARTICULAR
    if (normalized.includes('personalite') || normalized.includes('particular')) {
      return entities?.find(e => e.type === 'PARTICULAR')?.id || null;
    }
    
    // Default to LOJA
    return entities?.find(e => e.type === 'LOJA')?.id || null;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('Nenhuma transação para importar');
      return;
    }

    setImporting(true);
    setProgress(0);
    setPreviewMode(false);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      
      try {
        // Determine type
        const tipo = row.tipo.toLowerCase() === 'receita' ? 'RECEBER' : 'PAGAR';
        const categoryType = tipo === 'RECEBER' ? 'RECEITA' : 'DESPESA';
        
        // Find category by name
        const category = findCategoryMatch(row.categoria, categories || [], categoryType);

        // Find subcategory by name
        const subcategory = findSubcategoryMatch(
          row.subcategoria, 
          subcategories || [], 
          category?.id
        );

        // Find account by name
        const account = findAccountMatch(row.conta, accounts || []);

        // Determine entity based on account
        const entityId = getEntityForAccount(row.conta);

        // Determine status based on whether it has "Data Competencia" (paid transactions have this)
        const hasPaid = row.dataCompetencia && row.dataCompetencia.trim() !== '';
        const status = hasPaid ? 'PAGO' : 'PREVISTO';
        const paymentDate = hasPaid ? parseDate(row.dataCompetencia) : null;

        const transaction = {
          entity_id: entityId,
          tipo: tipo as 'PAGAR' | 'RECEBER',
          amount: row.valor,
          due_date: parseDate(row.data),
          description: row.descricao,
          category_id: category?.id || null,
          subcategory_id: subcategory?.id || null,
          account_id: account?.id || null,
          reference_month: row.dataCompetencia ? parseDate(row.dataCompetencia) : parseDate(row.data),
          status: status as 'PREVISTO' | 'PAGO' | 'ATRASADO' | 'CANCELADO',
          payment_date: paymentDate,
          origin: 'MANUAL' as const
        };

        const { error } = await supabase
          .from('transactions')
          .insert([transaction]);

        if (error) {
          console.error('Error inserting transaction:', error, row);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Error processing row:', err, row);
        errorCount++;
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImporting(false);
    setImportResult({ success: successCount, errors: errorCount });
    
    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['diario-caixa'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${successCount} transações importadas com sucesso!`);
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} transações falharam ao importar`);
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setParsedData([]);
    setProgress(0);
    setImportResult(null);
    setPreviewMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  // Get preview stats
  const getPreviewStats = () => {
    const receitas = parsedData.filter(r => r.tipo.toLowerCase() === 'receita');
    const despesas = parsedData.filter(r => r.tipo.toLowerCase() === 'despesa');
    
    const totalReceitas = receitas.reduce((sum, r) => sum + r.valor, 0);
    const totalDespesas = despesas.reduce((sum, r) => sum + r.valor, 0);
    
    const categoriesMatched = parsedData.filter(r => {
      const type = r.tipo.toLowerCase() === 'receita' ? 'RECEITA' : 'DESPESA';
      return findCategoryMatch(r.categoria, categories || [], type) !== null;
    }).length;
    
    return {
      receitas: receitas.length,
      despesas: despesas.length,
      totalReceitas,
      totalDespesas,
      categoriesMatched,
      categoriesUnmatched: parsedData.length - categoriesMatched
    };
  };

  const stats = previewMode ? getPreviewStats() : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Transações - Meu Dinheiro
          </DialogTitle>
          <DialogDescription>
            Importe transações do sistema "Meu Dinheiro" para o financeiro
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4 pr-4">
            {/* File Upload */}
            {!previewMode && !importing && !importResult && (
              <div className="space-y-2">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {selectedFile 
                      ? selectedFile.name 
                      : 'Clique para selecionar o arquivo CSV'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato: Tipo, Data, Valor, Descrição, Categoria, Conta, Subcategoria, Data Competência
                  </p>
                </div>
              </div>
            )}

            {/* Preview Mode */}
            {previewMode && stats && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Pré-visualização da Importação</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-emerald-500/10 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs">Receitas</p>
                      <p className="text-lg font-bold text-emerald-600">{stats.receitas}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {stats.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-rose-500/10 rounded-lg p-3">
                      <p className="text-muted-foreground text-xs">Despesas</p>
                      <p className="text-lg font-bold text-rose-600">{stats.despesas}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {stats.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Categorias mapeadas:</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700">
                          {stats.categoriesMatched} OK
                        </Badge>
                        {stats.categoriesUnmatched > 0 && (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                            {stats.categoriesUnmatched} sem categoria
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample transactions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Amostra das primeiras transações:</p>
                  <div className="bg-muted/30 rounded-lg divide-y divide-border text-xs">
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={row.tipo.toLowerCase() === 'receita' 
                              ? 'border-emerald-500 text-emerald-700' 
                              : 'border-rose-500 text-rose-700'
                            }
                          >
                            {row.tipo}
                          </Badge>
                          <span className="truncate max-w-[200px]">{row.descricao}</span>
                        </div>
                        <span className={row.tipo.toLowerCase() === 'receita' 
                          ? 'text-emerald-600 font-medium' 
                          : 'text-rose-600 font-medium'
                        }>
                          R$ {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {parsedData.length > 5 && (
                      <div className="p-2 text-center text-muted-foreground">
                        ... e mais {parsedData.length - 5} transações
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {importing && (
              <div className="space-y-3 py-4">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  Importando transações... {progress}%
                </p>
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="space-y-3 py-4">
                {importResult.success > 0 && (
                  <div className="flex items-center gap-3 text-emerald-600 bg-emerald-500/10 p-4 rounded-lg">
                    <CheckCircle2 className="h-6 w-6" />
                    <div>
                      <p className="font-medium">{importResult.success} transações importadas</p>
                      <p className="text-sm text-muted-foreground">
                        Os dados foram adicionados ao seu financeiro
                      </p>
                    </div>
                  </div>
                )}
                {importResult.errors > 0 && (
                  <div className="flex items-center gap-3 text-destructive bg-destructive/10 p-4 rounded-lg">
                    <AlertCircle className="h-6 w-6" />
                    <div>
                      <p className="font-medium">{importResult.errors} falhas</p>
                      <p className="text-sm text-muted-foreground">
                        Verifique o console para detalhes
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {previewMode && !importing && !importResult && (
            <Button onClick={handleImport}>
              Confirmar Importação ({parsedData.length} transações)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
