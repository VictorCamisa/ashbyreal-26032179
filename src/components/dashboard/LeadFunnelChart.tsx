import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadFunnelData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface LeadFunnelChartProps {
  data: LeadFunnelData[];
  totalLeads: number;
  taxaConversao: number;
}

export function LeadFunnelChart({ data, totalLeads, taxaConversao }: LeadFunnelChartProps) {
  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhum lead cadastrado
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max for scaling
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Funil de Conversão
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{totalLeads} leads</span>
            <span className="text-xs font-medium text-emerald-600">
              {taxaConversao.toFixed(1)}% conversão
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={item.status} className="relative">
              {/* Connection arrow */}
              {index > 0 && (
                <div className="absolute -top-2 left-4 flex items-center text-muted-foreground/40">
                  <ArrowRight className="h-3 w-3 rotate-90" />
                </div>
              )}
              
              <div className="flex items-center gap-3">
                {/* Status label */}
                <div className="w-24 flex-shrink-0">
                  <span className="text-xs font-medium">{item.status}</span>
                </div>
                
                {/* Bar */}
                <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: item.color,
                      minWidth: '40px',
                    }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow">
                      {item.count}
                    </span>
                  </div>
                </div>
                
                {/* Percentage */}
                <div className="w-14 flex-shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion rate summary */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Taxa de conversão geral</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(taxaConversao, 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-emerald-600">
              {taxaConversao.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
