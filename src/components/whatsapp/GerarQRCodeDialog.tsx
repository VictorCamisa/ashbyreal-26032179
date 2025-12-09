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

const STATUS_URL = 'https://vssolutionscamisa.app.n8n.cloud/webhook/whatsapp/checkstatus';
const QR_CODE_URL = 'https://vssolutionscamisa.app.n8n.cloud/webhook/whatsapp/getqrcode';

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

  // Formata o QR code para exibição (adiciona prefixo base64 se necessário)
  const formatQrCodeSrc = (qrCodeData: string): string => {
    if (!qrCodeData) return '';
    
    // Se já é uma URL completa ou data URI, retorna como está
    if (qrCodeData.startsWith('http://') || 
        qrCodeData.startsWith('https://') || 
        qrCodeData.startsWith('data:')) {
      return qrCodeData;
    }
    
    // Se é base64 puro, adiciona o prefixo
    return `data:image/png;base64,${qrCodeData}`;
  };

  const handleGerarQRCode = async () => {
    setLoading(true);
    setError(null);

    try {
      // Tenta primeiro com GET
      let response = await fetch(QR_CODE_URL, { method: 'GET' });
      
      // Se GET falhar, tenta POST
      if (!response.ok) {
        response = await fetch(QR_CODE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log('QR Code Response:', data);
      
      // Tenta diferentes campos possíveis na resposta
      const qrCodeValue = data?.qrCode || data?.qrcode || data?.base64 || data?.image || data?.qr || null;
      const pairingCodeValue = data?.pairingCode || data?.pairingcode || data?.code || null;
      
      if (qrCodeValue) {
        setQrCode(qrCodeValue);
        setPairingCode(pairingCodeValue);
        toast.success('QR Code gerado com sucesso!');
      } else {
        console.error('Resposta sem QR Code:', data);
        setError('O servidor retornou resposta vazia. Verifique se a instância do WhatsApp está configurada no n8n/Evolution API.');
      }
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
      // Tenta primeiro com GET
      let response = await fetch(STATUS_URL, { method: 'GET' });
      
      // Se GET falhar, tenta POST
      if (!response.ok) {
        response = await fetch(STATUS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      if (!response.ok) return;

      const text = await response.text();
      if (!text) return;
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log('Resposta não é JSON:', text.substring(0, 100));
        return;
      }
      
      const isConnected = data?.isConnected === true || data?.connected === true || data?.status === 'connected';
      const instanceName = data.instanceName || data.instance || 'WhatsApp';
      
      if (isConnected) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Envia o nome da instância para o webhook
        try {
          await fetch(STATUS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, connected: true }),
          });
        } catch (err) {
          console.log('Erro ao notificar conexão:', err);
        }
        
        toast.success('WhatsApp conectado!');
        onConnected(instanceName);
        onOpenChange(false);
      }
    } catch (err) {
      console.log('Verificando status...');
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
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <img
                  src={formatQrCodeSrc(qrCode)}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem QR Code');
                    e.currentTarget.style.display = 'none';
                  }}
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
