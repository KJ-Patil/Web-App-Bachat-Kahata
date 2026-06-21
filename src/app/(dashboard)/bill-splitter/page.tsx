"use client";

import React, { useState } from "react";
import { Receipt, Plus, Users, ArrowRight, MessageCircle, X } from "lucide-react";
import { simplifyDebts, ExpenseEntry, Settlement } from "@/core/math/DebtSimplifier";
import { formatAmount } from "@/core/utils/currencyManager";

export default function BillSplitterPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  
  // Form State
  const [paidBy, setPaidBy] = useState("");
  const [amount, setAmount] = useState("");
  const [participantsStr, setParticipantsStr] = useState("");

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidBy || !amount || !participantsStr) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const participants = participantsStr.split(",").map(p => p.trim()).filter(Boolean);
    // Ensure payer is in participants if implicitly meant, but usually they declare who shared it.
    
    const newExpense: ExpenseEntry = {
      paidBy: paidBy.trim(),
      amount: parsedAmount,
      participants
    };

    const newExpenses = [...expenses, newExpense];
    setExpenses(newExpenses);
    
    // Automatically recalculate settlements
    setSettlements(simplifyDebts(newExpenses));

    // Reset fields
    setPaidBy("");
    setAmount("");
    setParticipantsStr("");
  };

  const removeExpense = (index: number) => {
    const newExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(newExpenses);
    setSettlements(simplifyDebts(newExpenses));
  };

  const getWhatsAppLink = (settlement: Settlement) => {
    const message = `Hi ${settlement.from}, you owe me ${formatAmount(settlement.amount, "INR")} for our shared expenses. Please transfer when possible!`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

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
    </div>
  );
}
