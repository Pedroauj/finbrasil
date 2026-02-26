import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base SaaS premium token-based (light/dark)
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 text-foreground backdrop-blur",
        // sombra discreta e “cara de produto”
        "shadow-sm",
        // LED SaaS sutil: top highlight + aura no hover
        [
          // linha de luz no topo (sempre muito leve)
          "after:pointer-events-none after:absolute after:left-6 after:right-6 after:top-0 after:h-px",
          "after:bg-gradient-to-r after:from-transparent after:via-primary/25 after:to-transparent",
          "after:opacity-70",
          // aura radial aparece no hover
          "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
          "before:bg-[radial-gradient(220px_circle_at_20%_15%,hsl(var(--primary)/0.12),transparent_60%)]",
          "hover:before:opacity-100",
        ].join(" "),
        // hover elegante (não neon)
        "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md",
        // ring sutil no hover (cara de produto)
        "hover:border-border/80 hover:shadow-[0_12px_32px_-22px_hsl(var(--primary)/0.45)]",
        className
      )}
      {...props}
    />
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