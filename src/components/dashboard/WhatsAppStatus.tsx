import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface WhatsAppStatusProps {
  isConnected: boolean;
  conversasAtivas: number;
  naoLidas: number;
}

export function WhatsAppStatus({ isConnected, conversasAtivas, naoLidas }: WhatsAppStatusProps) {
  const navigate = useNavigate();

  return (
    <Card 
      className={cn(
        'glass-card cursor-pointer transition-all hover:shadow-lg',
        isConnected ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'
      )}
      onClick={() => navigate('/whatsapp')}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            'h-12 w-12 rounded-xl flex items-center justify-center',
            isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
          )}>
            <MessageSquare className={cn(
              'h-6 w-6',
              isConnected ? 'text-emerald-600' : 'text-rose-600'
            )} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">WhatsApp</h3>
              {isConnected ? (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <Wifi className="h-3 w-3" />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-rose-600">
                  <WifiOff className="h-3 w-3" />
                  Desconectado
                </div>
              )}
            </div>
            
            {isConnected && (
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-muted-foreground">
                  {conversasAtivas} conversas
                </span>
                {naoLidas > 0 && (
                  <span className="text-sm font-medium text-rose-600">
                    {naoLidas} não lidas
                  </span>
                )}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
