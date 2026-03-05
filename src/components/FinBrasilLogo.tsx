import finbrasilLogo from "@/assets/finbrasil-logo.png";

interface FinBrasilLogoProps {
  className?: string;
  height?: number;
}

export function FinBrasilLogo({ className = "", height = 32 }: FinBrasilLogoProps) {
  return (
    <img
      src={finbrasilLogo}
      alt="FinBrasil"
      className={className}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}
