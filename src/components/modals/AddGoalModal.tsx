"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Target, Calendar, Coins } from "lucide-react";
import { SavingsGoal, getSavingsGoals, setSavingsGoals, generateId } from "@/core/store/dataStore";

interface AddGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddGoalModal({
  isOpen,
  onClose,
  onSuccess,
}: AddGoalModalProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(target);
    if (!name.trim() || isNaN(numTarget) || numTarget <= 0 || !deadline) return;

    const newGoal: SavingsGoal = {
      id: generateId(),
      name: name.trim(),
      target: numTarget,
      current: 0,
      deadline: new Date(deadline).toISOString(),
    };

    const existing = getSavingsGoals();
    setSavingsGoals([...existing, newGoal]);

    setSuccess(true);
    setTimeout(() => {
      // Reset
      setName("");
      setTarget("");
      setDeadline("");
      setSuccess(false);
      onClose();
      if (onSuccess) onSuccess();
    }, 1500);
  };

  const handleClose = () => {
    setName("");
    setTarget("");
    setDeadline("");
    setSuccess(false);
    onClose();
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center p-0 md:p-4 animate-in fade-in duration-200">
      <div
        className="w-full bg-card border-t md:border border-border rounded-t-3xl md:rounded-2xl max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-300 max-h-[90vh] md:max-h-none flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background-subtle">
          <div>
            <h3 className="text-lg font-black text-foreground">Create Savings Goal</h3>
            <p className="text-xs font-semibold text-foreground-muted">Define a target and deadline to start tracking.</p>
          </div>
          <button
            onClick={handleClose}
            className="text-icon-muted hover:text-icon-active p-1.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-success-light text-success flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-foreground text-lg">Goal Created!</h4>
                <p className="text-sm text-foreground-muted">Start logging deposits to track your progress.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Goal Name */}
              <div className="space-y-1">
                <label htmlFor="goal-name" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Goal Name
                </label>
                <input
                  id="goal-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-base w-full"
                  placeholder="e.g. Vacation Fund, New Laptop, Emergency Fund"
                  required
                  autoFocus
                />
              </div>

              {/* Target Amount */}
              <div className="space-y-1">
                <label htmlFor="goal-target" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" />
                  Target Amount
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-foreground-secondary text-lg">
                    ₹
                  </span>
                  <input
                    id="goal-target"
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="input-base pl-9 w-full text-lg font-extrabold tracking-tight"
                    placeholder="50,000"
                    min="1"
                    step="1"
                    required
                  />
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-1">
                <label htmlFor="goal-deadline" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Target Deadline
                </label>
                <input
                  id="goal-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-base w-full"
                  min={minDate}
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  Create Goal
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
