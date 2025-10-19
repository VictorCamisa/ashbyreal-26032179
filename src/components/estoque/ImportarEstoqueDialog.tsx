import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEstoque } from '@/hooks/useEstoque';

interface ImportarEstoqueDialogProps {
  onSuccess?: () => void;
}

export function ImportarEstoqueDialog({ onSuccess }: ImportarEstoqueDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createProduto } = useEstoque();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV',
        variant: 'destructive',
      });
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const produtos = parseCSV(text);

      let successCount = 0;
      let errorCount = 0;

      for (const prod of produtos) {
        try {
          await createProduto({
            nome: prod.nome || prod.name,
            descricao: prod.descricao || prod.description,
            sku: prod.sku || prod.codigo,
            categoria: prod.categoria || prod.category,
            estoque: parseInt(prod.estoque || prod.stock || '0'),
            estoqueMinimo: parseInt(prod.estoque_minimo || prod.min_stock || '10'),
            preco: parseFloat(prod.preco || prod.price || '0'),
            precoCusto: parseFloat(prod.preco_custo || prod.cost_price || '0'),
            unidadeMedida: prod.unidade || prod.unit || 'UN',
            fornecedor: prod.fornecedor || prod.supplier,
            localizacao: prod.localizacao || prod.location,
          });
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Erro ao importar produto:', prod, error);
        }
      }

      toast({
        title: 'Importação concluída',
        description: `${successCount} produtos importados com sucesso${errorCount > 0 ? `, ${errorCount} com erro` : ''}`,
      });

      setOpen(false);
      setFile(null);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao importar arquivo:', error);
      toast({
        title: 'Erro na importação',
        description: 'Não foi possível processar o arquivo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = `nome,descricao,sku,categoria,estoque,estoque_minimo,preco,preco_custo,unidade,fornecedor,localizacao
Produto Exemplo,Descrição do produto,SKU001,Categoria,100,10,50.00,30.00,UN,Fornecedor,A1`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-importacao-estoque.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Produtos do Estoque</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O arquivo CSV deve conter as colunas: nome, categoria, estoque, preco, etc.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {file.name}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full"
          >
            Baixar Template CSV
          </Button>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isLoading}
            >
              {isLoading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
