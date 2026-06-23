"use client";

import React, { useState } from "react";
import { Receipt, Plus, Users, ArrowRight, MessageCircle, X, UserCheck, ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { simplifyDebts, calculateBalances, ExpenseEntry, Settlement, BalanceRecord } from "@/core/math/DebtSimplifier";
import { formatAmount } from "@/core/utils/currencyManager";

export default function BillSplitterPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  
  // Form State
  const [splitMode, setSplitMode] = useState<"equal" | "individual">("equal");
  const [paidBy, setPaidBy] = useState("");
  const [amount, setAmount] = useState("");
  const [participantsStr, setParticipantsStr] = useState("");
  const [assignTo, setAssignTo] = useState("");

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidBy || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    let participants: string[];

    if (splitMode === "individual") {
      if (!assignTo.trim()) return;
      // In individual mode, the entire bill is assigned to one person
      participants = [assignTo.trim()];
    } else {
      if (!participantsStr) return;
      participants = participantsStr.split(",").map(p => p.trim()).filter(Boolean);
    }
    
    const newExpense: ExpenseEntry = {
      paidBy: paidBy.trim(),
      amount: parsedAmount,
      participants
    };

    const newExpenses = [...expenses, newExpense];
    setExpenses(newExpenses);

    // Automatically recalculate settlements + per-person balances
    setSettlements(simplifyDebts(newExpenses));
    setBalances(calculateBalances(newExpenses));

    // Reset fields
    setPaidBy("");
    setAmount("");
    setParticipantsStr("");
    setAssignTo("");
  };

  const removeExpense = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(newExpenses);
    setSettlements(simplifyDebts(newExpenses));
    setBalances(calculateBalances(newExpenses));
  };

  const getWhatsAppLink = (settlement: Settlement) => {
    const message = `Hi ${settlement.from}, you owe me ${formatAmount(settlement.amount, "INR")} for our shared expenses. Please transfer when possible!`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  // Split the net balances into people who get money back, who owe, and who are square.
  const takeBack = balances.filter((b) => b.balance > 0);
  const toGive = balances.filter((b) => b.balance < 0);
  const settled = balances.filter((b) => b.balance === 0);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <Receipt className="w-8 h-8 text-primary" />
          Smart Bill Splitter
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Add group expenses and instantly generate the minimum optimal transfer paths.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Col: Workspace Input */}
        <div className="space-y-6">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h3 className="font-extrabold text-foreground mb-4">Log Shared Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">

              {/* Split Mode Toggle */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">Split Mode</span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSplitMode("equal")}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      splitMode === "equal"
                        ? "bg-primary text-white shadow-sm font-extrabold"
                        : "text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode("individual")}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      splitMode === "individual"
                        ? "bg-brand text-white shadow-sm font-extrabold"
                        : "text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Individual
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">Who Paid?</label>
                <input 
                  type="text" 
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="input-base w-full"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">Total Amount</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-base w-full"
                  min="0.01" step="0.01"
                  required
                />
              </div>

              {splitMode === "equal" ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">Split Between (Comma separated)</label>
                  <input 
                    type="text" 
                    value={participantsStr}
                    onChange={e => setParticipantsStr(e.target.value)}
                    placeholder="Rahul, Amit, Sneha"
                    className="input-base w-full"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider">Assign Full Bill To</label>
                  <input 
                    type="text" 
                    value={assignTo}
                    onChange={e => setAssignTo(e.target.value)}
                    placeholder="e.g. Amit"
                    className="input-base w-full"
                    required
                  />
                  <p className="text-[10px] font-semibold text-foreground-muted mt-0.5">
                    The entire amount will be owed by this person to the payer.
                  </p>
                </div>
              )}

              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 mt-2">
                <Plus className="w-4 h-4" />
                Add to Pool
              </button>
            </form>
          </div>

          {/* Logged Expenses */}
          {expenses.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2">
                Logged Bills
              </h4>
              <div className="space-y-2">
                {expenses.map((exp, idx) => (
                  <div key={idx} className="bg-background-subtle border border-border p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block text-sm">{exp.paidBy} paid {formatAmount(exp.amount, "INR")}</span>
                      <span className="text-[10px] font-bold text-foreground-muted">For: {exp.participants.join(", ")}</span>
                    </div>
                    <button 
                      onClick={() => removeExpense(idx)}
                      className="text-icon-muted hover:text-error p-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Optimized Settlements */}
        <div className="space-y-6">
          <div className="bg-primary-lighter border border-primary/20 p-6 rounded-2xl shadow-sm flex flex-col h-full">
            <div className="space-y-1 mb-6">
              <h3 className="font-extrabold text-primary flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Optimized Settlements
              </h3>
              <p className="text-xs font-semibold text-primary/70">
                Minimum necessary transfers to settle all debts.
              </p>
            </div>

            {settlements.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-primary/20 rounded-xl p-8 text-center text-primary/50 text-sm font-bold">
                Add expenses to see who owes whom.
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {settlements.map((settlement, idx) => (
                  <div key={idx} className="bg-card p-4 rounded-xl shadow-sm border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground text-sm w-16 truncate">{settlement.from}</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-extrabold text-foreground-muted uppercase">Pays</span>
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-bold text-foreground text-sm w-16 truncate">{settlement.to}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-foreground">
                        {formatAmount(settlement.amount, "INR")}
                      </span>
                      <a
                        href={getWhatsAppLink(settlement)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-success-light text-success flex items-center justify-center hover:bg-success hover:text-white transition-colors"
                        title="Request via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ────────────────── PER-PERSON NET BALANCES ────────────────── */}
      {balances.length > 0 && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <div className="space-y-1 mb-6">
            <h3 className="font-extrabold text-foreground flex items-center gap-2 text-lg">
              <Scale className="w-5 h-5 text-brand" />
              Net Balances
            </h3>
            <p className="text-xs font-semibold text-foreground-muted">
              Who needs to give money, and who gets it back.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gets money back (creditors) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-success">
                <ArrowDownLeft className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  To Take Back
                </span>
              </div>
              {takeBack.length === 0 ? (
                <p className="text-xs font-semibold text-foreground-muted pl-1">
                  Nobody is owed money yet.
                </p>
              ) : (
                takeBack.map((b) => (
                  <div
                    key={b.person}
                    className="flex items-center justify-between bg-success-light border border-success/20 p-3 rounded-xl"
                  >
                    <span className="font-bold text-foreground text-sm truncate pr-2">
                      {b.person}
                    </span>
                    <span className="font-black text-success text-sm shrink-0">
                      + {formatAmount(b.balance, "INR")}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Owes money (debtors) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-error">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  To Give
                </span>
              </div>
              {toGive.length === 0 ? (
                <p className="text-xs font-semibold text-foreground-muted pl-1">
                  Nobody owes money yet.
                </p>
              ) : (
                toGive.map((b) => (
                  <div
                    key={b.person}
                    className="flex items-center justify-between bg-error-light border border-error/20 p-3 rounded-xl"
                  >
                    <span className="font-bold text-foreground text-sm truncate pr-2">
                      {b.person}
                    </span>
                    <span className="font-black text-error text-sm shrink-0">
                      − {formatAmount(Math.abs(b.balance), "INR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {settled.length > 0 && (
            <p className="text-[11px] font-semibold text-foreground-muted mt-5 pt-4 border-t border-border">
              Settled up: {settled.map((b) => b.person).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
