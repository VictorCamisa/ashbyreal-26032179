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

// Edge function proxy URLs
const PROXY_BASE = 'https://chmhbrcugswwmpqzhugs.supabase.co/functions/v1/whatsapp-proxy';
const QR_CODE_URL = `${PROXY_BASE}?action=qrcode`;
const STATUS_URL = `${PROXY_BASE}?action=status`;

// Client slug padrão para a instância WhatsApp
const CLIENT_SLUG = 'ashby';

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
  const [currentInstanceName, setCurrentInstanceName] = useState<string | null>(null);
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
      console.log('Enviando request para QR Code com client_slug:', CLIENT_SLUG);
      
      const response = await fetch(QR_CODE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_slug: CLIENT_SLUG }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('QR Code Response:', data);
      
      // Tenta diferentes campos possíveis na resposta
      // IMPORTANTE: 'code' NÃO é pairing code - é dado interno do WhatsApp, não exibir
      const qrCodeValue = data?.base64 || data?.qrCode || data?.qrcode || data?.image || data?.qr || null;
      const pairingCodeValue = data?.pairingCode || data?.pairingcode || null;
      const instanceNameValue = data?.instanceName || data?.instance_name || data?.instance || CLIENT_SLUG;
      
      if (qrCodeValue) {
        setQrCode(qrCodeValue);
        setPairingCode(pairingCodeValue);
        setCurrentInstanceName(instanceNameValue);
        
        // Salva o instance_name no localStorage para uso futuro
        localStorage.setItem('whatsapp_instance_name', instanceNameValue);
        
        toast.success('QR Code gerado com sucesso!');
      } else {
        console.error('Resposta sem QR Code:', data);
        setError(data?.error || 'O servidor retornou resposta vazia. Verifique se a instância do WhatsApp está configurada.');
      }
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR Code. Tente novamente.');
      setQrCode(null);
      setPairingCode(null);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    // Precisa do instance_name para verificar status
    const instanceName = currentInstanceName || localStorage.getItem('whatsapp_instance_name');
    
    if (!instanceName) {
      console.log('Sem instance_name para verificar status');
      return;
    }
    
    try {
      console.log('Verificando status para instance_name:', instanceName);
      
      const response = await fetch(STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instance_name: instanceName }),
      });

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
      
      console.log('Status response:', data);
      
      const isConnected = data?.isConnected === true || data?.connected === true || data?.status === 'connected';
      const connectedInstanceName = data?.instanceName || data?.instance_name || instanceName;
      
      if (isConnected) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Salva o instance_name no localStorage
        localStorage.setItem('whatsapp_instance_name', connectedInstanceName);
        
        toast.success('WhatsApp conectado!');
        onConnected(connectedInstanceName);
        onOpenChange(false);
      }
    } catch (err) {
      console.log('Erro ao verificar status:', err);
    }
  };

  useEffect(() => {
    if (open) {
      // Só inicia polling de status se já tiver um QR code gerado
      if (qrCode && currentInstanceName) {
        intervalRef.current = setInterval(checkConnectionStatus, 4000);
        checkConnectionStatus();
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setQrCode(null);
      setPairingCode(null);
      setError(null);
      setLoading(false);
      setCurrentInstanceName(null);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, qrCode, currentInstanceName]);

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
