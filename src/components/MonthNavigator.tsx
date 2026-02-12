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
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[160px] text-center text-lg font-semibold capitalize">
        {monthLabel}
      </span>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
