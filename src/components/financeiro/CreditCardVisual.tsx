import { CreditCard, Wifi, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

// Brand-specific gradient mappings
function getCardStyle(name: string): { gradient: string; textColor: string; accentColor: string } {
  const lower = name.toLowerCase();

  if (lower.includes('azul') && (lower.includes('itau') || lower.includes('itaú'))) {
    return {
      gradient: 'bg-gradient-to-br from-[#003366] via-[#004B8D] to-[#1a6bc4]',
      textColor: 'text-white',
      accentColor: 'text-blue-200',
    };
  }
  if (lower.includes('latam')) {
    return {
      gradient: 'bg-gradient-to-br from-[#1B0A3C] via-[#2D1B69] to-[#E3006D]',
      textColor: 'text-white',
      accentColor: 'text-purple-200',
    };
  }
  if (lower.includes('itau') || lower.includes('itaú')) {
    return {
      gradient: 'bg-gradient-to-br from-[#EC7000] via-[#FF8C1A] to-[#F5A623]',
      textColor: 'text-white',
      accentColor: 'text-orange-100',
    };
  }
  if (lower.includes('mercado')) {
    return {
      gradient: 'bg-gradient-to-br from-[#009EE3] via-[#00B8F5] to-[#00D4FF]',
      textColor: 'text-white',
      accentColor: 'text-sky-100',
    };
  }
  if (lower.includes('santander')) {
    return {
      gradient: 'bg-gradient-to-br from-[#CC0000] via-[#E60000] to-[#FF3333]',
      textColor: 'text-white',
      accentColor: 'text-red-100',
    };
  }
  if (lower.includes('nubank') || lower.includes('nu')) {
    return {
      gradient: 'bg-gradient-to-br from-[#820AD1] via-[#9B2FE0] to-[#B54FEF]',
      textColor: 'text-white',
      accentColor: 'text-purple-100',
    };
  }
  if (lower.includes('inter')) {
    return {
      gradient: 'bg-gradient-to-br from-[#FF7A00] via-[#FF9A33] to-[#FFB366]',
      textColor: 'text-white',
      accentColor: 'text-orange-100',
    };
  }
  if (lower.includes('bradesco')) {
    return {
      gradient: 'bg-gradient-to-br from-[#CC092F] via-[#E31C46] to-[#FF4D6F]',
      textColor: 'text-white',
      accentColor: 'text-red-100',
    };
  }
  if (lower.includes('bb') || lower.includes('brasil')) {
    return {
      gradient: 'bg-gradient-to-br from-[#FEDD00] via-[#FFE033] to-[#003882]',
      textColor: 'text-[#003882]',
      accentColor: 'text-blue-800',
    };
  }
  if (lower.includes('c6')) {
    return {
      gradient: 'bg-gradient-to-br from-[#1A1A1A] via-[#2D2D2D] to-[#404040]',
      textColor: 'text-white',
      accentColor: 'text-neutral-300',
    };
  }
  if (lower.includes('xp')) {
    return {
      gradient: 'bg-gradient-to-br from-[#1A1A1A] via-[#333333] to-[#555555]',
      textColor: 'text-white',
      accentColor: 'text-neutral-300',
    };
  }

  // Default premium dark
  return {
    gradient: 'bg-gradient-to-br from-[#2D2D3A] via-[#3D3D50] to-[#4D4D66]',
    textColor: 'text-white',
    accentColor: 'text-neutral-300',
  };
}

function getBrandLogo(brand?: string | null): string {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) return 'VISA';
  if (b.includes('master')) return 'MASTERCARD';
  if (b.includes('elo')) return 'ELO';
  if (b.includes('amex') || b.includes('american')) return 'AMEX';
  if (b.includes('hiper')) return 'HIPER';
  return '';
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
  const style = getCardStyle(name);
  const brandLogo = getBrandLogo(brand);
  const usagePercent = limitValue && limitValue > 0 ? (currentValue / limitValue) * 100 : 0;
  const isHighUsage = usagePercent > 80;

  return (
    <div
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:-translate-y-1",
        !isActive && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Physical card */}
      <div
        className={cn(
          "relative w-full aspect-[1.586/1] rounded-2xl p-5 sm:p-6 overflow-hidden shadow-xl",
          "transition-all duration-300 group-hover:shadow-2xl",
          style.gradient,
          style.textColor
        )}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.1) 30px, rgba(255,255,255,0.1) 31px)',
        }} />

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

        {/* Top row: Name + Status */}
        <div className="relative flex items-start justify-between">
          <div>
            <p className="font-bold text-lg sm:text-xl leading-tight tracking-tight">{name}</p>
            <p className={cn("text-xs mt-0.5 opacity-75", style.accentColor)}>
              Venc. dia {dueDay || '—'} • Fecha dia {closingDay || '—'}
            </p>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              "text-[10px] px-2 py-0.5 shrink-0",
              isActive && "bg-white/20 text-white border-white/30 hover:bg-white/30"
            )}
          >
            {isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {/* Chip + Contactless */}
        <div className="relative flex items-center gap-2 mt-4 sm:mt-5">
          <div className="w-10 h-7 sm:w-12 sm:h-8 rounded-md bg-gradient-to-br from-yellow-300/90 to-yellow-500/90 shadow-inner flex items-center justify-center">
            <div className="w-6 h-4 sm:w-7 sm:h-5 rounded-sm border border-yellow-600/30 bg-gradient-to-br from-yellow-200/50 to-yellow-400/50" />
          </div>
          <Wifi className="h-5 w-5 rotate-90 opacity-60" />
        </div>

        {/* Card number dots */}
        <div className="relative flex items-center gap-3 mt-3 sm:mt-4">
          <div className="flex gap-1">
            {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />)}
          </div>
          <div className="flex gap-1">
            {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />)}
          </div>
          <div className="flex gap-1">
            {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />)}
          </div>
          {lastDigits ? (
            <span className="text-sm sm:text-base font-mono font-semibold tracking-widest">{lastDigits}</span>
          ) : (
            <div className="flex gap-1">
              {[0,1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />)}
            </div>
          )}
        </div>

        {/* Bottom row: Brand logo */}
        <div className="absolute bottom-4 right-5 sm:bottom-5 sm:right-6">
          {brandLogo && (
            <span className="text-sm sm:text-base font-bold tracking-wider opacity-80 italic">
              {brandLogo}
            </span>
          )}
        </div>
      </div>

      {/* Info below card */}
      <div className="mt-3 space-y-2 px-1">
        {/* Limit bar */}
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

        {/* Current invoice */}
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
