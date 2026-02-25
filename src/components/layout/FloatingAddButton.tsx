import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingAddButton({
  onClick,
  label = "Novo gasto",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed bottom-5 right-5 z-50"
    >
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Button
          onClick={onClick}
          className="group relative h-12 rounded-full px-4 shadow-[0_1px_0_hsl(var(--border)/0.35),0_14px_34px_-24px_rgba(0,0,0,0.55)]"
        >
          {/* Glow bem sutil */}
          <span className="pointer-events-none absolute inset-0 rounded-full bg-primary/18 blur-xl opacity-0 transition group-hover:opacity-100" />

          <span className="relative flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/15">
              <Plus className="h-4 w-4 text-primary" />
            </span>
            <span className="hidden sm:inline font-semibold">{label}</span>
          </span>
        </Button>
      </motion.div>
    </motion.div>
  );
}