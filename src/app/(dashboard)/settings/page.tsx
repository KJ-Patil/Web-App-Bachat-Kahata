"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Lock, Globe, Languages, Trash2, ArrowRight, ShieldAlert, LogOut, CheckCircle2, Layers, Info, HelpCircle, Database, CloudUpload, Clock, RotateCcw, RefreshCw, MessageSquare, Pencil } from "lucide-react";
import { toast } from "sonner";
import CurrencyPickerSheet from "@/components/modals/CurrencyPickerSheet";
import LanguagePickerSheet from "@/components/modals/LanguagePickerSheet";
import EditProfileModal from "@/components/modals/EditProfileModal";
import ProfilePhotoViewerModal from "@/components/modals/ProfilePhotoViewerModal";
import { auth } from "@/config/firebase";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  clearFinancialData,
  createCloudBackup,
  listCloudBackups,
  deleteCloudBackup,
  restoreCloudBackup,
  getCurrentUid,
  BackupRecord
} from "@/core/store/dataStore";
import { saveUserProfile } from "@/core/store/userProfile";
import { sanitizeAvatarUrl, sanitizeDisplayName } from "@/core/utils/avatar";
import { getLanguage } from "@/core/utils/languages";
import { useTranslation } from "@/i18n/i18nContext";

export default function SettingsPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  // Stages: 0 = confirm, 1 = final confirm, 2 = done, 3 = email verification
  const [clearStage, setClearStage] = useState<0 | 1 | 2 | 3>(0);

  // Real user profile, loaded from the signup session
  const [userName, setUserName] = useState("Guest");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  // Identity re-verification for the destructive wipe — real Firebase
  // re-authentication (no fake on-screen code, no email backend needed).
  const [emailVerifyEnabled, setEmailVerifyEnabled] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthMethod, setReauthMethod] = useState<"password" | "google" | "unsupported">("password");
  const [reauthLoading, setReauthLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);

  const { t } = useTranslation();

  // Backup & Recovery state
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupActionLoading, setBackupActionLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  const [backupModalType, setBackupModalType] = useState<"restore" | "delete" | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const uid = getCurrentUid();

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const list = await listCloudBackups();
      setBackups(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    if (uid) {
      loadBackups();
    }
  }, [uid]);

  // Track the Firebase user so we know which re-auth method to offer.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setFbUser(u));
    return () => unsub();
  }, []);

  const handleCreateBackup = async () => {
    setBackupActionLoading(true);
    setActionMessage(null);
    try {
      await createCloudBackup();
      await loadBackups();
      setActionMessage({ text: t("settings.backupSuccess"), type: "success" });
    } catch (err) {
      console.error(err);
      setActionMessage({ text: t("settings.backupFailed"), type: "error" });
    } finally {
      setBackupActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    setBackupActionLoading(true);
    setActionMessage(null);
    setBackupModalType(null);
    try {
      await restoreCloudBackup(selectedBackup.id);
      setActionMessage({ text: t("settings.restoreSuccess"), type: "success" });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      setActionMessage({ text: "Failed to restore backup.", type: "error" });
      setBackupActionLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return;
    setBackupActionLoading(true);
    setActionMessage(null);
    setBackupModalType(null);
    try {
      await deleteCloudBackup(selectedBackup.id);
      await loadBackups();
      setActionMessage({ text: t("settings.deleteBackupSuccess"), type: "success" });
    } catch (err) {
      console.error(err);
      setActionMessage({ text: "Failed to delete backup.", type: "error" });
    } finally {
      setBackupActionLoading(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const formatBackupDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString(activeLanguage === "hi" ? "hi-IN" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  // Mask the email like r****a@example.com for display
  const maskEmail = (email: string) => {
    const [name, domain] = email.split("@");
    if (!domain || name.length < 2) return email;
    return `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}@${domain}`;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) setActiveCurrency(cur);

      const lang = localStorage.getItem("active_language");
      if (lang) setActiveLanguage(lang);

      // Load the real signed-in profile from the session
      const session = localStorage.getItem("user_session");
      if (session) {
        try {
          // The session is written by this device but is still parsed as
          // untrusted input — it lives in localStorage, which anything running
          // on the page can edit, and the avatar ends up in an <img src>.
          const parsed = JSON.parse(session);
          const name = sanitizeDisplayName(parsed.name);
          if (name) setUserName(name);
          if (typeof parsed.email === "string") setUserEmail(parsed.email);
          setUserAvatar(sanitizeAvatarUrl(parsed.avatarUrl));
        } catch {
          // Ignore malformed session
        }
      }
    }
  }, []);

  const handleCurrencySelect = (code: string) => {
    setActiveCurrency(code);
    setIsCurrencySheetOpen(false);
  };

  const handleLanguageSelect = (code: string) => {
    setActiveLanguage(code);
    setIsLanguageSheetOpen(false);
  };

  // Reset the local app PIN: open the lock screen in "change" mode, which asks
  // for the current PIN before letting the user set a new one (Old → New →
  // Confirm). If no PIN exists yet, the lock screen falls back to first-time
  // setup. The PIN is device-local (localStorage), so this never touches
  // Firebase or the user's cloud data.
  const resetPin = () => {
    window.location.href = "/pin-lock?action=change";
  };

  /**
   * Write the profile to all three places it needs to live:
   *
   *  1. React state — instant feedback.
   *  2. `user_session` in localStorage — the fast local cache every screen reads.
   *  3. The user's Firestore document — the only durable copy. Signing out wipes
   *     localStorage on purpose (shared devices), so without step 3 the name and
   *     photo would be gone at the next login.
   *
   * The name is mirrored to Firebase Auth too so it follows the account into
   * anything that reads `displayName`; the photo is not, because Auth's
   * `photoURL` cannot hold a data URL.
   */
  const persistProfile = async (name: string, avatar: string | null) => {
    const safeName = sanitizeDisplayName(name);
    const safeAvatar = sanitizeAvatarUrl(avatar);

    setUserName(safeName);
    setUserAvatar(safeAvatar);

    try {
      const session = localStorage.getItem("user_session");
      const parsed = session ? JSON.parse(session) : {};
      localStorage.setItem(
        "user_session",
        JSON.stringify({ ...parsed, name: safeName, avatarUrl: safeAvatar })
      );
    } catch {
      // A malformed session shouldn't block the in-memory update above.
    }

    const user = auth.currentUser ?? fbUser;
    if (user) {
      // Best-effort: a failed Auth sync must not lose the edit.
      void updateProfile(user, { displayName: safeName }).catch(() => {});
    }

    return saveUserProfile({ name: safeName, avatarUrl: safeAvatar });
  };

  const handleSaveProfile = async (name: string, avatar: string | null) => {
    const synced = await persistProfile(name, avatar);
    if (synced) {
      toast.success("Profile updated.");
    } else {
      // Be honest: the change is live on this device but won't survive a logout
      // until it reaches the cloud.
      toast.warning("Profile saved on this device — could not sync to your account.");
    }
  };

  // Clear just the photo, keeping the name. Stored as an explicit null so the
  // provider's photo isn't re-seeded at the next login.
  const handleRemovePhoto = async () => {
    const synced = await persistProfile(userName, null);
    if (synced) {
      toast.success("Profile photo removed.");
    } else {
      toast.warning("Photo removed on this device — could not sync to your account.");
    }
  };

  // Actually wipe the data and show the success stage
  const purgeData = () => {
    clearFinancialData(); // Push empty state to Firestore to clear remote data
    localStorage.clear();
    // Keep currency preference just in case, or truly purge everything.
    localStorage.setItem("active_currency", "INR");
    setClearStage(2);

    // Reload after showing success
    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  };

  const handleClearData = () => {
    if (clearStage === 0) {
      if (emailVerifyEnabled) {
        // Pick the real re-auth method from the signed-in user's provider.
        const user = auth.currentUser ?? fbUser;
        const providers = user?.providerData.map((p) => p.providerId) ?? [];
        setReauthMethod(
          providers.includes("password")
            ? "password"
            : providers.includes("google.com")
              ? "google"
              : "unsupported"
        );
        setReauthPassword("");
        setCodeError("");
        setClearStage(3);
      } else {
        setClearStage(1);
      }
    } else if (clearStage === 1) {
      purgeData();
    }
  };

  // Re-authenticate the user against Firebase, then purge. This genuinely
  // proves the account owner is present (no fake code, no email backend).
  const handleReauthAndPurge = async () => {
    const user = auth.currentUser ?? fbUser;
    if (!user) {
      setCodeError("You must be signed in to verify your identity.");
      return;
    }

    setReauthLoading(true);
    setCodeError("");
    try {
      if (reauthMethod === "google") {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else {
        if (!user.email) {
          setCodeError("No email on this account to verify against.");
          setReauthLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email, reauthPassword);
        await reauthenticateWithCredential(user, credential);
      }
      purgeData();
    } catch {
      setCodeError("Verification failed. Please check your credentials and try again.");
      setReauthLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 md:p-8 max-w-4xl mx-auto w-full">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
          {t('settings.systemConfiguration')}
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          {t('settings.managePreferences')}
        </p>
      </div>

      {/* User Profile Module */}
      <section className="bg-card border border-border-strong rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <button
          type="button"
          onClick={() => (userAvatar ? setIsPhotoViewerOpen(true) : setIsEditProfileOpen(true))}
          className="group relative w-20 h-20 rounded-full bg-primary-lighter text-primary flex items-center justify-center border-4 border-background shadow-inner shrink-0 overflow-hidden cursor-pointer"
          title={userAvatar ? "View profile photo" : "Add profile photo"}
        >
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={userName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10" />
          )}
          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Pencil className="w-5 h-5 text-white" />
          </span>
        </button>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-xl font-black text-foreground">{userName}</h2>
          <p className="text-sm font-semibold text-foreground-secondary">{userEmail || t('settings.noEmailOnFile')}</p>
          <span className="inline-block mt-2 text-[10px] font-bold text-success uppercase tracking-widest bg-success-light px-2 py-0.5 rounded-md">
            {t('settings.localAccount')}
          </span>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <button onClick={() => setIsEditProfileOpen(true)} className="btn-secondary text-xs flex items-center justify-center gap-2">
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
          {userAvatar && (
            <button onClick={handleRemovePhoto} className="btn-secondary text-xs flex items-center justify-center gap-2 text-error">
              <Trash2 className="w-4 h-4" />
              Remove Photo
            </button>
          )}
          <button onClick={resetPin} className="btn-secondary text-xs flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            {t('settings.resetPin')}
          </button>
        </div>
      </section>

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        initialName={userName}
        initialAvatar={userAvatar}
        onSave={handleSaveProfile}
      />

      {userAvatar && (
        <ProfilePhotoViewerModal
          isOpen={isPhotoViewerOpen}
          onClose={() => setIsPhotoViewerOpen(false)}
          avatar={userAvatar}
          name={userName}
          onDelete={handleRemovePhoto}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Preference Matrices */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2">
            {t('settings.localPreferences')}
          </h3>
          <div className="bg-card border border-border-strong rounded-2xl overflow-hidden shadow-sm">
            
            <button 
              onClick={() => setIsCurrencySheetOpen(true)}
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('settings.globalCurrency')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.usedForLedger')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-primary">{activeCurrency}</span>
                <ArrowRight className="w-4 h-4 text-icon-muted" />
              </div>
            </button>

            <button
              onClick={() => setIsLanguageSheetOpen(true)}
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('settings.language')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.appDisplayLanguage')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-primary">{getLanguage(activeLanguage).nativeName}</span>
                <ArrowRight className="w-4 h-4 text-icon-muted" />
              </div>
            </button>

            <Link
              href="/settings/categories"
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('settings.categoryManager')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.addArchiveTags')}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-icon-muted" />
            </Link>

            <Link
              href="/settings/sms-gateway"
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">SMS Gateway</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">Fast2SMS credentials for reminders</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-icon-muted" />
            </Link>

            <Link
              href="/settings/about"
              className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('settings.aboutUs')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.aboutDescription')}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-icon-muted" />
            </Link>

            <Link
              href="/help"
              className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('nav.helpSupport')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.helpDescription')}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-icon-muted" />
            </Link>

          </div>
        </section>

        {/* Security & Access */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2">
            {t('settings.accessControls')}
          </h3>
          <div className="bg-card border border-border-strong rounded-2xl overflow-hidden shadow-sm">
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors text-left group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default group-hover:text-error transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block group-hover:text-error transition-colors">{t('settings.signOutEverywhere')}</span>
                </div>
              </div>
            </button>

          </div>
        </section>
      </div>

      {/* Backup & Recovery */}
      <section className="bg-card border border-border-strong rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-lighter text-primary flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-foreground text-lg">
                {t('settings.backupAndRecovery')}
              </h3>
              <p className="text-xs font-semibold text-foreground-muted">
                {t('settings.backupDescription')}
              </p>
            </div>
          </div>

          {uid && (
            <button
              onClick={handleCreateBackup}
              disabled={backupActionLoading || loadingBackups}
              className="btn-primary text-xs flex items-center justify-center gap-2 w-full sm:w-auto self-start sm:self-center disabled:opacity-50"
            >
              {backupActionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('settings.creatingBackup')}
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  {t('settings.backupNow')}
                </>
              )}
            </button>
          )}
        </div>

        {actionMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 ${
              actionMessage.type === "success"
                ? "bg-success-light/30 border-success/20 text-success"
                : "bg-error-light/30 border-error/20 text-error"
            }`}
          >
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            {actionMessage.text}
          </div>
        )}

        {!uid ? (
          <div className="bg-secondary/40 border border-border-strong rounded-xl p-4 text-center">
            <ShieldAlert className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground">Cloud Backups Disabled</p>
            <p className="text-[11px] font-semibold text-foreground-muted mt-1 max-w-md mx-auto">
              Please sign in to a cloud account to enable automated and manual ledger backups to Firebase.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-1">
              Cloud Backups List
            </h4>
            
            {loadingBackups ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-secondary/50 rounded-xl animate-pulse w-full" />
                <div className="h-10 bg-secondary/50 rounded-xl animate-pulse w-full" />
              </div>
            ) : backups.length === 0 ? (
              <p className="text-xs font-semibold text-foreground-muted text-center py-6 bg-secondary/20 rounded-xl">
                {t('settings.noBackups')}
              </p>
            ) : (
              <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-background-subtle">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3.5 hover:bg-secondary/35 transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-foreground-muted shrink-0" />
                      <div>
                        <span className="font-bold text-sm text-foreground block">
                          {formatBackupDate(backup.createdAt)}
                        </span>
                        <span className="text-[10px] font-semibold text-foreground-muted block">
                          {backup.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setBackupModalType("restore");
                        }}
                        disabled={backupActionLoading}
                        className="text-xs font-black text-primary hover:text-primary-hover transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t('settings.restore')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setBackupModalType("delete");
                        }}
                        disabled={backupActionLoading}
                        className="text-xs font-black text-error hover:text-error/80 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('common.delete') || "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Core Data Purging Actions */}
      <section className="bg-error-light border border-error/20 rounded-2xl p-6 mt-4 flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-error font-extrabold flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              {t('settings.dangerZone')}
            </h3>
            <p className="text-xs font-semibold text-error/80 max-w-sm">
              {t('settings.dangerDescription')}
            </p>
          </div>
          <button
            onClick={() => {
              setClearStage(0);
              setIsClearModalOpen(true);
            }}
            className="bg-destructive text-destructive-foreground font-black px-6 py-3 rounded-xl hover:opacity-90 transition-opacity w-full sm:w-auto shrink-0"
          >
            {t('settings.clearAllData')}
          </button>
        </div>

        {/* Email verification opt-in */}
        <label className="flex items-start gap-3 cursor-pointer border-t border-error/15 pt-4">
          <input
            type="checkbox"
            checked={emailVerifyEnabled}
            onChange={(e) => setEmailVerifyEnabled(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-error cursor-pointer shrink-0"
          />
          <span className="text-xs font-semibold text-error/80">
            {t('settings.requireEmailVerification', { email: maskEmail(userEmail) })}
          </span>
        </label>
      </section>

      <CurrencyPickerSheet
        isOpen={isCurrencySheetOpen}
        onClose={() => setIsCurrencySheetOpen(false)}
        activeCurrencyCode={activeCurrency}
        onSelect={handleCurrencySelect}
      />

      <LanguagePickerSheet
        isOpen={isLanguageSheetOpen}
        onClose={() => setIsLanguageSheetOpen(false)}
        activeLanguageCode={activeLanguage}
        onSelect={handleLanguageSelect}
      />

      {/* Clear Data Multi-stage Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-6 text-center animate-in zoom-in-95 duration-300">
            
            {clearStage === 0 && (
              <>
                <div className="w-16 h-16 rounded-full bg-error-light text-error flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">{t('settings.areYouSure')}</h3>
                  <p className="text-xs font-semibold text-foreground-muted">
                    {t('settings.wipeWarning')}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsClearModalOpen(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                  <button onClick={handleClearData} className="bg-destructive text-destructive-foreground font-bold px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity">
                    {t('settings.yesWipeIt')}
                  </button>
                </div>
              </>
            )}

            {clearStage === 1 && (
              <>
                <div className="w-16 h-16 rounded-full bg-error text-white flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-error">{t('settings.finalConfirmation')}</h3>
                  <p className="text-xs font-bold text-foreground-muted">
                    {t('settings.deleteNowWarning')}
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsClearModalOpen(false)} className="btn-secondary flex-1">{t('settings.abort')}</button>
                  <button onClick={handleClearData} className="bg-destructive text-destructive-foreground font-black px-4 rounded-xl flex-1 shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                    {t('settings.deleteNow')}
                  </button>
                </div>
              </>
            )}

            {clearStage === 3 && (
              <>
                <div className="w-16 h-16 rounded-full bg-error-light text-error flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">{t('settings.verifyItsYou')}</h3>
                  <p className="text-xs font-semibold text-foreground-muted">
                    {reauthMethod === "google" ? (
                      <>Confirm your identity with Google to permanently delete everything.</>
                    ) : reauthMethod === "unsupported" ? (
                      <>Re-authentication isn&apos;t available for your sign-in method. Continue to the final confirmation.</>
                    ) : (
                      <>
                        Re-enter the password for{" "}
                        <span className="font-bold text-foreground">{maskEmail(userEmail)}</span> to permanently delete everything.
                      </>
                    )}
                  </p>
                </div>

                {reauthMethod === "password" && (
                  <input
                    type="password"
                    value={reauthPassword}
                    onChange={(e) => {
                      setReauthPassword(e.target.value);
                      setCodeError("");
                    }}
                    placeholder="Your password"
                    autoFocus
                    className="input-base w-full text-center font-bold"
                  />
                )}

                {codeError && (
                  <p className="text-xs font-bold text-error">{codeError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setIsClearModalOpen(false)}
                    disabled={reauthLoading}
                    className="btn-secondary flex-1"
                  >
                    {t('common.cancel')}
                  </button>
                  {reauthMethod === "unsupported" ? (
                    <button
                      onClick={() => setClearStage(1)}
                      className="bg-destructive text-destructive-foreground font-black px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={handleReauthAndPurge}
                      disabled={reauthLoading || (reauthMethod === "password" && !reauthPassword)}
                      className="bg-destructive text-destructive-foreground font-black px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {reauthLoading
                        ? "Verifying…"
                        : reauthMethod === "google"
                          ? "Confirm with Google"
                          : t('settings.verifyAndDelete')}
                    </button>
                  )}
                </div>
              </>
            )}

            {clearStage === 2 && (
              <div className="py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-foreground">{t('settings.wipeComplete')}</h3>
                <p className="text-xs font-bold text-foreground-muted">
                  {t('settings.restartingApp')}
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Backup Action Confirmation Modals */}
      {backupModalType && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full bg-card border border-border rounded-2xl max-w-sm shadow-2xl p-6 space-y-6 text-center animate-in zoom-in-95 duration-300">
            {backupModalType === "restore" && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary-lighter text-primary flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">{t('settings.confirmRestore')}</h3>
                  <p className="text-xs font-semibold text-foreground-muted">
                    {t('settings.restoreWarning')}
                  </p>
                  <p className="text-[11px] font-extrabold text-primary bg-primary-lighter/40 py-2 rounded-lg">
                    Target: {formatBackupDate(selectedBackup.createdAt)} ({selectedBackup.label})
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setBackupModalType(null); setSelectedBackup(null); }} className="btn-secondary flex-1">
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleRestoreBackup} className="bg-primary text-white font-bold px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity">
                    {t('settings.restore')}
                  </button>
                </div>
              </>
            )}

            {backupModalType === "delete" && (
              <>
                <div className="w-16 h-16 rounded-full bg-error-light text-error flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-error">{t('settings.deleteBackup') || "Delete Backup"}</h3>
                  <p className="text-xs font-semibold text-foreground-muted">
                    {t('settings.deleteBackupWarning') || "This will permanently delete this backup snapshot. This cannot be undone. Are you sure?"}
                  </p>
                  <p className="text-[11px] font-extrabold text-error bg-error-light/40 py-2 rounded-lg">
                    Target: {formatBackupDate(selectedBackup.createdAt)} ({selectedBackup.label})
                  </p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setBackupModalType(null); setSelectedBackup(null); }} className="btn-secondary flex-1">
                    {t('common.cancel')}
                  </button>
                  <button onClick={handleDeleteBackup} className="bg-destructive text-destructive-foreground font-bold px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity">
                    {t('common.delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
