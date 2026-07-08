"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Save } from "lucide-react";
import { getBudgets, setBudgets } from "@/core/store/dataStore";
import { getActiveCategories } from "@/core/utils/categories";

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SetBudgetModal({
  isOpen,
  onClose,
  onSuccess,
}: SetBudgetModalProps) {
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [success, setSuccess] = useState(false);
  // Budgetable categories are the user's active expense categories.
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const names = getActiveCategories("expense").map((c) => c.name);
      const first = names[0] ?? "";
      const budgets = getBudgets();
      setTimeout(() => {
        setCategories(names);
        setSuccess(false);
        setCategory(first);
        setLimit(first && budgets[first] ? String(budgets[first]) : "");
      }, 0);
    }
  }, [isOpen]);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    const budgets = getBudgets();
    setLimit(budgets[cat] ? String(budgets[cat]) : "");
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numLimit = parseFloat(limit);
    if (isNaN(numLimit) || numLimit <= 0) return;

    // Route through the data store so the write is persisted, synced to the
    // cloud, and broadcast to reactive subscribers (e.g. the home dashboard).
    // Writing localStorage directly here would be silently reverted by the
    // next Firestore snapshot and would never notify other pages.
    setBudgets({ ...getBudgets(), [category]: numLimit });

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
            <h3 className="text-lg font-black text-foreground">Adjust Category Budget</h3>
            <p className="text-xs font-semibold text-foreground-muted">Configure active expenditure limit caps.</p>
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
                <h4 className="font-extrabold text-foreground">Budget Adjusted</h4>
                <p className="text-sm text-foreground-muted">Expenditure alert lines updated successfully.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Category Chips Selector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider block">
                  Select Category
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary-lighter text-primary border-primary scale-102 shadow-sm font-extrabold"
                            : "bg-background border-border text-foreground-secondary hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Numeric Limit Input */}
              <div className="space-y-1">
                <label htmlFor="limit" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                  Monthly Capital Limit (INR ₹)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-foreground-secondary pointer-events-none">
                    ₹
                  </span>
                  <input
                    id="limit"
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="input-base pl-9 pr-3 w-full text-base font-extrabold tracking-tight"
                    placeholder="Enter limit threshold"
                    min="1"
                    step="1"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Action Tray */}
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
                  <Save className="w-4 h-4" />
                  Save Budget
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
