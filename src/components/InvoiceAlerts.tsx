import { CreditCard, CreditCardInvoice } from "@/types/expense";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, CalendarClock } from "lucide-react";
import { differenceInDays, setDate } from "date-fns";

interface InvoiceAlertsProps {
  cards: CreditCard[];
  invoices: CreditCardInvoice[];
  currentDate: Date;
  className?: string;
}

export function InvoiceAlerts({
  cards,
  invoices,
  currentDate,
  className,
}: InvoiceAlertsProps) {
  const today = new Date();

  const monthKey = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;

  const alerts = cards.flatMap((card) => {
    const cardAlerts: Array<{
      id: string;
      type: "info" | "warning" | "destructive";
      title: string;
      description: string;
      icon: JSX.Element;
    }> = [];

    const closingDate = setDate(currentDate, card.closingDay);
    const dueDate = setDate(currentDate, card.dueDay);

    const daysToClosing = differenceInDays(closingDate, today);
    const daysToDue = differenceInDays(dueDate, today);

    // Alerta de Fechamento (3 dias antes)
    if (daysToClosing >= 0 && daysToClosing <= 3) {
      cardAlerts.push({
        id: `${card.id}-closing`,
        type: "info",
        title: `Fatura Próxima do Fechamento: ${card.name}`,
        description:
          daysToClosing === 0
            ? "Sua fatura fecha hoje!"
            : `Sua fatura fecha em ${daysToClosing} ${daysToClosing === 1 ? "dia" : "dias"
            }.`,
        icon: <CalendarClock className="h-4 w-4" />,
      });
    }

    // Alerta de Vencimento (5 dias antes)
    const invoice = invoices.find(
      (i) => i.cardId === card.id && i.month === monthKey
    );
    const isPaid = invoice?.isPaid || false;

    if (!isPaid && daysToDue >= 0 && daysToDue <= 5) {
      cardAlerts.push({
        id: `${card.id}-due`,
        type: daysToDue <= 1 ? "destructive" : "warning",
        title: `Vencimento Próximo: ${card.name}`,
        description:
          daysToDue === 0
            ? "Sua fatura vence hoje! Não esqueça de pagar."
            : `Vencimento em ${daysToDue} ${daysToDue === 1 ? "dia" : "dias"}.`,
        icon: <Bell className="h-4 w-4" />,
      });
    }

    return cardAlerts;
  });

  if (alerts.length === 0) return null;

  return (
    <div
      className={[
        "space-y-3",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className ?? "",
      ].join(" ")}
    >
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.type as any}
          className={[
            "border border-border/50 bg-card/80 backdrop-blur-xl",
            "shadow-sm",
            "rounded-2xl",
            "pl-4",
          ].join(" ")}
        >
          {alert.icon}
          <AlertTitle className="text-sm font-semibold">
            {alert.title}
          </AlertTitle>
          <AlertDescription className="text-xs opacity-90">
            {alert.description}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}