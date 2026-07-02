"use client";

import React, { useState, useEffect } from "react";
import { Search, Calendar, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Tag, Check, AlertCircle, X, Plus } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import {
  Transaction,
  useTransactions,
  updateTransaction as storeUpdateTransaction,
  deleteTransaction as storeDeleteTransaction,
} from "@/core/store/dataStore";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import { useTranslation } from "@/i18n/i18nContext";

export default function TransactionsPage() {
  const transactions = useTransactions();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");
  const [activeCurrency, setActiveCurrency] = useState("INR");

  // Edit & Delete Actions State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Add Transaction modal (the list re-renders live via the useTransactions hook)
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { t } = useTranslation();

  // Load active currency preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) {
        setActiveCurrency(cur);
      }
    }
  }, []);

  // Filter list on search query & active type tabs
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "income" && tx.type === "income") ||
      (activeTab === "expense" && tx.type === "expense");

    return matchesSearch && matchesTab;
  });

  // Income / expense totals for just the currently-shown (searched/filtered)
  // transactions, surfaced as KPI cards under the search box while searching.
  const filteredTotals = filteredTransactions.reduce(
    (acc, tx) => {
      if (tx.type === "income") {
        acc.income += tx.amount;
        acc.incomeCount += 1;
      } else {
        acc.expense += tx.amount;
        acc.expenseCount += 1;
      }
      return acc;
    },
    { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 }
  );

  // Relative Date sorting classification helper
  const groupTransactionsByDate = (txs: Transaction[]) => {
    const today = new Date().toDateString();
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    const groups: { today: Transaction[]; yesterday: Transaction[]; previous: Transaction[] } = {
      today: [],
      yesterday: [],
      previous: [],
    };

    txs.forEach((tx) => {
      const txDateStr = new Date(tx.date).toDateString();
      if (txDateStr === today) {
        groups.today.push(tx);
      } else if (txDateStr === yesterday) {
        groups.yesterday.push(tx);
      } else {
        groups.previous.push(tx);
      }
    });

    return groups;
  };

  const grouped = groupTransactionsByDate(filteredTransactions);

  // Action: Trigger Inline Deletion
  const handleDelete = (id: string) => {
    storeDeleteTransaction(id);
    setDeleteConfirmId(null);
  };

  // Action: Save Inline Edits
  const handleSaveEdit = (id: string) => {
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    storeUpdateTransaction(id, {
      amount: numAmount,
      description: editDescription,
      // Editing the amount directly overrides any prior discount breakdown.
      originalAmount: undefined,
      discountAmount: undefined,
    });
    setEditingId(null);
  };

  // Action: Enter Edit Mode
  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditAmount(String(tx.amount));
    setEditDescription(tx.description);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            {t('transactions.ledgerWorkspace')}
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            {t('transactions.reviewAndAudit')}
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="btn-primary shrink-0 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('transactions.addTransaction')}
        </button>
      </div>

      {/* ────────────────── SEARCH AND FILTERS ────────────────── */}
      <section className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-icon-muted">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base pl-10 w-full"
            placeholder={t('transactions.filterPlaceholder')}
          />
        </div>

        {/* Income / expense totals for the currently-searched transactions */}
        {searchQuery.trim() !== "" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background-subtle border border-border p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success-light text-success flex items-center justify-center shrink-0 border border-success/15">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5px]" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">
                  Total Income
                  <span className="ml-1.5 normal-case text-foreground-muted">
                    · {filteredTotals.incomeCount} {filteredTotals.incomeCount === 1 ? "time" : "times"}
                  </span>
                </span>
                <span className="text-lg font-black tracking-tight text-success">
                  {formatAmount(filteredTotals.income, activeCurrency)}
                </span>
              </div>
            </div>

            <div className="bg-background-subtle border border-border p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-error-light text-error flex items-center justify-center shrink-0 border border-error/15">
                <ArrowDownRight className="w-4 h-4 stroke-[2.5px]" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-foreground-secondary uppercase tracking-wider block">
                  Total Expense
                  <span className="ml-1.5 normal-case text-foreground-muted">
                    · {filteredTotals.expenseCount} {filteredTotals.expenseCount === 1 ? "time" : "times"}
                  </span>
                </span>
                <span className="text-lg font-black tracking-tight text-error">
                  {formatAmount(filteredTotals.expense, activeCurrency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Segment Selector */}
        <div className="flex border-b border-border">
          {(["all", "income", "expense"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 text-sm font-bold border-b-2 capitalize transition-all cursor-pointer ${
                  isActive
                    ? "border-primary text-primary font-extrabold"
                    : "border-transparent text-foreground-muted hover:text-foreground hover:border-border"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </section>

      {/* ────────────────── TRANSACTIONS LIST BY DATE ────────────────── */}
      <section className="space-y-6 flex-grow">
        {filteredTransactions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-foreground-muted text-sm shadow-sm">
            {t('transactions.noMatchingTransactions')}
          </div>
        ) : (
          <>
            {/* Render Category Blocks */}
            {(["today", "yesterday", "previous"] as const).map((blockKey) => {
              const list = grouped[blockKey];
              if (list.length === 0) return null;

              const blockTitle = 
                blockKey === "today" 
                  ? t('common.today') 
                  : blockKey === "yesterday" 
                    ? t('common.yesterday') 
                    : t('common.previousWeeks');

              return (
                <div key={blockKey} className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-icon-muted" />
                    {blockTitle}
                  </h3>
                  
                  {/* Rows Container */}
                  <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
                    {list.map((tx) => {
                      const isEditing = editingId === tx.id;
                      const isDeleting = deleteConfirmId === tx.id;

                      return (
                        <div 
                          key={tx.id} 
                          className={`p-4 transition-all hover:bg-secondary/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                            isEditing ? "bg-primary-lighter/30" : ""
                          }`}
                        >
                          {isEditing ? (
                            /* Inline Editing Block */
                            <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="input-base flex-grow text-sm font-bold"
                                placeholder={t('transactions.editDescription')}
                                required
                              />
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="input-base w-full sm:w-32 text-sm font-bold"
                                placeholder="Amount"
                                min="0.01"
                                step="0.01"
                                required
                              />
                              <div className="flex gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(tx.id)}
                                  className="p-2 rounded-xl bg-success text-success-foreground hover:bg-success-foreground hover:text-success border border-success transition-all cursor-pointer"
                                  title="Save Changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-all cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : isDeleting ? (
                            /* Delete Confirmation Banner */
                            <div className="flex-1 flex items-center justify-between w-full p-2 bg-error-light text-error rounded-xl">
                              <span className="text-xs font-semibold flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4" />
                                {t('transactions.deleteEntry')}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(tx.id)}
                                  className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-error text-error-foreground hover:bg-error-foreground hover:text-error border border-error transition-all cursor-pointer"
                                >
                                  {t('common.confirm')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-card border border-border text-foreground hover:bg-secondary transition-all cursor-pointer"
                                >
                                  {t('common.cancel')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Standard View Row */
                            <>
                              {/* Left Columns (Description, Category) */}
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border ${
                                  tx.type === "income" 
                                    ? "bg-success-light text-success" 
                                    : "bg-error-light text-error"
                                }`}>
                                  {tx.type === "income" ? (
                                    <ArrowUpRight className="w-5 h-5" />
                                  ) : (
                                    <ArrowDownRight className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                  <span className="font-extrabold text-foreground text-sm block truncate">
                                    {tx.description}
                                  </span>
                                  <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider bg-secondary px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-border">
                                    <Tag className="w-2.5 h-2.5 text-icon-muted" />
                                    {tx.category}
                                  </span>
                                </div>
                              </div>

                              {/* Right Columns (Amount, Action Buttons) */}
                              <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-0 pt-3 sm:pt-0 border-border">
                                <div className="flex flex-col items-end">
                                  <span className={`text-base font-black tracking-tight ${
                                    tx.type === "income" ? "text-success" : "text-foreground"
                                  }`}>
                                    {tx.type === "income" ? "+" : "-"}
                                    {formatAmount(tx.amount, activeCurrency)}
                                  </span>
                                  {tx.originalAmount !== undefined && tx.discountAmount !== undefined && (
                                    <span className="text-[10px] font-semibold leading-tight mt-0.5">
                                      <span className="text-foreground-muted line-through">
                                        {formatAmount(tx.originalAmount, activeCurrency)}
                                      </span>
                                      <span className="text-success ml-1.5">
                                        {t('common.saved')} {formatAmount(tx.discountAmount, activeCurrency)}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => startEdit(tx)}
                                    className="p-2 text-icon-default hover:text-icon-active hover:bg-secondary rounded-xl transition-all cursor-pointer"
                                    title="Edit Transaction"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(tx.id)}
                                    className="p-2 text-icon-default hover:text-error hover:bg-error-light rounded-xl transition-all cursor-pointer"
                                    title="Delete Transaction"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
