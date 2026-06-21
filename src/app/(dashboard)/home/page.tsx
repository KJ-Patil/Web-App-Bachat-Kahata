"use client";

import React, { useEffect, useState } from "react";
import { Bell, ArrowUpRight, ArrowDownRight, Wallet, Target, Activity, Calendar } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import SmsPasteZone from "@/components/automation/SmsPasteZone";
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// Mock Data for Charts
const LINE_TREND_DATA = [
  { day: "Mon", Balance: 68000 },
  { day: "Tue", Balance: 69200 },
  { day: "Wed", Balance: 67100 },
  { day: "Thu", Balance: 71500 },
  { day: "Fri", Balance: 73000 },
  { day: "Sat", Balance: 74200 },
  { day: "Sun", Balance: 75000 },
];

const CATEGORY_BAR_DATA = [
  { category: "Dining", Amount: 2400 },
  { category: "Housing", Amount: 12500 },
  { category: "Travel", Amount: 1800 },
  { category: "Entertainment", Amount: 3100 },
  { category: "Utilities", Amount: 4200 },
  { category: "Groceries", Amount: 6800 },
];

export default function WorkspacePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [showNotifications, setShowNotifications] = useState(false);

  // Prevent Next.js hydration issues with Recharts
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("user_session");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name) {
            setUserName(parsed.name);
          }
        } catch (e) {
          // Fallback to raw session value or defaults
        }
      }
      
      const configCurrency = localStorage.getItem("active_currency");
      if (configCurrency) {
        setActiveCurrency(configCurrency);
      }
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Mock Notification Alert list
  const notifications = [
    "Your weekly financial health sync ran successfully.",
    "Housing budget limit is approaching 80%.",
    "Goal 'Emergency Fund' reached 75% milestones!"
  ];

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* ────────────────── HEADER ────────────────── */}
      <header className="flex justify-between items-center bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            Here is your financial status overview for today.
          </p>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 rounded-xl border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error animate-ping"></span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error"></span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-xl shadow-lg z-40 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Alert Center</span>
                <button onClick={() => setShowNotifications(false)} className="text-[10px] text-primary hover:underline">Dismiss All</button>
              </div>
              <div className="space-y-2 divide-y divide-border">
                {notifications.map((note, i) => (
                  <p key={i} className="text-xs text-foreground-secondary pt-2 first:pt-0">{note}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ────────────────── SMS AUTO-PARSER ────────────────── */}
      <SmsPasteZone
        currencyCode={activeCurrency}
        onTransactionSaved={() => {}}
      />

      {/* ────────────────── PRIMARY BALANCE CARD ────────────────── */}
      <section className="bg-primary-lighter text-primary border border-primary-light p-6 md:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Available Liquidity</span>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            {formatAmount(75000, activeCurrency)}
          </h2>
          <p className="text-xs font-medium text-primary/70">
            Computed across all active offline database vaults.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block">Inflow</span>
              <span className="text-sm font-extrabold text-foreground">{formatAmount(98000, activeCurrency)}</span>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block">Outflow</span>
              <span className="text-sm font-extrabold text-foreground">{formatAmount(23000, activeCurrency)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── STATISTICAL GRID ────────────────── */}
      <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border-strong">
          
          {/* Col 1: Monthly Budget Remaining */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Remaining Budget</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">65.2%</h3>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "65.2%" }}></div>
              </div>
            </div>
          </div>

          {/* Col 2: Total Income Target */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Goal Progress</span>
              <Target className="w-4 h-4 text-brand" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">78.0%</h3>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-brand h-full rounded-full" style={{ width: "78%" }}></div>
              </div>
            </div>
          </div>

          {/* Col 3: Financial Health Score */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Health Index</span>
              <Activity className="w-4 h-4 text-success" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">72 / 100</h3>
              <p className="text-xs text-foreground-muted">Stable capital flow efficiency.</p>
            </div>
          </div>

          {/* Col 4: Last Catchup Run Status */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Sync State</span>
              <Calendar className="w-4 h-4 text-icon-muted" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Synced</h3>
              <p className="text-xs text-foreground-muted">All local transactions verified.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── ANALYTICS CHART CANVAS ────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend line Visualizer (Chart 1 - Blue) */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">Balance Development</h3>
            <p className="text-xs text-foreground-muted">Running active liquidity trajectory (7 days)</p>
          </div>
          <div className="h-72 w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={LINE_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[60000, 80000]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }} 
                    labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Balance" 
                    stroke="#1d4ed8" 
                    strokeWidth={3} 
                    dot={{ r: 4, stroke: "#1d4ed8", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background-subtle rounded-xl animate-pulse text-xs text-foreground-muted">Loading chart metrics...</div>
            )}
          </div>
        </div>

        {/* Categories Bar Visualizer (Chart 2 - Orange) */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">Outflow Categories</h3>
            <p className="text-xs text-foreground-muted">Consolidated active monthly billing metrics</p>
          </div>
          <div className="h-72 w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CATEGORY_BAR_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }} 
                    labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                  />
                  <Bar dataKey="Amount" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-background-subtle rounded-xl animate-pulse text-xs text-foreground-muted">Loading chart metrics...</div>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
