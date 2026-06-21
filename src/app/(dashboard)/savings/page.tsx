"use client";

import React, { useState, useEffect } from "react";
import { Coins, Plus, Calendar, Target, TrendingUp, AlertCircle } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import LogDepositModal from "@/components/modals/LogDepositModal";

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

const SEED_GOALS: SavingsGoal[] = [
  {
    id: "goal-1",
    name: "Emergency Cash Buffer",
    target: 100000,
    current: 45000,
    deadline: "2026-12-31", // Future date
  },
  {
    id: "goal-2",
    name: "Thermax Certification",
    target: 25000,
    current: 15000,
    deadline: "2026-08-31", // Future date
  },
  {
    id: "goal-3",
    name: "Retirement Vault Index",
    target: 500000,
    current: 120000,
    deadline: "2028-06-30", // Future date
  },
];

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedGoalName, setSelectedGoalName] = useState("");

  useEffect(() => {
    loadGoalsData();
  }, []);

  const loadGoalsData = () => {
    if (typeof window === "undefined") return;

    // Load active currency
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);

    // Load goals
    const storedGoals = localStorage.getItem("savings_goals");
    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    } else {
      localStorage.setItem("savings_goals", JSON.stringify(SEED_GOALS));
      setGoals(SEED_GOALS);
    }
  };

  const handleOpenDepositModal = (goal: SavingsGoal) => {
    setSelectedGoalId(goal.id);
    setSelectedGoalName(goal.name);
    setIsModalOpen(true);
  };

  const calculateMonthlyRate = (goal: SavingsGoal) => {
    const remaining = goal.target - goal.current;
    if (remaining <= 0) return 0;

    const deadlineTime = new Date(goal.deadline).getTime();
    const nowTime = Date.now();
    const diffMs = deadlineTime - nowTime;

    // Convert ms to months
    const msInMonth = 30 * 24 * 60 * 60 * 1000;
    const monthsRemaining = diffMs / msInMonth;
    const roundedMonths = Math.max(Math.ceil(monthsRemaining), 1);

    return {
      monthlyAmount: remaining / roundedMonths,
      months: roundedMonths,
    };
  };

  // SVG Radial Circle configuration
  const SVG_RADIUS = 28;
  const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS; // 175.93

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
          Savings Objectives
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Track goals and calculate active monthly deposit requirements.
        </p>
      </div>

      {/* ────────────────── OBJECTIVE CARDS GRID ────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => {
          const pct = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          const strokeOffset = SVG_CIRCUMFERENCE - (pct / 100) * SVG_CIRCUMFERENCE;
          const rateInfo = calculateMonthlyRate(goal);
          const isCompleted = goal.current >= goal.target;

          return (
            <div
              key={goal.id}
              className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="space-y-1.5 min-w-0">
                  <h3 className="font-extrabold text-foreground text-base truncate pr-2">
                    {goal.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span>Target: {formatAmount(goal.target, activeCurrency)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>By: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* SVG Radial percentage tracker utilizing stroke-success */}
                <div className="relative flex items-center justify-center shrink-0 w-16 h-16">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                      cx="32"
                      cy="32"
                      r={SVG_RADIUS}
                      className="stroke-secondary fill-none"
                      strokeWidth="5"
                    />
                    {/* Progress Circle with stroke-success */}
                    <circle
                      cx="32"
                      cy="32"
                      r={SVG_RADIUS}
                      className="stroke-success fill-none transition-all duration-500 ease-out"
                      strokeWidth="5"
                      strokeDasharray={SVG_CIRCUMFERENCE}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-foreground">
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Monthly Rate Accumulation Math Fields */}
              <div className="py-3 border-t border-b border-border my-2 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-foreground-secondary uppercase tracking-wide">
                  <span>Accumulation Rate</span>
                  <span className="text-primary">{formatAmount(goal.current, activeCurrency)} saved</span>
                </div>
                
                {isCompleted ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-success">
                    <CheckCircleSVG />
                    <span>Goal target achieved!</span>
                  </div>
                ) : (
                  typeof rateInfo === "object" && (
                    <div className="text-xs font-semibold text-foreground-secondary">
                      Requires{" "}
                      <strong className="text-primary font-bold">
                        {formatAmount(rateInfo.monthlyAmount, activeCurrency)}
                      </strong>
                      /month for next {rateInfo.months} months.
                    </div>
                  )
                )}
              </div>

              {/* Deposit Buttons */}
              <button
                onClick={() => handleOpenDepositModal(goal)}
                className="btn-secondary w-full flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                Log Deposit
              </button>
            </div>
          );
        })}
      </section>

      {/* Log Deposit Modal Overlay */}
      <LogDepositModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadGoalsData}
        goalId={selectedGoalId}
        goalName={selectedGoalName}
      />
    </div>
  );
}

function CheckCircleSVG() {
  return (
    <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
