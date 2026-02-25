import React from "react";
import { motion } from "framer-motion";

type PageShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function PageShell({ children, title, subtitle, rightSlot }: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundFX />

      <div className="relative mx-auto min-h-screen w-full max-w-[1400px] px-2 sm:px-4 lg:px-6 py-6">
        {(title || subtitle || rightSlot) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>

            {rightSlot && (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end">
                {rightSlot}
              </div>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-border/60 bg-card/70 shadow-sm backdrop-blur"
        >
          <div className="p-4 sm:p-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.10),transparent_55%),radial-gradient(900px_circle_at_80%_20%,hsl(var(--ring)/0.08),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:72px_72px]" />
    </>
  );
}