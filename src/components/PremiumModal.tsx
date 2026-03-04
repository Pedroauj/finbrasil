import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
  onViewPlans?: () => void;
}

export function PremiumModal({
  open,
  onOpenChange,
  featureName,
  onViewPlans,
}: PremiumModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15 mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-lg">
            {featureName
              ? `Recurso disponível no Plano Inteligente`
              : "Recurso Premium"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Desbloqueie inteligência financeira avançada e tenha controle total das suas finanças.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button
            className="h-11 rounded-xl"
            onClick={() => {
              onOpenChange(false);
              onViewPlans?.();
            }}
          >
            Ver planos
          </Button>
          <Button
            variant="ghost"
            className="h-11 rounded-xl text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Continuar no Essencial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
