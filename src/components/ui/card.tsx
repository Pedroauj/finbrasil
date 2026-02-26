import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base
        "group relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 text-foreground backdrop-blur",
        "shadow-sm",

        // Top highlight (premium, constante)
        "after:pointer-events-none after:absolute after:left-6 after:right-6 after:top-0 after:h-px",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/25 after:to-transparent after:opacity-70",

        // Aura no hover (sutil)
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
        "before:bg-[radial-gradient(220px_circle_at_20%_15%,hsl(var(--primary)/0.12),transparent_60%)]",
        "hover:before:opacity-100",

        // Sheen (reflexo passando — super leve)
        "bg-[radial-gradient(1400px_circle_at_20%_0%,hsl(var(--primary)/0.06),transparent_55%)]",
        "hover:shadow-[0_12px_32px_-22px_hsl(var(--primary)/0.45)]",
        "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md",
        className
      )}
      {...props}
    >
      {/* sheen overlay: não interfere em layout, só visual */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -left-24 top-[-40%] h-[220%] w-24 rotate-12",
          "bg-white/10 blur-md opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100"
        )}
      />
      {props.children}
    </div>
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };