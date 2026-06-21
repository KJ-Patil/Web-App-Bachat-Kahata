"use client";

import React, { useState, useEffect } from "react";
import { Smile, Meh, Frown, BrainCircuit, TrendingUp, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from "recharts";
import { formatAmount } from "@/core/utils/currencyManager";

// Mock historical mood data correlating to spending
const MOOD_DATA = [
  { date: "Mon", spend: 450, mood: "Good" },
  { date: "Tue", spend: 1200, mood: "Okay" },
  { date: "Wed", spend: 3500, mood: "Stressed" },
  { date: "Thu", spend: 300, mood: "Good" },
  { date: "Fri", spend: 4100, mood: "Stressed" },
  { date: "Sat", spend: 2200, mood: "Okay" },
  { date: "Sun", spend: 800, mood: "Good" },
];

const MOOD_COLORS: Record<string, string> = {
  Good: "#059669",     // text-success
  Okay: "#ea580c",     // text-warning
  Stressed: "#dc2626", // text-error
};

export default function MoodInsightsPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) setActiveCurrency(cur);
    }
  }, []);

  // Calculate Variance Insights
  const stressedSpend = MOOD_DATA.filter(d => d.mood === "Stressed").reduce((acc, curr) => acc + curr.spend, 0);
  const goodSpend = MOOD_DATA.filter(d => d.mood === "Good").reduce((acc, curr) => acc + curr.spend, 0);
  
  const avgStressed = stressedSpend / MOOD_DATA.filter(d => d.mood === "Stressed").length;
  const avgGood = goodSpend / MOOD_DATA.filter(d => d.mood === "Good").length;
  
  const variancePercent = avgGood > 0 ? ((avgStressed - avgGood) / avgGood) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <BrainCircuit className="w-8 h-8 text-brand" />
          Behavioral Insights
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Map your emotional states to your spending patterns to identify stress-induced purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Log Current Mood & Summary */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-foreground">Log Today's Mood</h3>
            
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setCurrentMood("Good")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  currentMood === "Good" ? "border-success bg-success-light text-success scale-105" : "border-border bg-background hover:bg-secondary text-icon-muted"
                }`}
              >
                <Smile className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Good</span>
              </button>
              
              <button 
                onClick={() => setCurrentMood("Okay")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  currentMood === "Okay" ? "border-warning bg-warning-light text-warning scale-105" : "border-border bg-background hover:bg-secondary text-icon-muted"
                }`}
              >
                <Meh className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Okay</span>
              </button>
              
              <button 
                onClick={() => setCurrentMood("Stressed")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  currentMood === "Stressed" ? "border-error bg-error-light text-error scale-105" : "border-border bg-background hover:bg-secondary text-icon-muted"
                }`}
              >
                <Frown className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Stressed</span>
              </button>
            </div>
            {currentMood && (
              <p className="text-xs font-semibold text-foreground-secondary text-center pt-2">
                Mood recorded. Transactions today will be tagged as <span className="font-black text-foreground">{currentMood}</span>.
              </p>
            )}
          </div>

          <div className="bg-error-light border border-error/20 p-6 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-extrabold text-error flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Variance Alert
            </h3>
            <p className="text-sm font-semibold text-error/80 leading-relaxed">
              You tend to spend <span className="font-black text-error text-base">{Math.round(variancePercent)}% more</span> on days you report feeling <strong>Stressed</strong> compared to Good days.
            </p>
            <div className="pt-2 flex justify-between items-end border-t border-error/20 mt-2">
              <div>
                <span className="text-[10px] font-bold text-error/60 uppercase">Avg Stressed Spend</span>
                <span className="block font-black text-error">{formatAmount(avgStressed, activeCurrency)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-error/60 uppercase">Avg Good Spend</span>
                <span className="block font-black text-error">{formatAmount(avgGood, activeCurrency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="font-extrabold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand" />
                Mood vs. Spending Trajectory
              </h3>
              <p className="text-xs text-foreground-muted">
                7-day rolling view of your emotional finance correlation.
              </p>
            </div>
            
            <div className="flex gap-3 text-[10px] font-bold">
              {Object.entries(MOOD_COLORS).map(([mood, color]) => (
                <div key={mood} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-foreground-secondary uppercase">{mood}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-[250px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOOD_DATA} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => `${val/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border border-border rounded-xl shadow-lg p-3 space-y-1">
                            <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block">
                              {data.date}
                            </span>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-black text-foreground">
                                {formatAmount(data.spend, activeCurrency)}
                              </span>
                              <span 
                                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md text-white"
                                style={{ backgroundColor: MOOD_COLORS[data.mood] }}
                              >
                                {data.mood}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="spend" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {MOOD_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.mood]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
