"use client";

import React, { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { SlidersHorizontal, ShieldAlert, History, CreditCard, CalendarDays, Percent, Shuffle } from "lucide-react";

// Base score starts at 300. Max is 900.
// Total variable points = 600
// Weights:
// Payment History: 35% (max 210 points)
// Utilization: 30% (max 180 points)
// Age: 15% (max 90 points)
// Mix: 10% (max 60 points)
// New Credit: 10% (max 60 points)

export default function CibilSimulatorPage() {
  const [paymentHistory, setPaymentHistory] = useState(100); // 0-100%
  const [utilization, setUtilization] = useState(30); // 0-100% (lower is better, ideally < 30%)
  const [ageOfCredit, setAgeOfCredit] = useState(5); // 0-15 years
  const [creditMix, setCreditMix] = useState(3); // 1-5 types
  const [recentInquiries, setRecentInquiries] = useState(0); // 0-10 inquiries

  const [simulatedScore, setSimulatedScore] = useState(750);

  // Framer motion spring for smooth score counting
  const animatedScore = useSpring(simulatedScore, { stiffness: 50, damping: 20 });
  const displayScore = useTransform(animatedScore, (latest) => Math.round(latest));

  useEffect(() => {
    // Calculate new score based on inputs
    const base = 300;

    // Payment History: 100% = 210 pts, drops sharply
    let phPoints = (paymentHistory / 100) * 210;
    if (paymentHistory < 90) phPoints *= 0.5; // Penalty for missed payments

    // Utilization: 30% or less = 180 pts. Hits 0 at 100%.
    let utPoints = 180;
    if (utilization > 30) {
      utPoints = Math.max(0, 180 - ((utilization - 30) / 70) * 180);
    }

    // Age: 10+ years = 90 pts
    const agePoints = Math.min(1, ageOfCredit / 10) * 90;

    // Mix: 4+ types = 60 pts
    const mixPoints = Math.min(1, creditMix / 4) * 60;

    // Inquiries: 0 = 60 pts, drops per inquiry
    const inqPoints = Math.max(0, 60 - recentInquiries * 15);

    const total = Math.round(base + phPoints + utPoints + agePoints + mixPoints + inqPoints);
    setSimulatedScore(Math.min(900, Math.max(300, total)));
  }, [paymentHistory, utilization, ageOfCredit, creditMix, recentInquiries]);

  // Determine band
  const getBandInfo = (score: number) => {
    if (score >= 750) return { label: "Excellent", color: "text-success", bg: "bg-success-light" };
    if (score >= 700) return { label: "Good", color: "text-primary", bg: "bg-primary-lighter" };
    if (score >= 650) return { label: "Fair", color: "text-warning", bg: "bg-warning-light" };
    return { label: "Poor", color: "text-error", bg: "bg-error-light" };
  };

  const band = getBandInfo(simulatedScore);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <SlidersHorizontal className="w-8 h-8 text-brand" />
          Credit Sandbox Simulator
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Adjust the parameters below to understand how specific actions impact your credit score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Score Display Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border rounded-3xl p-8 flex flex-col items-center justify-center shadow-md relative min-h-[300px]">
            <span className="text-xs font-bold text-foreground-secondary uppercase tracking-widest mb-6">
              Simulated CIBIL Score
            </span>
            
            <motion.div className="flex flex-col items-center justify-center gap-2">
              <motion.span 
                className={`text-8xl font-black tracking-tighter ${band.color}`}
              >
                {displayScore}
              </motion.span>
              <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest ${band.color} ${band.bg}`}>
                {band.label}
              </span>
            </motion.div>

            <div className="w-full flex justify-between text-[10px] font-bold text-foreground-muted mt-12 border-t border-border pt-4">
              <span>Min: 300</span>
              <span>Max: 900</span>
            </div>
          </div>

          <div className="bg-brand-light border border-brand/20 p-5 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-brand-hover leading-relaxed">
              This is an educational simulator. The actual proprietary CIBIL algorithm may weigh these factors slightly differently based on total profile depth.
            </p>
          </div>
        </div>

        {/* Interactive Sliders */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 md:p-8 space-y-8 shadow-sm">
          
          <SliderControl 
            icon={History}
            label="Payment History (35%)"
            value={paymentHistory}
            setValue={setPaymentHistory}
            min={0} max={100} step={1}
            suffix="%"
            desc="On-time payment percentage"
            invertColor={false}
          />

          <SliderControl 
            icon={Percent}
            label="Credit Utilization (30%)"
            value={utilization}
            setValue={setUtilization}
            min={0} max={100} step={1}
            suffix="%"
            desc="Credit used vs limits (Aim for <30%)"
            invertColor={true} // Lower is better
          />

          <SliderControl 
            icon={CalendarDays}
            label="Credit Age (15%)"
            value={ageOfCredit}
            setValue={setAgeOfCredit}
            min={0} max={15} step={0.5}
            suffix=" Yrs"
            desc="Average age of open accounts"
            invertColor={false}
          />

          <SliderControl 
            icon={Shuffle}
            label="Credit Mix (10%)"
            value={creditMix}
            setValue={setCreditMix}
            min={1} max={6} step={1}
            suffix=" Types"
            desc="Variety (Cards, Auto, Home Loans)"
            invertColor={false}
          />

          <SliderControl 
            icon={CreditCard}
            label="Recent Inquiries (10%)"
            value={recentInquiries}
            setValue={setRecentInquiries}
            min={0} max={10} step={1}
            suffix=" Hard Pulls"
            desc="New credit applications in past 12m"
            invertColor={true} // Lower is better
          />

        </div>
      </div>
    </div>
  );
}

// Reusable Slider Component
function SliderControl({ 
  icon: Icon, label, value, setValue, min, max, step, suffix, desc, invertColor 
}: any) {
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  // Calculate visual track color based on invert mode
  let trackColor = "bg-primary";
  if (invertColor) {
    if (percentage > 70) trackColor = "bg-error";
    else if (percentage > 30) trackColor = "bg-warning";
    else trackColor = "bg-success";
  } else {
    if (percentage < 30) trackColor = "bg-error";
    else if (percentage < 70) trackColor = "bg-warning";
    else trackColor = "bg-success";
  }

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
          {value}{suffix}
        </span>
      </div>

      <div className="relative h-2 bg-secondary rounded-full cursor-pointer">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-colors ${trackColor}`}
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
        {/* Custom Thumb */}
        <div 
          className="absolute top-1/2 -mt-2.5 w-5 h-5 bg-white border-2 border-border rounded-full shadow-sm pointer-events-none group-hover:scale-110 transition-transform"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
    </div>
  );
}
