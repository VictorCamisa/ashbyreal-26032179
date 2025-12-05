import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeResponse {
  code: string;
  pairingCode: string;
  base64: string;
}

export function GerarQRCodeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<QRCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGerarQRCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://clauberveiculos-n8n.fjsxhg.easypanel.host/webhook/whatsapp/getqrcode',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Falha na requisição');
      }

      const data: QRCodeResponse = await response.json();
      
      // Garante que o base64 tenha o prefixo correto
      const base64Image = data.base64.startsWith('data:image/png;base64,')
        ? data.base64
        : `data:image/png;base64,${data.base64}`;
      
      setQrData({ ...data, base64: base64Image });
      toast.success('QR Code gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      setError('Não consegui gerar o QR Code. Tente novamente em alguns segundos.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQrData(null);
      setError(null);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Gerar QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!loading && !qrData && !error && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Clique no botão abaixo para gerar o QR Code de conexão do WhatsApp.
              </p>
              <Button onClick={handleGerarQRCode} className="gap-2">
                <QrCode className="h-4 w-4" />
                Gerar QR Code
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <p className="text-destructive">{error}</p>
              <Button onClick={handleGerarQRCode} variant="outline" className="gap-2">
                <QrCode className="h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>
          )}

          {qrData && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrData.base64}
                alt="QR Code WhatsApp"
                className="w-[300px] h-[300px] rounded-lg border"
              />
              <div className="text-center space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Código de Pareamento:</span>{' '}
                  <span className="font-mono text-primary">{qrData.pairingCode}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Code interno:</span>{' '}
                  <span className="font-mono">{qrData.code}</span>
                </p>
              </div>
              <Button onClick={handleGerarQRCode} variant="outline" size="sm" className="gap-2">
                <QrCode className="h-4 w-4" />
                Gerar Novo QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
