import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface MonthNavigatorProps {
  currentDate: Date;
  onNavigate: (offset: number) => void;
}

export function MonthNavigator({ currentDate, onNavigate }: MonthNavigatorProps) {
  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-0.5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-lg px-1 py-0.5 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-muted/50"
          onClick={() => onNavigate(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="min-w-[100px] sm:min-w-[150px] px-1 sm:px-2 text-center text-[11px] sm:text-[13px] font-semibold capitalize text-foreground tracking-tight">
          {monthLabel}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-muted/50"
          onClick={() => onNavigate(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
