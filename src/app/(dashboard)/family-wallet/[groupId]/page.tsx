"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Receipt, Plus, Settings, CheckCircle2, TrendingDown, AlertTriangle } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import { GroupExpense, useFamilyGroups, setFamilyGroups, useFamilyExpenses, setFamilyExpenses } from "@/core/store/dataStore";

export default function FamilyGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const groupId = resolvedParams.groupId;

  const groups = useFamilyGroups();
  const allExpenses = useFamilyExpenses();
  const group = groups.find((g) => g.id === groupId);
  const expenses = allExpenses.filter((e) => e.groupId === groupId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const [activeCurrency, setActiveCurrency] = useState("INR");
  
  const isOverLimit = group?.spendingLimit && group.spendingLimit > 0 && group.totalBalance > group.spendingLimit;

  // Claim overlay
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Limit overlay
  const [isLimitOpen, setIsLimitOpen] = useState(false);
  const [limitInput, setLimitInput] = useState("");

  const handleOpenLimit = () => {
    setLimitInput(group?.spendingLimit?.toString() || "");
    setIsLimitOpen(true);
  };

  const handleSaveLimit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(limitInput);
    if (isNaN(num)) return; 

    const updatedGroups = groups.map((g) => g.id === groupId ? { ...g, spendingLimit: num } : g);
    setFamilyGroups(updatedGroups);
    setIsLimitOpen(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) setActiveCurrency(cur);
    }
  }, []);

  useEffect(() => {
    if (groups.length > 0 && !group) {
      router.push("/family-wallet");
    }
  }, [group, groups, router]);

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || !group) return;

    const newExp: GroupExpense = {
      id: Math.random().toString(36).substring(2, 9),
      groupId: groupId,
      amount: num,
      description: description || "Expense claim",
      paidBy: "You",
      date: new Date().toISOString(),
    };

    setFamilyExpenses([newExp, ...allExpenses]);
    
    const updatedGroups = groups.map((g) => g.id === groupId ? { ...g, totalBalance: g.totalBalance + num } : g);
    setFamilyGroups(updatedGroups);

    setAmount("");
    setDescription("");
    setIsClaimOpen(false);
  };

  if (!group) return null;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex justify-between items-center bg-card border border-border p-4 rounded-2xl shadow-sm">
        <Link
          href="/family-wallet"
          className="flex items-center gap-2 text-xs font-bold text-foreground-secondary hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Shared Wallets
        </Link>
        <span className="text-[10px] font-bold text-foreground-muted flex items-center gap-1 bg-secondary px-2 py-1 rounded-md">
          <Users className="w-3 h-3" /> Code: {group.code}
        </span>
      </header>

      {/* Main Info */}
      <section className="bg-primary-lighter border border-primary/20 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-primary">
            {group.name}
          </h2>
          <span className="text-xs font-semibold text-primary/70 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {group.members} Members Syncing
          </span>
        </div>

        <div className="text-left sm:text-right space-y-1">
          <div className="flex flex-col sm:items-end">
            {isOverLimit && (
              <div className="flex items-center gap-1.5 text-red-500 mb-1">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider">Limit Exceeded</span>
              </div>
            )}
            <div className="flex items-end sm:justify-end gap-2">
              <span className={`text-3xl font-black tracking-tight ${isOverLimit ? 'text-red-500' : 'text-primary'}`}>
                {formatAmount(group.totalBalance, activeCurrency)}
              </span>
              {group.spendingLimit && group.spendingLimit > 0 ? (
                <span className={`text-sm font-bold mb-1 ${isOverLimit ? 'text-red-500/70' : 'text-primary/50'}`}>
                  / {formatAmount(group.spendingLimit, activeCurrency)}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-primary/70 mt-1">
              Total Group Pool
            </span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="flex gap-4">
        <button 
          onClick={() => setIsClaimOpen(true)}
          className="btn-primary flex-1 py-4 text-sm font-extrabold flex items-center justify-center gap-2"
        >
          <Receipt className="w-5 h-5" />
          Add Expense Claim
        </button>
        <button 
          onClick={handleOpenLimit}
          className="bg-card border border-border text-foreground px-6 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-secondary"
        >
          <Settings className="w-5 h-5" />
          Limits
        </button>
      </section>

      {/* Expense History List */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2">
          Collaborative History
        </h3>

        <div className="space-y-3">
          {expenses.map((exp) => (
            <div key={exp.id} className="bg-card border border-border p-4 rounded-xl shadow-sm flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border border-border">
                  <TrendingDown className="w-5 h-5 text-icon-default" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">{exp.description}</h4>
                  <span className="text-[10px] text-foreground-muted font-bold">
                    Paid by: {exp.paidBy} • {new Date(exp.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-foreground">
                  {formatAmount(exp.amount, activeCurrency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add Claim Overlay */}
      {isClaimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground text-center">New Group Expense</h3>
            <form onSubmit={handleAddClaim} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground-secondary uppercase">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-base w-full"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground-secondary uppercase">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-base w-full"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsClaimOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Limit Overlay */}
      {isLimitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground text-center">Set Group Limit</h3>
            <p className="text-xs text-foreground-muted text-center">
              Set a maximum spending limit for this shared wallet (enter 0 for no limit).
            </p>
            <form onSubmit={handleSaveLimit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground-secondary uppercase">Limit Amount</label>
                <input
                  type="number"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  className="input-base w-full"
                  placeholder="e.g. 5000"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsLimitOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Save Limit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
