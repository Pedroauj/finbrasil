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

      {/* Vinheta sutil (borda mais escura = premium) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      {/* Noise/Grain (acabamento) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.55%22/%3E%3C/svg%3E')]" />

      {/* Container geral mais largo + menos margem lateral */}
      <div className="relative mx-auto min-h-screen w-full max-w-[1400px] px-2 sm:px-4 lg:px-6 py-6">
        {(title || subtitle || rightSlot) && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
              {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
            </div>

            {/* ✅ Ajuste: rightSlot com cara de toolbar e quebra melhor no mobile */}
            {rightSlot && (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end">
                {rightSlot}
              </div>
            )}
          </div>
        )}

        {/* Card principal (glass premium) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-400/20 hover:shadow-emerald-500/10"
        >
          {/* Reflexo sutil no vidro */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_35%)]" />

          <div className="p-4 sm:p-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      {/* Base estática */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_50%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />

      {/* Grid mais discreto */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:72px_72px]" />

      {/* “Luzes” bem suaves passando (muito leve: só transform) */}
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[10%] h-[220px] rounded-[999px] bg-emerald-500/10 blur-2xl transform-gpu"
        animate={{ x: [-120, 120, -120] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[34%] h-[260px] rounded-[999px] bg-cyan-500/8 blur-2xl transform-gpu"
        animate={{ x: [140, -140, 140] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="pointer-events-none absolute -inset-x-32 top-[60%] h-[240px] rounded-[999px] bg-emerald-500/7 blur-2xl transform-gpu"
        animate={{ x: [-90, 90, -90] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      />
    </>
  );
}