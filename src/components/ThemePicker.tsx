import { useTheme, type AccentTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Check, Sun, Moon, Monitor } from "lucide-react";

const accents: { key: AccentTheme; label: string; color: string }[] = [
  { key: "green", label: "Esmeralda", color: "bg-[hsl(160,84%,45%)]" },
  { key: "blue", label: "Safira", color: "bg-[hsl(217,91%,60%)]" },
  { key: "purple", label: "Ametista", color: "bg-[hsl(270,70%,60%)]" },
  { key: "orange", label: "Âmbar", color: "bg-[hsl(30,95%,55%)]" },
  { key: "rose", label: "Rubi", color: "bg-[hsl(346,77%,55%)]" },
  { key: "cyan", label: "Topázio", color: "bg-[hsl(190,90%,50%)]" },
];

const modes = [
  { key: "light" as const, label: "Claro", icon: Sun },
  { key: "dark" as const, label: "Escuro", icon: Moon },
  { key: "system" as const, label: "Sistema", icon: Monitor },
];

export function ThemePicker() {
  const { theme, setTheme, accent, setAccent } = useTheme();

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2.5">Modo</p>
        <div className="flex gap-2">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setTheme(m.key)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                theme === m.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <m.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent selector */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2.5">Cor de destaque</p>
        <div className="grid grid-cols-3 gap-2">
          {accents.map((a) => (
            <button
              key={a.key}
              onClick={() => setAccent(a.key)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border p-3 transition-all",
                accent === a.key
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full shrink-0 flex items-center justify-center",
                  a.color
                )}
              >
                {accent === a.key && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className="text-xs font-medium truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
