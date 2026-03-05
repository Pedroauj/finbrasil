import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, PieChart, Plus, Trash2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DEMO_EXPENSES = [
  { id: "1", desc: "Supermercado", category: "Alimentação", amount: 480, date: "05/03" },
  { id: "2", desc: "Uber", category: "Transporte", amount: 95, date: "04/03" },
  { id: "3", desc: "Netflix", category: "Lazer", amount: 55.90, date: "01/03" },
  { id: "4", desc: "Farmácia", category: "Saúde", amount: 120, date: "03/03" },
  { id: "5", desc: "iFood", category: "Alimentação", amount: 68, date: "02/03" },
];

const CAT_COLORS: Record<string, string> = {
  "Alimentação": "#10b981",
  "Transporte": "#3b82f6",
  "Lazer": "#a855f7",
  "Saúde": "#f59e0b",
  "Moradia": "#ef4444",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function InteractiveDemoWidget() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState(DEMO_EXPENSES);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCat, setNewCat] = useState("Alimentação");

  const income = 5200;
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const balance = income - totalExpenses;

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return Array.from(map.entries())
      .map(([cat, total]) => ({ cat, total, pct: (total / (totalExpenses || 1)) * 100 }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalExpenses]);

  const addExpense = () => {
    const amount = parseFloat(newAmount);
    if (!newDesc.trim() || isNaN(amount) || amount <= 0) return;
    setExpenses(prev => [
      { id: crypto.randomUUID(), desc: newDesc.trim(), category: newCat, amount, date: "05/03" },
      ...prev,
    ]);
    setNewDesc("");
    setNewAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-emerald-500/[0.04] blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
            <span className="text-xs font-medium text-white/50">Demo interativa — Março 2026</span>
          </div>
          <span className="text-[10px] text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
            Experimente agora ↓
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 p-5 pb-3">
          {[
            { label: "Receita", value: fmt(income), icon: TrendingUp, color: "text-emerald-400" },
            { label: "Gastos", value: fmt(totalExpenses), icon: TrendingDown, color: "text-orange-400" },
            { label: "Saldo", value: fmt(balance), icon: Wallet, color: balance >= 0 ? "text-cyan-400" : "text-red-400" },
          ].map(kpi => (
            <motion.div
              key={kpi.label}
              layout
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon className="h-3 w-3 text-white/30" />
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{kpi.label}</span>
              </div>
              <motion.div
                key={kpi.value}
                initial={{ scale: 0.95, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-sm font-bold tabular-nums ${kpi.color}`}
              >
                {kpi.value}
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Category bars */}
        <div className="px-5 pb-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3">Gastos por categoria</div>
            <div className="space-y-2">
              {categoryData.map(cat => (
                <div key={cat.cat}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-white/60">{cat.cat}</span>
                    <span className="text-white/40 tabular-nums">{cat.pct.toFixed(0)}% • {fmt(cat.total)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      layout
                      className="h-full rounded-full"
                      style={{ backgroundColor: CAT_COLORS[cat.cat] ?? "#6366f1", width: `${cat.pct}%` }}
                      transition={{ type: "spring", damping: 20 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add expense form */}
        <div className="px-5 pb-3">
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] p-3">
            <div className="text-[10px] text-emerald-400/60 uppercase tracking-wider mb-2">Adicione uma despesa de teste</div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-emerald-500/30"
                placeholder="Descrição"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addExpense()}
              />
              <input
                className="w-20 rounded-lg bg-white/[0.06] border border-white/[0.08] px-3 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:outline-none focus:border-emerald-500/30"
                placeholder="R$"
                type="number"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addExpense()}
              />
              <select
                className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-2 py-1.5 text-xs text-white/60 focus:outline-none"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
              >
                {Object.keys(CAT_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={addExpense}
                className="rounded-lg bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Expense list */}
        <div className="px-5 pb-4 max-h-[180px] overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {expenses.map(e => (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 mb-1.5 group"
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[e.category] ?? "#6366f1" }} />
                <span className="flex-1 text-xs text-white/50 truncate">{e.desc}</span>
                <span className="text-[10px] text-white/25">{e.date}</span>
                <span className="text-xs font-semibold text-orange-400 tabular-nums">-{fmt(e.amount)}</span>
                <button
                  onClick={() => removeExpense(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="border-t border-white/[0.06] px-5 py-4">
          <Button
            size="sm"
            className="w-full h-9 rounded-xl bg-emerald-500 text-xs font-bold text-slate-950 hover:bg-emerald-400 gap-1.5"
            onClick={() => navigate("/auth?mode=signup")}
          >
            Criar minha conta grátis
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <p className="text-center text-[10px] text-white/25 mt-2">
            Seus dados serão privados e criptografados
          </p>
        </div>
      </div>
    </div>
  );
}
