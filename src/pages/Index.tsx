return (
  <div className="min-h-screen bg-background">
    {/* 🔥 Directional SaaS Light Background */}
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

      {/* Feixe principal vindo da esquerda */}
      <div
        className="absolute -left-40 top-0 h-[900px] w-[900px]
        bg-[radial-gradient(ellipse_at_30%_30%,hsl(var(--primary)/0.22),transparent_65%)]
        blur-[140px]"
      />

      {/* Glow secundário sutil */}
      <div
        className="absolute right-[-250px] top-[-150px] h-[700px] w-[700px]
        bg-[radial-gradient(ellipse_at_70%_20%,hsl(var(--primary)/0.10),transparent_70%)]
        blur-[150px]"
      />

      {/* Wash ambiente leve */}
      <div
        className="absolute inset-0
        bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.06),transparent_60%)]"
      />

      {/* Vinheta para profundidade */}
      <div
        className="absolute inset-0
        bg-[radial-gradient(1200px_circle_at_50%_0%,transparent_55%,hsl(var(--background))_95%)]"
      />

      {/* Grain / noise */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-soft-light bg-[url('/noise.png')]" />
    </div>

    <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

    <div className="mx-auto flex min-h-screen w-full max-w-[1600px]"></div>