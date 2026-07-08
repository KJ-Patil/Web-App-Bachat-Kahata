"use client";

import React, { useState, useEffect } from "react";
import { X, Check, ArrowUpRight } from "lucide-react";
import { addTransaction, getSavingsGoals, setSavingsGoals } from "@/core/store/dataStore";
import CalculatorPopover from "@/components/inputs/CalculatorPopover";

interface LogDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  goalId: string | null;
  goalName: string;
}

export default function LogDepositModal({
  isOpen,
  onClose,
  onSuccess,
  goalId,
  goalName,
}: LogDepositModalProps) {
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !goalId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    // Update the targeted goal's accumulated amount.
    const goals = getSavingsGoals();
    const updatedGoals = goals.map((g) =>
      g.id === goalId ? { ...g, current: g.current + numAmount } : g
    );
    setSavingsGoals(updatedGoals);

    // Also log this deposit as an "Investment" category transaction in the general
    // ledger so that active savings/liquidity metric indices update dynamically!
    addTransaction({
      amount: numAmount,
      type: "expense", // Deposits to savings are out of active liquid flow
      category: "Investment",
      description: `Deposit to '${goalName}' vault`,
    });

    setSuccess(true);
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center p-0 md:p-4 animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div 
        className="w-full bg-card border-t md:border border-border rounded-t-3xl md:rounded-2xl max-w-md shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background-subtle">
          <div>
            <h3 className="text-lg font-black text-foreground">Log Vault Deposit</h3>
            <p className="text-xs font-semibold text-foreground-muted">Record deposits for: <strong className="text-primary">{goalName}</strong></p>
          </div>
          <button
            onClick={onClose}
            className="text-icon-muted hover:text-icon-active p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-success-light text-success flex items-center justify-center shadow-sm">
                <Check className="w-6 h-6 stroke-[3px]" />
              </div>
              <div>
                <h4 className="font-extrabold text-foreground">Deposit Recorded</h4>
                <p className="text-sm text-foreground-muted">Savings objectives and ledger metrics synced.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Deposit Value */}
              <div className="space-y-1">
                <label htmlFor="deposit-amount" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Amount to Deposit (INR ₹)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-foreground-secondary pointer-events-none">
                    ₹
                  </span>
                  <input
                    id="deposit-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-base pl-9 pr-12 w-full text-base font-extrabold tracking-tight"
                    placeholder="0.00"
                    min="1"
                    step="1"
                    required
                    autoFocus
                  />
                  <div className="absolute right-3 flex items-center">
                    <CalculatorPopover value={amount} onChange={setAmount} title="Deposit Calc" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Log Deposit
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
