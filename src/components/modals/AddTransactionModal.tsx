"use client";

import React, { useState, useEffect } from "react";
import { X, Home, ShoppingBag, Tv, Layers, AlertTriangle, CheckCircle2 } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "Housing", name: "Housing", icon: Home },
  { id: "Groceries", name: "Groceries", icon: ShoppingBag },
  { id: "Entertainment", name: "Entertainment", icon: Tv },
  { id: "Investment", name: "Investment", icon: Layers },
];

const DEFAULT_BUDGETS: Record<string, number> = {
  Housing: 25000,
  Groceries: 12000,
  Entertainment: 6000,
  Investment: 20000,
};

export default function AddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: AddTransactionModalProps) {
  const [transactionType, setTransactionType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    // Reset state on open
    if (isOpen) {
      setTransactionType("expense");
      setAmount("");
      setCategory("Housing");
      setDescription("");
      setSuccess(false);
      setAlertMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    // Load active transactions
    const storedTransactions = localStorage.getItem("transactions");
    const transactions = storedTransactions ? JSON.parse(storedTransactions) : [];

    // Create new record
    const newTx = {
      id: Math.random().toString(36).substring(2, 9),
      amount: numAmount,
      type: transactionType,
      category: transactionType === "income" ? "Salary" : category,
      description: description || (transactionType === "income" ? "Active Inflow" : `${category} Cost`),
      date: new Date().toISOString(),
    };

    // Save to ledger array
    const updatedTransactions = [newTx, ...transactions];
    localStorage.setItem("transactions", JSON.stringify(updatedTransactions));

    // Update active cache totals to keep home dashboard in sync
    const currentIncome = Number(localStorage.getItem("total_income") || "75000");
    const currentSavings = Number(localStorage.getItem("total_savings") || "22000");

    if (transactionType === "income") {
      localStorage.setItem("total_income", String(currentIncome + numAmount));
    } else {
      localStorage.setItem("total_savings", String(Math.max(0, currentSavings - numAmount)));
      
      // Perform Budget Threshold Check (80% capacity checks)
      const budgets = JSON.parse(localStorage.getItem("budgets") || JSON.stringify(DEFAULT_BUDGETS));
      const activeBudget = budgets[category] || DEFAULT_BUDGETS[category] || 10000;

      // Sum active monthly costs in this category
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const categorySpent = updatedTransactions
        .filter((tx: any) => {
          const txDate = new Date(tx.date);
          return (
            tx.type === "expense" &&
            tx.category === category &&
            txDate.getMonth() === currentMonth &&
            txDate.getFullYear() === currentYear
          );
        })
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      const usageRate = categorySpent / activeBudget;

      if (usageRate >= 0.8) {
        const usagePercentage = Math.round(usageRate * 100);
        const warning = `Alert: Budget usage for ${category} has reached ${usagePercentage}% (${categorySpent} spent out of ${activeBudget}).`;
        
        // Write to alert notification system feed
        const storedNotes = localStorage.getItem("notifications");
        const notifications = storedNotes ? JSON.parse(storedNotes) : [
          "Your weekly financial health sync ran successfully.",
          "Housing budget limit is approaching 80%.",
          "Goal 'Emergency Fund' reached 75% milestones!"
        ];
        
        const updatedNotes = [warning, ...notifications];
        localStorage.setItem("notifications", JSON.stringify(updatedNotes));
        setAlertMessage(`Warning: Cross-category threshold alert triggered! ${category} budget utilization is at ${usagePercentage}%.`);
      }
    }

    setSuccess(true);
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center p-0 md:p-4 animate-in fade-in duration-200">
      
      {/* Drawer overlay on Mobile, Modal Container on Desktop */}
      <div 
        className="w-full bg-card border-t md:border border-border rounded-t-3xl md:rounded-2xl max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[90vh] md:max-h-none flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background-subtle">
          <div>
            <h3 className="text-lg font-black text-foreground">Record Transaction</h3>
            <p className="text-xs font-semibold text-foreground-muted">Update ledger balance instant data syncs.</p>
          </div>
          <button
            onClick={onClose}
            className="text-icon-muted hover:text-icon-active p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scroll Area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-success-light text-success flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-foreground text-lg">Transaction Recorded</h4>
                <p className="text-sm text-foreground-muted">Ledger calculations synced in real-time.</p>
              </div>
              {alertMessage && (
                <div className="flex items-center gap-2 p-3 text-xs text-warning bg-warning-light rounded-xl font-medium max-w-sm mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-brand" />
                  <span className="text-left leading-relaxed text-brand-hover">{alertMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Type Switcher Toggle (Expense vs Income) */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Transaction Mode
                </span>
                <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-xl relative">
                  <button
                    type="button"
                    onClick={() => setTransactionType("expense")}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      transactionType === "expense"
                        ? "bg-destructive text-destructive-foreground shadow-sm font-extrabold"
                        : "text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionType("income")}
                    className={`py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      transactionType === "income"
                        ? "bg-success text-success-foreground shadow-sm font-extrabold"
                        : "text-foreground-secondary hover:text-foreground"
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              {/* Amount Inputs */}
              <div className="space-y-1">
                <label htmlFor="amount" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Transaction Amount (Value)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-foreground-secondary text-lg">
                    ₹
                  </span>
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-base pl-9 w-full text-lg font-extrabold tracking-tight"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Expense Specific - 4-Column Category Grid */}
              {transactionType === "expense" && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider block">
                    Choose Budget Category
                  </span>
                  <div className="grid grid-cols-4 gap-3">
                    {CATEGORY_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = category === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCategory(opt.id)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary-lighter text-primary border-primary font-bold scale-105"
                              : "bg-card border-border text-icon-default hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-[10px] truncate max-w-full">{opt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Narrative Description */}
              <div className="space-y-1">
                <label htmlFor="description" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Description / Vendor Detail
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-base w-full"
                  placeholder="e.g. Weekly organic vegetables"
                />
              </div>

              {/* Submission Tray */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Save Entry
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
