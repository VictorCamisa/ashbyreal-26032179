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
import { supabase } from '@/integrations/supabase/client';

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const storedInstance = currentInstanceName || localStorage.getItem('whatsapp_instance_name');

      // Se já existe uma instância salva, tenta só buscar/atualizar o QR Code (sem criar outra instância)
      if (storedInstance) {
        console.log('Buscando QR Code para instância existente:', storedInstance);

        const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'get_qrcode',
            instance_name: storedInstance,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (!data?.success) throw new Error(data?.error || 'Erro ao buscar QR Code');

        if (data?.qrcode) {
          setQrCode(data.qrcode);
          setPairingCode(data?.pairingCode || null);
          setCurrentInstanceName(storedInstance);
          toast.success('QR Code atualizado!');
          return;
        }

        console.warn('Instância existe, mas veio sem QR Code. Tentando criar uma nova...');
      }

      console.log('Criando nova instância WhatsApp...');

      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'create_instance',
          client_slug: CLIENT_SLUG,
        },
      });

      if (fnError) throw new Error(fnError.message);

      console.log('Resposta da criação:', data);

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar instância');
      }

      const qrCodeValue = data?.qrcode;
      const pairingCodeValue = data?.pairingCode;
      const instanceNameValue = data?.instance_name;

      if (instanceNameValue) {
        setCurrentInstanceName(instanceNameValue);
        localStorage.setItem('whatsapp_instance_name', instanceNameValue);
        localStorage.setItem('whatsapp_client_slug', CLIENT_SLUG);
      }

      if (qrCodeValue) {
        setQrCode(qrCodeValue);
        setPairingCode(pairingCodeValue || null);
        toast.success('QR Code gerado com sucesso!');
      } else if (instanceNameValue) {
        // Fallback: se criou instância mas não veio QR, tenta buscar via connect
        const { data: qrData, error: qrErr } = await supabase.functions.invoke('evolution-api', {
          body: { action: 'get_qrcode', instance_name: instanceNameValue },
        });

        if (!qrErr && qrData?.qrcode) {
          setQrCode(qrData.qrcode);
          setPairingCode(qrData?.pairingCode || null);
          toast.success('QR Code gerado com sucesso!');
        } else {
          setError('Não foi possível gerar o QR Code. Tente novamente.');
        }
      } else {
        setError('Não foi possível gerar o QR Code. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao criar instância:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR Code. Tente novamente.');
      setQrCode(null);
      setPairingCode(null);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    const instanceName = currentInstanceName || localStorage.getItem('whatsapp_instance_name');
    
    if (!instanceName) {
      console.log('Sem instance_name para verificar status');
      return;
    }
    
    try {
      console.log('Verificando conexão para:', instanceName);
      
      const { data, error: fnError } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'check_connection',
          instance_name: instanceName,
        },
      });

      if (fnError) {
        console.error('Erro ao verificar status:', fnError);
        return;
      }
      
      console.log('Status da conexão:', data);
      
      const isConnected = data?.connected === true;
      
      if (isConnected) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Atualizar no banco
        await supabase
          .from('whatsapp_instances')
          .update({ is_connected: true })
          .eq('instance_name', instanceName);
        
        toast.success('WhatsApp conectado!');
        onConnected(instanceName);
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
              <p className="text-sm text-muted-foreground">Criando instância...</p>
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
