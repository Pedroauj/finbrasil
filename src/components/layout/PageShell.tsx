import * as React from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;

  /**
   * Se você quiser que alguma tela tenha container próprio (raro),
   * ative isso. Por padrão, fica false porque o AppShell já controla largura.
   */
  withContainer?: boolean;

  /**
   * Classes extras no wrapper geral
   */
  className?: string;

  /**
   * Classes extras no header (título/subtítulo)
   */
  headerClassName?: string;

  /**
   * Classes extras no conteúdo
   */
  contentClassName?: string;
};

export function PageShell({
  title,
  subtitle,
  right,
  children,
  withContainer = false,
  className,
  headerClassName,
  contentClassName,
}: PageShellProps) {
  const Wrapper: React.ElementType = withContainer ? "div" : React.Fragment;
  const wrapperProps = withContainer
    ? { className: "mx-auto w-full max-w-[1320px]" }
    : {};

  return (
    <Wrapper {...(wrapperProps as any)}>
      <section className={cn("space-y-4", className)}>
        {(title || subtitle || right) && (
          <header
            className={cn(
              "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
              headerClassName
            )}
          >
            <div className="min-w-0">
              {title ? (
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {title}
                </h2>
              ) : null}

              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {right ? <div className="shrink-0">{right}</div> : null}
          </header>
        )}

        <div className={cn("space-y-5", contentClassName)}>
          {children}
        </div>
      </section>
    </Wrapper>
  );
}

export default PageShell;