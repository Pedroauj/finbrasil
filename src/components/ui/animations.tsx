import { motion, HTMLMotionProps, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

/* ─── Easing curves ─── */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, duration = 0.5, y = 16, className, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedCard({ children, delay = 0, className, ...props }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT_EXPO }}
      whileHover={{
        y: -3,
        transition: { duration: 0.25, ease: "easeOut" },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({ children, className, staggerDelay = 0.06 }: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.97, filter: "blur(4px)" },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: { duration: 0.55, ease: EASE_OUT_EXPO },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: 0.4, ease: EASE_OUT_QUINT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated counter for numbers ─── */
export function AnimatedNumber({
  value,
  className,
  formatter,
}: {
  value: number;
  className?: string;
  formatter?: (v: number) => string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT_QUINT }}
      className={className}
    >
      {formatter ? formatter(value) : value}
    </motion.span>
  );
}

/* ─── Pulse dot for live indicators ─── */
export function PulseDot({ color = "bg-primary", size = "h-2 w-2" }: { color?: string; size?: string }) {
  return (
    <span className="relative inline-flex">
      <motion.span
        className={`${size} rounded-full ${color}`}
        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.3, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={`absolute inset-0 ${size} rounded-full ${color}`} />
    </span>
  );
}

/* ─── Shimmer loading placeholder ─── */
export function Shimmer({ className = "h-4 w-24" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-muted/40 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ─── Tab content transition ─── */
export function TabTransition({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0, x: 12, filter: "blur(4px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: -12, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease: EASE_OUT_QUINT }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
