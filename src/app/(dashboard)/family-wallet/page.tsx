"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Key, ArrowRight, Wallet, UserPlus } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";

interface FamilyGroup {
  id: string;
  name: string;
  code: string;
  members: number;
  totalBalance: number;
}

const SEED_GROUPS: FamilyGroup[] = [
  { id: "grp-1", name: "Home Expenses", code: "123456", members: 3, totalBalance: 14500 },
  { id: "grp-2", name: "Goa Trip Fund", code: "654321", members: 5, totalBalance: 42000 },
];

export default function FamilyWalletPage() {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) setActiveCurrency(cur);

      const stored = localStorage.getItem("family_groups");
      if (stored) {
        setGroups(JSON.parse(stored));
      } else {
        localStorage.setItem("family_groups", JSON.stringify(SEED_GROUPS));
        setGroups(SEED_GROUPS);
      }
    }
  }, []);

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.length !== 6) return;

    // Simulate joining (in a real app, verify via backend)
    const newGroup: FamilyGroup = {
      id: Math.random().toString(36).substring(2, 9),
      name: `Joined Group ${inviteCode}`,
      code: inviteCode,
      members: Math.floor(Math.random() * 5) + 2,
      totalBalance: Math.floor(Math.random() * 10000),
    };

    const updated = [...groups, newGroup];
    setGroups(updated);
    localStorage.setItem("family_groups", JSON.stringify(updated));

    setInviteCode("");
    setIsJoinOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            Family & Shared Wallets
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            Collaborative accounting and group expense tracking.
          </p>
        </div>

        <button
          onClick={() => setIsJoinOpen(true)}
          className="btn-primary shrink-0 flex items-center justify-center gap-2"
        >
          <Key className="w-4 h-4" />
          Join via Code
        </button>
      </div>

      {/* Join Overlay */}
      {isJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground text-center">Join Shared Space</h3>
            <p className="text-xs text-foreground-muted text-center">
              Enter the 6-digit verification code to access the group ledger.
            </p>
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ''))}
                className="input-base w-full text-center text-2xl font-extrabold tracking-widest letter-spacing-[0.5em]"
                placeholder="000000"
                required
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsJoinOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Join Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group List */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Link
            href={`/family-wallet/${group.id}`}
            key={group.id}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between space-y-6 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-primary-lighter text-primary flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold text-foreground-muted bg-secondary px-2 py-1 rounded-md">
                  Code: {group.code}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                  {group.name}
                </h3>
                <span className="text-xs font-semibold text-foreground-secondary flex items-center gap-1 mt-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  {group.members} Members
                </span>
              </div>
            </div>
            
            <div className="flex items-end justify-between border-t border-border pt-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">
                  Pool Balance
                </span>
                <span className="text-xl font-black tracking-tight text-foreground">
                  {formatAmount(group.totalBalance, activeCurrency)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary text-icon-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        ))}

        {/* Create New Group Card Placeholder */}
        <button className="bg-transparent border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-icon-muted hover:text-primary hover:border-primary hover:bg-primary-lighter/30 transition-all cursor-pointer min-h-[200px]">
          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm">Create New Group</span>
        </button>
      </section>
    </div>
  );
}
