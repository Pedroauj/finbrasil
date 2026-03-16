import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Base surface
        "group relative overflow-hidden rounded-3xl text-foreground",
        "bg-card/80 backdrop-blur-xl",
        
        // Border: subtle gradient feel
        "border border-border/40",
        
        // Shadow system
        "shadow-premium",
        
        // Top highlight (premium edge light)
        "after:pointer-events-none after:absolute after:left-8 after:right-8 after:top-0 after:h-px",
        "after:bg-gradient-to-r after:from-transparent after:via-primary/20 after:to-transparent after:opacity-60",

        // Hover aura
        "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-500",
        "before:bg-[radial-gradient(280px_circle_at_20%_15%,hsl(var(--primary)/0.08),transparent_60%)]",
        "hover:before:opacity-100",

        // Ambient light
        "bg-[radial-gradient(1400px_circle_at_20%_0%,hsl(var(--primary)/0.04),transparent_55%)]",
        
        // Hover elevation
        "transition-all duration-500 ease-out",
        "hover:shadow-premiumLg hover:-translate-y-[2px]",
        "hover:border-border/60",
        
        // Noise texture
        "noise",
        
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
