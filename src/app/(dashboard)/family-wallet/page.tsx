"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Plus, Key, ArrowRight, Wallet, UserPlus, Loader2, AlertCircle, Copy, Check, Trash2 } from "lucide-react";
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { formatAmount } from "@/core/utils/currencyManager";
import { FamilyGroup, useFamilyGroups, getFamilyGroups, setFamilyGroups } from "@/core/store/dataStore";
import { db, auth } from "@/config/firebase";

// Shared, cross-user directory of groups keyed by their join code. Unlike the
// per-user `family_groups` store (which lives under users/{uid}/appData), this
// top-level collection is what lets a code created on one device be found and
// joined from another. Real linking happens here.
const GROUP_DIRECTORY = "familyGroups";

/** The signed-in user's display name, matching how settings/home resolve it. */
function getMyName(): string {
  if (typeof window !== "undefined") {
    try {
      const session = localStorage.getItem("user_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed?.name) return parsed.name as string;
      }
    } catch {
      // Ignore malformed session and fall through to auth/default.
    }
  }
  return auth.currentUser?.displayName || "You";
}

/** Finds a 6-digit code not already taken in the shared directory. */
async function findUnusedGroupCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString();
    const snap = await getDoc(doc(db, GROUP_DIRECTORY, candidate));
    if (!snap.exists()) return candidate;
  }
  // Astronomically unlikely to reach here; accept a final candidate.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function FamilyWalletPage() {
  const groups = useFamilyGroups();
  const [inviteCode, setInviteCode] = useState("");
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  // The group queued for deletion (drives the confirmation overlay).
  const [deleteTarget, setDeleteTarget] = useState<FamilyGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy a group's join code without triggering the card's navigation.
  const handleCopyCode = async (e: React.MouseEvent, code: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — silently ignore.
    }
  };

  // Open the delete confirmation for a card without navigating into the group.
  const handleAskDelete = (e: React.MouseEvent, group: FamilyGroup) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(group);
  };

  // Detach from the shared roster and remove the group + its expenses locally.
  // When the last member leaves, the shared directory doc is deleted too.
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    const target = deleteTarget;
    setIsDeleting(true);
    try {
      const ref = doc(db, GROUP_DIRECTORY, target.code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const myName = getMyName();
        const myUid = auth.currentUser?.uid;
        const names = Array.isArray(data.memberNames) ? (data.memberNames as string[]) : [];
        const uids = Array.isArray(data.memberUids) ? (data.memberUids as string[]) : [];
        const remaining = names.filter((n) => n !== myName);
        const remainingUids = uids.filter((u) => u !== myUid);
        const remainingCount = names.length > 0
          ? remaining.length
          : Math.max(0, (typeof data.members === "number" ? data.members : 1) - 1);

        if (remainingCount <= 0) {
          // Last one out — remove the shared expense history, then the group.
          const expSnap = await getDocs(collection(db, GROUP_DIRECTORY, target.code, "expenses"));
          await Promise.all(expSnap.docs.map((d) => deleteDoc(d.ref)));
          await deleteDoc(ref);
        } else {
          await updateDoc(ref, {
            memberNames: remaining,
            memberUids: remainingUids,
            members: remainingCount,
          });
        }
      }
    } catch {
      // Even if the shared update fails (offline etc.), still remove locally.
    } finally {
      setFamilyGroups(getFamilyGroups().filter((g) => g.id !== target.id));
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) setActiveCurrency(cur);
    }
  }, []);

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.length !== 6 || isJoining) return;

    // Don't join a group already present in this device's list.
    if (groups.some((g) => g.code === inviteCode)) {
      setJoinError("You're already a member of this group.");
      return;
    }

    // Membership is enforced by security rules on the user's real Firebase UID,
    // so we must be signed in before touching the shared group directory.
    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      setJoinError("You must be signed in to join a group.");
      return;
    }

    setIsJoining(true);
    setJoinError("");
    try {
      // Verify the code against the shared directory instead of fabricating one.
      const ref = doc(db, GROUP_DIRECTORY, inviteCode);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setJoinError("No group found with that code. Check it and try again.");
        return;
      }

      const data = snap.data();
      const myName = getMyName();
      // Existing roster from the shared doc, plus this joiner (no duplicates).
      const existingNames = Array.isArray(data.memberNames)
        ? (data.memberNames as string[])
        : [];
      const memberNames = existingNames.includes(myName)
        ? existingNames
        : [...existingNames, myName];

      const newGroup: FamilyGroup = {
        id: Math.random().toString(36).substring(2, 9),
        name: typeof data.name === "string" ? data.name : `Group ${inviteCode}`,
        code: inviteCode,
        members: memberNames.length,
        memberNames,
        totalBalance: typeof data.totalBalance === "number" ? data.totalBalance : 0,
      };

      // Record the new member on the shared group, then add it locally.
      // arrayUnion keeps the roster authoritative and the count in sync.
      // memberUids is the authoritative list the security rules check against.
      await updateDoc(ref, {
        memberNames: arrayUnion(myName),
        memberUids: arrayUnion(myUid),
        members: memberNames.length,
      });
      setFamilyGroups([...groups, newGroup]);

      setInviteCode("");
      setIsJoinOpen(false);
    } catch {
      setJoinError("Couldn't reach the group service. Check your connection and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || isCreating) return;

    // Must be signed in: the creator's UID seeds the members list that the
    // security rules use to gate every later read/write of this group.
    const myUid = auth.currentUser?.uid;
    if (!myUid) {
      setCreateError("You must be signed in to create a group.");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    try {
      // Publish to the shared directory so other devices can join by this code.
      const code = await findUnusedGroupCode();
      const myName = getMyName();
      await setDoc(doc(db, GROUP_DIRECTORY, code), {
        name: newGroupName.trim(),
        code,
        members: 1,
        memberNames: [myName],
        memberUids: [myUid],
        totalBalance: 0,
        createdBy: myUid,
        createdAt: serverTimestamp(),
      });

      const newGroup: FamilyGroup = {
        id: Math.random().toString(36).substring(2, 9),
        name: newGroupName.trim(),
        code,
        members: 1, // Just the creator initially
        memberNames: [myName],
        totalBalance: 0,
      };

      setFamilyGroups([...groups, newGroup]);
      setNewGroupName("");
      setIsCreateOpen(false);
    } catch {
      setCreateError("Couldn't create the group right now. Check your connection and try again.");
    } finally {
      setIsCreating(false);
    }
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
          onClick={() => { setJoinError(""); setInviteCode(""); setIsJoinOpen(true); }}
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
                onChange={(e) => { setInviteCode(e.target.value.replace(/\D/g, '')); if (joinError) setJoinError(""); }}
                className="input-base w-full text-center text-2xl font-extrabold tracking-widest letter-spacing-[0.5em]"
                placeholder="000000"
                required
              />
              {joinError && (
                <div className="flex items-start gap-2 p-3 text-xs font-semibold text-error bg-error-light rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-left leading-relaxed">{joinError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsJoinOpen(false)} className="btn-secondary flex-1" disabled={isJoining}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isJoining || inviteCode.length !== 6}>
                  {isJoining && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isJoining ? "Joining…" : "Join Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Overlay */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-foreground text-center">Create New Group</h3>
            <p className="text-xs text-foreground-muted text-center">
              Enter a name for your new family or shared wallet group.
            </p>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => { setNewGroupName(e.target.value); if (createError) setCreateError(""); }}
                className="input-base w-full text-center text-lg font-bold"
                placeholder="e.g. Smith Family"
                required
              />
              {createError && (
                <div className="flex items-start gap-2 p-3 text-xs font-semibold text-error bg-error-light rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-left leading-relaxed">{createError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn-secondary flex-1" disabled={isCreating}>Cancel</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isCreating || !newGroupName.trim()}>
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Overlay */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground">Delete “{deleteTarget.name}”?</h3>
                <p className="text-xs text-foreground-muted leading-relaxed">
                  You’ll be removed from this shared wallet and its expense history will be
                  cleared from your device. {(deleteTarget.memberNames?.length ?? deleteTarget.members) > 1
                    ? "Other members will keep the group."
                    : "As the last member, the group will be deleted for everyone."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 text-white font-bold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-60 cursor-pointer"
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
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
                <button
                  onClick={(e) => handleCopyCode(e, group.code)}
                  title="Copy group code"
                  className="text-[10px] font-bold text-foreground-muted bg-secondary px-2 py-1 rounded-md flex items-center gap-1.5 hover:bg-border transition-colors cursor-pointer"
                >
                  Code: {group.code}
                  {copiedCode === group.code ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                  {group.name}
                </h3>
                <span className="text-xs font-semibold text-foreground-secondary flex items-center gap-1 mt-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  {group.memberNames?.length ?? group.members} Members
                </span>
                {group.memberNames && group.memberNames.length > 0 && (
                  <p className="text-[11px] font-medium text-foreground-muted mt-1.5 leading-relaxed line-clamp-2">
                    {group.memberNames.join(", ")}
                  </p>
                )}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleAskDelete(e, group)}
                  title="Delete group"
                  aria-label="Delete group"
                  className="w-8 h-8 rounded-full bg-secondary text-icon-muted flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-secondary text-icon-muted flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>
        ))}

        {/* Create New Group Card */}
        <button
          onClick={() => { setCreateError(""); setNewGroupName(""); setIsCreateOpen(true); }}
          className="bg-transparent border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center justify-center text-icon-muted hover:text-primary hover:border-primary hover:bg-primary-lighter/30 transition-all cursor-pointer min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-bold text-sm">Create New Group</span>
        </button>
      </section>
    </div>
  );
}
