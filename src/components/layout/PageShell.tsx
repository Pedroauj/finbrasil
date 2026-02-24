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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <BackgroundFX />

      {/* Container geral mais largo + menos margem lateral */}
      <div className="relative mx-auto min-h-screen w-full max-w-[1400px] px-2 sm:px-4 lg:px-6 py-6">
        {(title || subtitle || rightSlot) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
            </div>
            {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
          </div>
        )}

        {/* Painel principal (glass + glow animado) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative rounded-3xl p-[1px]"
        >
          {/* Glow “borda viva” */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-70 blur-xl">
            <motion.div
              className="absolute inset-0 rounded-3xl bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.55),rgba(34,211,238,0.35),rgba(16,185,129,0.55))]"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Card */}
          <div className="relative rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl">
            <div className="p-4 sm:p-6">{children}</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.10),transparent_45%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:64px_64px]" />

      <motion.div
        className="pointer-events-none absolute left-[-120px] top-[20%] h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ y: [0, -16, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-140px] top-[10%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl"
        animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-160px] left-[15%] h-[440px] w-[440px] rounded-full bg-emerald-500/8 blur-3xl"
        animate={{ y: [0, 14, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}