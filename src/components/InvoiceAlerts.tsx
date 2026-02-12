import { CreditCard, CreditCardInvoice } from "@/types/expense";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, CalendarClock, AlertCircle } from "lucide-react";
import { differenceInDays, setDate, isAfter, isBefore, addMonths, subMonths } from "date-fns";

interface InvoiceAlertsProps {
  cards: CreditCard[];
  invoices: CreditCardInvoice[];
  currentDate: Date;
}

export function InvoiceAlerts({ cards, invoices, currentDate }: InvoiceAlertsProps) {
  const alerts = cards.flatMap(card => {
    const cardAlerts = [];
    const today = new Date();
    
    // Calcular datas para o mês atual
    const closingDate = setDate(currentDate, card.closingDay);
    const dueDate = setDate(currentDate, card.dueDay);
    
    const daysToClosing = differenceInDays(closingDate, today);
    const daysToDue = differenceInDays(dueDate, today);

    // Alerta de Fechamento (avisa 3 dias antes)
    if (daysToClosing >= 0 && daysToClosing <= 3) {
      cardAlerts.push({
        id: `${card.id}-closing`,
        type: "info",
        title: `Fatura Próxima do Fechamento: ${card.name}`,
        description: daysToClosing === 0 ? "Sua fatura fecha hoje!" : `Sua fatura fecha em ${daysToClosing} ${daysToClosing === 1 ? 'dia' : 'dias'}.`,
        icon: <CalendarClock className="h-4 w-4" />
      });
    }

    // Alerta de Vencimento (avisa 5 dias antes)
    const invoice = invoices.find(i => i.cardId === card.id && i.month === `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`);
    const isPaid = invoice?.isPaid || false;

    if (!isPaid && daysToDue >= 0 && daysToDue <= 5) {
      cardAlerts.push({
        id: `${card.id}-due`,
        type: daysToDue <= 1 ? "destructive" : "warning",
        title: `Vencimento Próximo: ${card.name}`,
        description: daysToDue === 0 ? "Sua fatura vence hoje! Não esqueça de pagar." : `Vencimento em ${daysToDue} ${daysToDue === 1 ? 'dia' : 'dias'}.`,
        icon: <Bell className="h-4 w-4" />
      });
    }

    return cardAlerts;
  });

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-in slide-in-from-top duration-500">
      {alerts.map(alert => (
        <Alert key={alert.id} variant={alert.type as any} className="border-l-4 shadow-sm">
          {alert.icon}
          <AlertTitle className="font-bold text-sm">{alert.title}</AlertTitle>
          <AlertDescription className="text-xs opacity-90">
            {alert.description}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
