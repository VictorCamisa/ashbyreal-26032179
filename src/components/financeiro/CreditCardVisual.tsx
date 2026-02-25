import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import cardAzulItaucard from '@/assets/card-azul-itaucard.png';
import cardItauEmpresas from '@/assets/card-itau-empresas.png';
import cardLatamPass from '@/assets/card-latam-pass.png';
import cardMercadoPago from '@/assets/card-mercado-pago.png';
import cardSantanderSmiles from '@/assets/card-santander-smiles.png';
import cardAmexPlatinum from '@/assets/card-amex-platinum.png';

interface CreditCardVisualProps {
  name: string;
  lastDigits?: string | null;
  brand?: string | null;
  dueDay?: number | null;
  closingDay?: number | null;
  isActive?: boolean | null;
  limitValue?: number | null;
  currentValue?: number;
  onClick?: () => void;
}

function getCardImage(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('azul') && (lower.includes('itau') || lower.includes('itaú'))) return cardAzulItaucard;
  if (lower.includes('latam')) return cardLatamPass;
  if ((lower.includes('itau') || lower.includes('itaú')) && lower.includes('empres')) return cardItauEmpresas;
  if (lower.includes('mercado')) return cardMercadoPago;
  if (lower.includes('amex') || lower.includes('american express') || lower.includes('platinum')) return cardAmexPlatinum;
  if (lower.includes('santander')) return cardSantanderSmiles;
  // Fallback for other Itaú cards
  if (lower.includes('itau') || lower.includes('itaú')) return cardItauEmpresas;
  return null;
}

export function CreditCardVisual({
  name,
  lastDigits,
  brand,
  dueDay,
  closingDay,
  isActive,
  limitValue,
  currentValue = 0,
  onClick,
}: CreditCardVisualProps) {
  const cardImage = getCardImage(name);
  const usagePercent = limitValue && limitValue > 0 ? (currentValue / limitValue) * 100 : 0;
  const isHighUsage = usagePercent > 80;

  return (
    <div
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:-translate-y-1",
        !isActive && "opacity-50 grayscale-[30%]"
      )}
      onClick={onClick}
    >
      {/* Card image */}
      <div className="relative w-full aspect-[1.586/1] rounded-xl overflow-hidden shadow-lg transition-all duration-300 group-hover:shadow-xl">
        {cardImage ? (
          <img
            src={cardImage}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted-foreground/80 via-muted-foreground/60 to-muted-foreground/40" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Name + badge */}
        <div className="absolute top-2.5 left-3 right-3 flex items-start justify-between">
          <p className="font-bold text-white text-sm drop-shadow-lg leading-tight">{name}</p>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              "text-[9px] px-1.5 py-0 h-4 shrink-0",
              isActive && "bg-white/20 text-white border-white/30 backdrop-blur-sm"
            )}
          >
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between">
          {lastDigits && (
            <span className="font-mono font-semibold tracking-widest text-white text-xs drop-shadow">
              •••• {lastDigits}
            </span>
          )}
          <span className="text-white/70 text-[10px] drop-shadow">
            Venc. {dueDay || '—'} · Fecha {closingDay || '—'}
          </span>
        </div>

        {/* Hover shine */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/8 to-transparent pointer-events-none" />
      </div>

      {/* Info below card */}
      <div className="mt-3 space-y-2 px-1">
        {limitValue && limitValue > 0 ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Limite usado</span>
              <span className={cn("font-semibold", isHighUsage ? "text-destructive" : "text-foreground")}>
                {usagePercent.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(usagePercent, 100)}
              className={cn("h-1.5", isHighUsage && "[&>div]:bg-destructive")}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              <span>R$ {limitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        ) : null}

        {currentValue > 0 && (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Fatura Atual</span>
            </div>
            <span className="font-bold text-sm">
              R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
