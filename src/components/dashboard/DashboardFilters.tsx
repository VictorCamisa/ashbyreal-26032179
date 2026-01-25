import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { formatMonthYear } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  mesReferencia: Date;
  onMesChange: (date: Date) => void;
}

export function DashboardFilters({ mesReferencia, onMesChange }: DashboardFiltersProps) {
  const handleMesAnterior = () => {
    onMesChange(subMonths(mesReferencia, 1));
  };

  const handleProximoMes = () => {
    onMesChange(addMonths(mesReferencia, 1));
  };

  const handleMesAtual = () => {
    onMesChange(new Date());
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handleMesAnterior}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatMonthYear(mesReferencia)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={mesReferencia}
              onSelect={(date) => date && onMesChange(date)}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={handleProximoMes}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button variant="secondary" onClick={handleMesAtual}>
        Mês Atual
      </Button>
    </div>
  );
}
