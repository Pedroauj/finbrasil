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
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors duration-200" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[140px] text-center text-sm font-semibold capitalize sm:text-base sm:min-w-[160px]">
        {monthLabel}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors duration-200" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}