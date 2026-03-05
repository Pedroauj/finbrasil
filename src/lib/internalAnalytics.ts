import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "finbrasil.analytics";
const BATCH_INTERVAL = 60_000; // flush every 60s
const SESSION_KEY = "finbrasil.analytics.session";

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  session_id: string;
}

let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let sessionId: string = "";

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  } catch {}
  sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try { sessionStorage.setItem(SESSION_KEY, sessionId); } catch {}
  return sessionId;
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  const ev: AnalyticsEvent = {
    event,
    properties,
    timestamp: Date.now(),
    session_id: getSessionId(),
  };
  eventQueue.push(ev);

  // Also store in localStorage for persistence
  try {
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    existing.push(ev);
    // Keep last 500 events max
    const trimmed = existing.slice(-500);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function trackPageView(page: string) {
  trackEvent("page_view", { page });
}

export function trackFeatureUsage(feature: string) {
  trackEvent("feature_use", { feature });
}

export function trackNavigation(from: string, to: string) {
  trackEvent("navigation", { from, to });
}

// Get local analytics data for admin dashboard
export function getLocalAnalytics(): {
  totalEvents: number;
  sessions: number;
  featureUsage: Record<string, number>;
  pageViews: Record<string, number>;
  eventsByDay: Record<string, number>;
  recentEvents: AnalyticsEvent[];
} {
  try {
    const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const sessions = new Set(events.map(e => e.session_id)).size;
    
    const featureUsage: Record<string, number> = {};
    const pageViews: Record<string, number> = {};
    const eventsByDay: Record<string, number> = {};

    events.forEach(e => {
      // Feature usage
      if (e.event === "feature_use" && e.properties?.feature) {
        const f = e.properties.feature;
        featureUsage[f] = (featureUsage[f] || 0) + 1;
      }
      // Page views
      if (e.event === "page_view" && e.properties?.page) {
        const p = e.properties.page;
        pageViews[p] = (pageViews[p] || 0) + 1;
      }
      // Events by day
      const day = new Date(e.timestamp).toISOString().slice(0, 10);
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      sessions,
      featureUsage,
      pageViews,
      eventsByDay,
      recentEvents: events.slice(-20).reverse(),
    };
  } catch {
    return { totalEvents: 0, sessions: 0, featureUsage: {}, pageViews: {}, eventsByDay: {}, recentEvents: [] };
  }
}

// Flush to Supabase (future: when analytics table exists)
async function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = [...eventQueue];
  eventQueue = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Store aggregated metrics in profile for now
    const analytics = getLocalAnalytics();
    // Could write to an analytics table in the future
    console.debug("[Analytics] Flushed", batch.length, "events. Total:", analytics.totalEvents);
  } catch (err) {
    // Re-queue on failure
    eventQueue.unshift(...batch);
  }
}

export function initAnalytics() {
  if (flushTimer) return;
  trackEvent("session_start");
  flushTimer = setInterval(flushEvents, BATCH_INTERVAL);

  // Track visibility changes
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      trackEvent("session_pause");
      flushEvents();
    } else {
      trackEvent("session_resume");
    }
  });

  // Flush on unload
  window.addEventListener("beforeunload", () => {
    trackEvent("session_end");
    flushEvents();
  });
}
