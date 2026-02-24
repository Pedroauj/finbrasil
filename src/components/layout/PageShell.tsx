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
          className="rounded-3xl border border-border/50 bg-card/80 shadow-2xl shadow-primary/5 backdrop-blur-xl"
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
      {/* Dark mode background */}
      <div className="pointer-events-none absolute inset-0 dark:bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_50%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)] bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.06),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.04),transparent_50%),linear-gradient(135deg,hsl(220_20%_97%)_0%,hsl(220_20%_95%)_100%)]" />

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.06] [background-image:linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* Ambient lights - subtle in light mode */}
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[10%] h-[220px] rounded-[999px] bg-emerald-500/5 dark:bg-emerald-500/10 blur-2xl transform-gpu"
        animate={{ x: [-120, 120, -120] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[34%] h-[260px] rounded-[999px] bg-cyan-500/3 dark:bg-cyan-500/8 blur-2xl transform-gpu"
        animate={{ x: [140, -140, 140] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[60%] h-[240px] rounded-[999px] bg-emerald-500/3 dark:bg-emerald-500/7 blur-2xl transform-gpu"
        animate={{ x: [-90, 90, -90] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      />
    </>
  );
}
