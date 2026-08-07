"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Wallet,
  Coins,
  CalendarRange,
  Percent,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatAmount } from "@/core/utils/currencyManager";
import { simulateWhatIf } from "@/core/insights/whatIf";

export default function WhatIfSimulatorPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [monthly, setMonthly] = useState(5000);
  const [lumpSum, setLumpSum] = useState(0);
  const [years, setYears] = useState(3);
  const [rate, setRate] = useState(8);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);
  }, []);

  const result = useMemo(
    () =>
      simulateWhatIf({
        monthlyContribution: monthly,
        initialLumpSum: lumpSum,
        years,
        annualRatePercent: rate,
      }),
    [monthly, lumpSum, years, rate]
  );

  const returnsPct =
    result.totalInvested > 0
      ? Math.round((result.totalReturns / result.totalInvested) * 100)
      : 0;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-brand" />
          What-If Simulator
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          See how regular saving and compound interest grow your money over time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Result Panel ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center justify-center shadow-md text-center">
            <span className="text-xs font-bold text-foreground-secondary uppercase tracking-widest mb-4">
              Projected Value
            </span>
            <span className="text-5xl font-black tracking-tighter text-success">
              {formatAmount(result.futureValue, activeCurrency, { decimalPlaces: 0 })}
            </span>
            <span className="mt-3 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest text-success bg-success-light">
              +{returnsPct}% growth
            </span>

            <div className="w-full grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-border">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block">
                  You Invest
                </span>
                <span className="text-sm font-extrabold text-foreground">
                  {formatAmount(result.totalInvested, activeCurrency, { decimalPlaces: 0 })}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block">
                  Est. Returns
                </span>
                <span className="text-sm font-extrabold text-success">
                  {formatAmount(result.totalReturns, activeCurrency, { decimalPlaces: 0 })}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-brand-light border border-brand/20 p-5 rounded-2xl flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-brand-hover leading-relaxed">
              Projections assume a fixed {rate}% annual return compounded monthly.
              Real returns vary — use this as a goal-setting guide, not a guarantee.
            </p>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 space-y-8 shadow-sm">
          <SliderControl
            icon={Wallet}
            label="Monthly Contribution"
            value={monthly}
            setValue={setMonthly}
            min={0}
            max={100000}
            step={500}
            format={(v) => formatAmount(v, activeCurrency, { decimalPlaces: 0 })}
            desc="Amount you set aside every month"
          />
          <SliderControl
            icon={Coins}
            label="Initial Lump Sum"
            value={lumpSum}
            setValue={setLumpSum}
            min={0}
            max={1000000}
            step={5000}
            format={(v) => formatAmount(v, activeCurrency, { decimalPlaces: 0 })}
            desc="One-time amount invested today"
          />
          <SliderControl
            icon={CalendarRange}
            label="Time Horizon"
            value={years}
            setValue={setYears}
            min={1}
            max={40}
            step={1}
            format={(v) => `${v} ${v === 1 ? "year" : "years"}`}
            desc="How long you stay invested"
          />
          <SliderControl
            icon={Percent}
            label="Expected Annual Return"
            value={rate}
            setValue={setRate}
            min={1}
            max={20}
            step={0.5}
            format={(v) => `${v}%`}
            desc="Average yearly growth rate"
          />
        </div>
      </div>

      {/* ── Growth chart ── */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground text-lg">Growth Trajectory</h3>
            <p className="text-xs text-foreground-muted">
              Invested capital vs projected value, year by year
            </p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={result.timeline}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="year"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(y) => `Y${y}`}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
                formatter={(value: number) =>
                  formatAmount(value, activeCurrency, { decimalPlaces: 0 })
                }
                labelFormatter={(y) => `Year ${y}`}
              />
              <Area
                type="monotone"
                dataKey="Value"
                stroke="#16a34a"
                strokeWidth={3}
                fill="url(#valueFill)"
              />
              <Area
                type="monotone"
                dataKey="Invested"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="url(#investedFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SliderControl({
  icon: Icon,
  label,
  value,
  setValue,
  min,
  max,
  step,
  format,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  setValue: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  desc: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-4 group">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-icon-default">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground">{label}</h4>
            <p className="text-[10px] font-semibold text-foreground-muted">{desc}</p>
          </div>
        </div>
        <span className="font-black text-lg text-foreground tracking-tight">
          {format(value)}
        </span>
      </div>

      <div className="relative h-2 bg-secondary rounded-full cursor-pointer">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -mt-2.5 w-5 h-5 bg-card border-2 border-border rounded-full shadow-sm pointer-events-none group-hover:scale-110 transition-transform"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}
