import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_URL = 'https://vssolutionsssss.app.n8n.cloud/webhook/whatsapp/state';
const QR_CODE_URL = 'https://vssolutionsssss.app.n8n.cloud/webhook/whatsapp/getqrcode';

interface GerarQRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: (instanceName: string) => void;
}

export function GerarQRCodeDialog({ open, onOpenChange, onConnected }: GerarQRCodeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleGerarQRCode = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(QR_CODE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Falha na requisição');
      }

      const data = await response.json();
      
      setQrCode(data?.qrCode ?? null);
      setPairingCode(data?.pairingCode ?? null);
      toast.success('QR Code gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      setError('Não consegui gerar o QR Code. Tente novamente em alguns segundos.');
      setQrCode(null);
      setPairingCode(null);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(STATUS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) return;

      const data = await response.json();
      
      if (data?.isConnected === true) {
        // Conectou! Fechar modal e notificar
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        toast.success('WhatsApp conectado com sucesso!');
        onConnected(data.instanceName || 'WhatsApp');
        onOpenChange(false);
      }
    } catch (err) {
      // Ignora erro e tenta novamente no próximo ciclo
      console.error('Erro ao verificar status:', err);
    }
  };

  // Polling quando o modal está aberto
  useEffect(() => {
    if (open) {
      // Inicia polling a cada 4 segundos
      intervalRef.current = setInterval(checkConnectionStatus, 4000);
      
      // Verifica imediatamente também
      checkConnectionStatus();
    } else {
      // Limpa o intervalo quando o modal fecha
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reseta estados
      setQrCode(null);
      setPairingCode(null);
      setError(null);
      setLoading(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code WhatsApp</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {!loading && !qrCode && !error && (
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

          {qrCode && (
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                style={{ width: 250, height: 250, objectFit: 'contain' }}
                className="rounded-lg border"
              />
              {pairingCode && (
                <p className="text-sm text-center">
                  <span className="font-medium">Código de Pareamento:</span>{' '}
                  <span className="font-mono text-primary break-all">{pairingCode}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Aguardando conexão... (verificando a cada 4s)
              </p>
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
