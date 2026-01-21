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
        'glass-card cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]',
        isConnected ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'
      )}
      onClick={() => navigate('/whatsapp')}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn(
            'h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0',
            isConnected ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
          )}>
            <MessageSquare className={cn(
              'h-5 w-5 sm:h-6 sm:w-6',
              isConnected ? 'text-emerald-600' : 'text-rose-600'
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base">WhatsApp</h3>
              {isConnected ? (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600">
                  <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-rose-600">
                  <WifiOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>Desconectado</span>
                </div>
              )}
            </div>
            
            {isConnected && (
              <div className="flex items-center gap-2 sm:gap-4 mt-0.5 sm:mt-1">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {conversasAtivas} conversas
                </span>
                {naoLidas > 0 && (
                  <span className="text-xs sm:text-sm font-medium text-rose-600">
                    {naoLidas} não lidas
                  </span>
                )}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
