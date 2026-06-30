"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { User, Lock, Globe, Languages, Fingerprint, Trash2, ArrowRight, ShieldAlert, LogOut, CheckCircle2, Layers, Mail } from "lucide-react";
import CurrencyPickerSheet from "@/components/modals/CurrencyPickerSheet";
import LanguagePickerSheet from "@/components/modals/LanguagePickerSheet";
import { clearFinancialData } from "@/core/store/dataStore";
import { getLanguage } from "@/core/utils/languages";
import { useTranslation } from "@/i18n/i18nContext";

export default function SettingsPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [isLanguageSheetOpen, setIsLanguageSheetOpen] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  // Stages: 0 = confirm, 1 = final confirm, 2 = done, 3 = email verification
  const [clearStage, setClearStage] = useState<0 | 1 | 2 | 3>(0);

  // Real user profile, loaded from the signup session
  const [userName, setUserName] = useState("Guest");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Email verification (demo only — no real email is sent)
  const [emailVerifyEnabled, setEmailVerifyEnabled] = useState(false);
  const [sentCode, setSentCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const { t } = useTranslation();

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

      const bio = localStorage.getItem("biometrics_enabled");
      if (bio === "true") setBiometricsEnabled(true);

      // Load the real signed-in profile from the session
      const session = localStorage.getItem("user_session");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.avatarUrl) setUserAvatar(parsed.avatarUrl);
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

  const toggleBiometrics = () => {
    const newState = !biometricsEnabled;
    setBiometricsEnabled(newState);
    localStorage.setItem("biometrics_enabled", String(newState));
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
        // Demo: generate a 6-digit code and "send" it (shown on screen, no real email)
        const code = String(Math.floor(100000 + Math.random() * 900000));
        setSentCode(code);
        setEnteredCode("");
        setCodeError("");
        setClearStage(3);
      } else {
        setClearStage(1);
      }
    } else if (clearStage === 1) {
      purgeData();
    }
  };

  // Verify the entered code, then purge (demo only)
  const handleVerifyCode = () => {
    if (enteredCode.trim() === sentCode) {
      setCodeError("");
      purgeData();
    } else {
      setCodeError("Incorrect code. Please try again.");
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
        <div className="w-20 h-20 rounded-full bg-primary-lighter text-primary flex items-center justify-center border-4 border-background shadow-inner shrink-0 overflow-hidden">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10" />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <h2 className="text-xl font-black text-foreground">{userName}</h2>
          <p className="text-sm font-semibold text-foreground-secondary">{userEmail || t('settings.noEmailOnFile')}</p>
          <span className="inline-block mt-2 text-[10px] font-bold text-success uppercase tracking-widest bg-success-light px-2 py-0.5 rounded-md">
            {t('settings.localAccount')}
          </span>
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <button className="btn-secondary text-xs flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" />
            {t('settings.resetPin')}
          </button>
        </div>
      </section>

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

          </div>
        </section>

        {/* Security & Access */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-widest pl-2">
            {t('settings.accessControls')}
          </h3>
          <div className="bg-card border border-border-strong rounded-2xl overflow-hidden shadow-sm">
            
            <div className="w-full flex items-center justify-between p-4 border-b border-border text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-icon-default">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-foreground block">{t('settings.biometricLogin')}</span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">{t('settings.webAuthnSupport')}</span>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <button 
                onClick={toggleBiometrics}
                className={`w-12 h-6 rounded-full relative transition-colors ${biometricsEnabled ? 'bg-primary' : 'bg-border'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${biometricsEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

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
                  <Mail className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">{t('settings.verifyItsYou')}</h3>
                  <p className="text-xs font-semibold text-foreground-muted">
                    We sent a 6-digit code to{" "}
                  <span className="font-bold text-foreground">{maskEmail(userEmail)}</span>. {t('settings.enterCodeToDelete')}
                  </p>
                </div>

                {/* Demo hint — shows the code on screen since no real email is sent */}
                <div className="text-[11px] font-bold text-foreground-muted bg-secondary rounded-lg py-2 px-3">
                  {t('settings.demoCode')}: <span className="font-black tracking-widest text-foreground">{sentCode}</span>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value.replace(/\D/g, ""));
                    setCodeError("");
                  }}
                  placeholder="••••••"
                  className="input-base w-full text-center text-2xl font-black tracking-[0.5em]"
                />

                {codeError && (
                  <p className="text-xs font-bold text-error">{codeError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setIsClearModalOpen(false)} className="btn-secondary flex-1">
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleVerifyCode}
                    disabled={enteredCode.length !== 6}
                    className="bg-destructive text-destructive-foreground font-black px-4 rounded-xl flex-1 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('settings.verifyAndDelete')}
                  </button>
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
    </div>
  );
}
