"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, AlertCircle, Zap, Target } from "lucide-react";
import { computeHealthScore, getHealthRecommendations, HealthMetrics } from "@/core/math/HealthEngine";

export default function HealthScorePage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      // Pull dynamic or mock data from local state
      const income = Number(localStorage.getItem("total_income") || "85000");
      const savings = Number(localStorage.getItem("total_savings") || "45000");
      
      // Calculate derived metrics
      // In a real app, you'd aggregate recent expenses
      const expenses = 55000;
      const debt = 12000;
      const budgetAdherence = 95; // 95% usage of budget

      const calculatedMetrics = computeHealthScore(income, expenses, savings, debt, budgetAdherence);
      setMetrics(calculatedMetrics);
      setRecommendations(getHealthRecommendations(calculatedMetrics));
    }
  }, []);

  if (!isMounted || !metrics) return null;

  // Determine color coding based on score
  let strokeColor = "#dc2626"; // text-error
  let statusText = "Needs Attention";
  
  if (metrics.totalScore >= 80) {
    strokeColor = "#059669"; // text-success
    statusText = "Excellent Health";
  } else if (metrics.totalScore >= 50) {
    strokeColor = "#ea580c"; // text-warning (orange)
    statusText = "Stable";
  }

  // SVG Arc calculation
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  // We only draw a semi-circle (arc) -> half circumference
  const strokeDashoffset = circumference - (metrics.totalScore / 100) * (circumference / 2);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Financial Health Score
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Your holistic financial vitality rating calculated in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Arc Visualizer */}
        <section className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
          <h3 className="text-sm font-bold text-foreground-secondary absolute top-6 left-6 uppercase tracking-widest">
            Overall Rating
          </h3>
          
          <div className="relative w-72 h-40 flex items-end justify-center mt-6">
            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 280 140">
              {/* Background Arc */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="#f1f5f9" // border color
                strokeWidth="20"
                strokeDasharray={circumference}
                strokeDashoffset={circumference / 2}
                strokeLinecap="round"
                className="transform -rotate-180 origin-center"
              />
              {/* Foreground Animated Arc */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth="20"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transform -rotate-180 origin-center transition-all duration-1500 ease-out"
              />
            </svg>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-6xl font-black tracking-tighter" style={{ color: strokeColor }}>
                {metrics.totalScore}
              </span>
              <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider mt-1">
                {statusText}
              </span>
            </div>
          </div>
        </section>

        {/* Component Breakdown */}
        <section className="space-y-3">
          <h3 className="text-sm font-bold text-foreground-secondary uppercase tracking-widest pl-2">
            Metric Breakdown
          </h3>
          <div className="space-y-3">
            <BreakdownRow label="Savings Rate" score={metrics.savingsRateScore} weight="30%" />
            <BreakdownRow label="Budget Discipline" score={metrics.budgetDisciplineScore} weight="25%" />
            <BreakdownRow label="Vault Velocity" score={metrics.vaultVelocityScore} weight="20%" />
            <BreakdownRow label="Debt Load" score={metrics.debtToIncomeScore} weight="15%" />
            <BreakdownRow label="Spending Stability" score={metrics.spendingStabilityScore} weight="10%" />
          </div>
        </section>
      </div>

      {/* Tailored Recommendations */}
      <section className="bg-primary-lighter border border-primary/20 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-primary text-lg flex items-center gap-2">
          <Target className="w-5 h-5" />
          AI Prescriptions
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 bg-card/60 p-4 rounded-xl border border-primary/10">
              <Zap className="w-5 h-5 shrink-0 text-primary mt-0.5" />
              <p className="text-sm font-semibold text-primary-darker leading-relaxed">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BreakdownRow({ label, score, weight }: { label: string, score: number, weight: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-success bg-success-light border-success/20";
    if (s >= 50) return "text-warning bg-warning-light border-warning/20";
    return "text-error bg-error-light border-error/20";
  };

  return (
    <div className="flex items-center justify-between bg-card border border-border p-3 px-4 rounded-xl shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col">
        <span className="font-bold text-sm text-foreground">{label}</span>
        <span className="text-[10px] text-foreground-muted font-bold">Weight: {weight}</span>
      </div>
      <div className={`px-3 py-1 rounded-lg border font-black text-sm ${getScoreColor(score)}`}>
        {score} / 100
      </div>
    </div>
  );
}
