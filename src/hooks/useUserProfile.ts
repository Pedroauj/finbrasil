import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanTier, UserRole } from "@/lib/plans";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  plan: PlanTier;
  role: UserRole;
  fin_score: number;
  referral_code: string | null;
}

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfile({
        ...data,
        plan: (data as any).plan ?? "free",
        role: (data as any).role ?? "user",
        fin_score: (data as any).fin_score ?? 50,
        referral_code: (data as any).referral_code ?? null,
      } as UserProfile);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updatePlan = useCallback(async (plan: PlanTier) => {
    if (!userId) return;
    await supabase.from("profiles").update({ plan } as any).eq("user_id", userId);
    setProfile((p) => p ? { ...p, plan } : p);
  }, [userId]);

  const updateRole = useCallback(async (role: UserRole) => {
    if (!userId) return;
    await supabase.from("profiles").update({ role } as any).eq("user_id", userId);
    setProfile((p) => p ? { ...p, role } : p);
  }, [userId]);

  const updateFinScore = useCallback(async (fin_score: number) => {
    if (!userId) return;
    await supabase.from("profiles").update({ fin_score } as any).eq("user_id", userId);
    setProfile((p) => p ? { ...p, fin_score } : p);
  }, [userId]);

  return { profile, loading, fetchProfile, updatePlan, updateRole, updateFinScore };
}
