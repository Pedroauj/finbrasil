import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Target, Plus, Trash2, Pencil, Check, X, Trophy, Flame, TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface Goal {
  id: string;
  description: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  color: string;
}

interface FinancialGoalsProps {
  userId?: string;
  className?: string;
  compact?: boolean;
}

const GOAL_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

export function FinancialGoals({ userId, className, compact }: FinancialGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [desc, setDesc] = useState("");
  const [targetAmt, setTargetAmt] = useState("");
  const [currentAmt, setCurrentAmt] = useState("");
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);

  const fetchGoals = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("financial_goals" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setGoals(data as unknown as Goal[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const resetForm = () => {
    setDesc(""); setTargetAmt(""); setCurrentAmt(""); setSelectedColor(GOAL_COLORS[0]);
    setShowForm(false); setEditingId(null);
  };

  const handleSave = async () => {
    if (!userId) return;
    const t = parseFloat(targetAmt);
    const c = parseFloat(currentAmt) || 0;
    if (!desc.trim() || isNaN(t) || t <= 0) {
      toast.error("Preencha descrição e valor alvo.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("financial_goals" as any)
        .update({
          description: desc.trim(),
          target_amount: t,
          current_amount: c,
          color: selectedColor,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", editingId);
      
      if (error) { toast.error("Erro ao atualizar meta."); return; }
      toast.success("Meta atualizada!");
    } else {
      const { error } = await supabase
        .from("financial_goals" as any)
        .insert({
          user_id: userId,
          description: desc.trim(),
          target_amount: t,
          current_amount: c,
          color: selectedColor,
        } as any);
      
      if (error) { toast.error("Erro ao criar meta."); return; }
      toast.success("Meta criada!");
    }

    resetForm();
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("financial_goals" as any).delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir meta."); return; }
    toast.success("Meta excluída!");
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setDesc(goal.description);
    setTargetAmt(String(goal.target_amount));
    setCurrentAmt(String(goal.current_amount));
    setSelectedColor(goal.color);
    setShowForm(true);
  };

  const updateCurrentAmount = async (id: string, newAmount: number) => {
    const { error } = await supabase
      .from("financial_goals" as any)
      .update({ current_amount: newAmount, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    
    if (!error) {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: newAmount } : g));
      toast.success("Progresso atualizado!");
    }
  };

  // Stats
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.current_amount, 0);
  const overallPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const completedCount = goals.filter(g => g.current_amount >= g.target_amount).length;

  if (compact) {
    return (
      <Card className={cn(cardClass, className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Metas Financeiras
            {goals.length > 0 && (
              <Badge variant="outline" className="text-[10px] rounded-lg ml-auto">
                {completedCount}/{goals.length} concluídas
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.slice(0, 3).map(goal => {
            const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
            const isComplete = pct >= 100;
            return (
              <div key={goal.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate flex items-center gap-1.5">
                    {isComplete && <Trophy className="h-3 w-3 text-amber-500" />}
                    {goal.description}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                </div>
                <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: goal.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
          {goals.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta definida</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Overview stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className={cn(cardClass, "p-4 text-center")}>
            <Target className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold">{goals.length}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Metas</div>
          </Card>
          <Card className={cn(cardClass, "p-4 text-center")}>
            <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <div className="text-lg font-bold">{completedCount}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Concluídas</div>
          </Card>
          <Card className={cn(cardClass, "p-4 text-center")}>
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <div className="text-lg font-bold">{overallPct.toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Progresso</div>
          </Card>
        </div>
      )}

      {/* Goal cards */}
      <AnimatePresence>
        {goals.map(goal => {
          const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
          const isComplete = pct >= 100;
          const remaining = Math.max(goal.target_amount - goal.current_amount, 0);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <Card className={cn(cardClass, "overflow-hidden")}>
                <div className="h-1" style={{ background: goal.color }} />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <div className="h-8 w-8 rounded-xl bg-amber-500/10 grid place-items-center">
                          <Trophy className="h-4 w-4 text-amber-500" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-xl grid place-items-center" style={{ background: `${goal.color}15` }}>
                          <Target className="h-4 w-4" style={{ color: goal.color }} />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold">{goal.description}</h4>
                        {isComplete ? (
                          <Badge variant="outline" className="text-[10px] rounded-lg bg-amber-500/10 text-amber-600 border-amber-500/20 mt-0.5">
                            🎉 Meta alcançada!
                          </Badge>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Faltam {formatCurrency(remaining)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => startEdit(goal)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden mb-2">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{formatCurrency(goal.current_amount)}</span>
                    <span className="font-bold" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
                  </div>

                  {/* Quick update */}
                  {!isComplete && (
                    <div className="mt-3 flex gap-2">
                      {[100, 500, 1000].map(amt => (
                        <Button
                          key={amt}
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg text-xs flex-1"
                          onClick={() => updateCurrentAmount(goal.id, goal.current_amount + amt)}
                        >
                          +R${amt}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {goals.length === 0 && !showForm && !loading && (
        <Card className={cn(cardClass, "p-10 text-center")}>
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Defina suas metas financeiras</p>
          <p className="text-xs text-muted-foreground mb-5">
            Crie objetivos com prazos e acompanhe seu progresso visualmente
          </p>
          <Button className="h-10 rounded-xl gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Criar primeira meta
          </Button>
        </Card>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <Card className={cn(cardClass)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {editingId ? "Editar meta" : "Nova meta"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Ex: Reserva de emergência, Viagem, Carro novo"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Valor alvo (R$)</label>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={targetAmt}
                      onChange={e => setTargetAmt(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Valor atual (R$)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={currentAmt}
                      onChange={e => setCurrentAmt(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Cor</label>
                  <div className="flex gap-2">
                    {GOAL_COLORS.map(c => (
                      <button
                        key={c}
                        className={cn(
                          "h-7 w-7 rounded-full transition-all",
                          selectedColor === c ? "ring-2 ring-offset-2 ring-offset-background scale-110" : "opacity-60 hover:opacity-100"
                        )}
                        style={{ background: c, ...(selectedColor === c ? { boxShadow: `0 0 0 2px ${c}40` } : {}) }}
                        onClick={() => setSelectedColor(c)}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="h-10 rounded-xl" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button className="h-10 rounded-xl flex-1 gap-2" onClick={handleSave}>
                    <Check className="h-4 w-4" />
                    {editingId ? "Salvar" : "Criar meta"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add button */}
      {goals.length > 0 && !showForm && (
        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl gap-2 border-dashed"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
      )}
    </div>
  );
}
