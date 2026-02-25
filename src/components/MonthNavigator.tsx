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
    <div className="hidden sm:flex items-center">
      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card/50 px-1.5 py-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl hover:bg-muted/50"
          onClick={() => onNavigate(-1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="min-w-[160px] px-2 text-center text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl hover:bg-muted/50"
          onClick={() => onNavigate(1)}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}