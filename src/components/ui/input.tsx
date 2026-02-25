import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          [
            "flex h-10 w-full rounded-xl px-3 py-2 text-sm",
            "bg-card/60 text-foreground placeholder:text-muted-foreground",
            "border border-border/60",
            "shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          ].join(" "),
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
export default Input;