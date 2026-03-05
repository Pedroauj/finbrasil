import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocalAnalytics } from "@/lib/internalAnalytics";
import { BarChart3, Users, Activity, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsDashboard({ className }: { className?: string }) {
  const data = useMemo(() => getLocalAnalytics(), []);

  const topFeatures = useMemo(() => {
    return Object.entries(data.featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [data.featureUsage]);

  const topPages = useMemo(() => {
    return Object.entries(data.pageViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [data.pageViews]);

  const recentDays = useMemo(() => {
    const days: Array<{ day: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: d.toLocaleDateString("pt-BR", { weekday: "short" }), count: data.eventsByDay[key] || 0 });
    }
    return days;
  }, [data.eventsByDay]);

  const maxDayCount = Math.max(...recentDays.map(d => d.count), 1);

  return (
    <div className={cn("space-y-4", className)}>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de eventos", value: data.totalEvents, icon: Activity, color: "text-primary" },
          { label: "Sessões", value: data.sessions, icon: Users, color: "text-blue-500" },
          { label: "Features usadas", value: Object.keys(data.featureUsage).length, icon: Zap, color: "text-amber-500" },
          { label: "Páginas visitadas", value: Object.keys(data.pageViews).length, icon: Eye, color: "text-purple-500" },
        ].map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
              </div>
              <p className={cn("text-2xl font-extrabold tabular-nums", kpi.color)}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity chart */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Atividade nos últimos 7 dias
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex items-end gap-2 h-24">
            {recentDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-primary/20 relative" style={{ height: `${(d.count / maxDayCount) * 80}px`, minHeight: d.count > 0 ? 4 : 0 }}>
                  <div className="absolute inset-0 rounded-t-md bg-primary/40" />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Features + Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-amber-500" />
              Features mais usadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {topFeatures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem dados ainda.</p>
            ) : (
              <div className="space-y-2">
                {topFeatures.map(([feature, count]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <span className="text-xs text-foreground/80 truncate">{feature}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-amber-500/20 w-16 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500"
                          style={{ width: `${(count / (topFeatures[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-purple-500" />
              Páginas mais acessadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {topPages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem dados ainda.</p>
            ) : (
              <div className="space-y-2">
                {topPages.map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between">
                    <span className="text-xs text-foreground/80 truncate">{page}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-purple-500/20 w-16 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-500"
                          style={{ width: `${(count / (topPages[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent events */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Eventos recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento registrado.</p>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {data.recentEvents.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground tabular-nums w-14 shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="font-medium text-foreground/80">{ev.event}</span>
                  {ev.properties && (
                    <span className="text-muted-foreground truncate">
                      {Object.entries(ev.properties).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
