import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_URL = 'https://victoecamisavs.app.n8n.cloud/webhook/whatsapp/evolution-webhook';
const QR_CODE_URL = 'https://victoecamisavs.app.n8n.cloud/webhook/whatsapp/getqrcode';

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Falha na requisição');

      const data = await response.json();
      setQrCode(data?.qrCode ?? null);
      setPairingCode(data?.pairingCode ?? null);
      toast.success('QR Code gerado!');
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      setError('Erro ao gerar QR Code. Tente novamente.');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) return;

      const data = await response.json();
      
      if (data?.isConnected === true) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        toast.success('WhatsApp conectado!');
        onConnected(data.instanceName || 'WhatsApp');
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  };

  useEffect(() => {
    if (open) {
      intervalRef.current = setInterval(checkConnectionStatus, 4000);
      checkConnectionStatus();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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
      <DialogContent className="sm:max-w-sm border-border/50 bg-background/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Conectar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {!loading && !qrCode && !error && (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-[240px]">
                Gere o QR Code e escaneie com seu WhatsApp para conectar
              </p>
              <Button onClick={handleGerarQRCode} className="w-full">
                <QrCode className="h-4 w-4 mr-2" />
                Gerar QR Code
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Gerando...</p>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={handleGerarQRCode} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
            </div>
          )}

          {qrCode && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="p-3 bg-white rounded-xl">
                <img
                  src={qrCode}
                  alt="QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
              
              {pairingCode && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Código de pareamento</p>
                  <p className="font-mono text-lg font-semibold tracking-wider text-primary">
                    {pairingCode}
                  </p>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando conexão...
              </div>
              
              <Button 
                onClick={handleGerarQRCode} 
                variant="ghost" 
                size="sm"
                className="text-xs"
              >
                Gerar novo código
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
