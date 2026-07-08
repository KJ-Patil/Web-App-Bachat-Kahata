"use client";

import React, { useState } from "react";
import {
  X,
  MessageCircle,
  Smartphone,
  Send,
  Loader2,
  Globe,
  CheckCircle,
  User,
  Sliders,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  generateReminderMessage,
  getWhatsAppLink,
  getSmsLink,
  sendTwilioSmsSimulated,
  type ReminderTone,
  type ReminderLang,
  type ReminderRelation,
} from "@/core/utils/reminderService";

interface FlashReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  balance: number;
  relation: ReminderRelation;
  currency?: string;
  onSendSuccess?: () => void;
}

export default function FlashReminderModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  balance,
  relation,
  currency = "INR",
  onSendSuccess,
}: FlashReminderModalProps) {
  const [phone, setPhone] = useState(recipientPhone);
  const [tone, setTone] = useState<ReminderTone>("friendly");
  const [lang, setLang] = useState<ReminderLang>("en");
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "twilio">("whatsapp");
  
  // Lazy initialize custom message draft
  const [customMessage, setCustomMessage] = useState(() =>
    generateReminderMessage(
      recipientName,
      Math.abs(balance),
      relation,
      "en",
      "friendly",
      currency
    )
  );

  // Status states
  const [isSending, setIsSending] = useState(false);
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle user changing language tab
  const handleLangChange = (newLang: ReminderLang) => {
    setLang(newLang);
    setCustomMessage(
      generateReminderMessage(
        recipientName,
        Math.abs(balance),
        relation,
        newLang,
        tone,
        currency
      )
    );
  };

  // Handle user changing tone tab
  const handleToneChange = (newTone: ReminderTone) => {
    setTone(newTone);
    setCustomMessage(
      generateReminderMessage(
        recipientName,
        Math.abs(balance),
        relation,
        lang,
        newTone,
        currency
      )
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    if (channel === "whatsapp") {
      const link = getWhatsAppLink(phone, customMessage);
      window.open(link, "_blank", "noopener,noreferrer");
      
      // Log to system notifications
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("notifications");
        const notifications = stored ? JSON.parse(stored) : [];
        const newNotification = {
          id: `whatsapp-${Date.now()}`,
          text: `[WhatsApp] Opened chat for ${recipientName} (${phone}) to request balance.`,
          type: "success",
          read: false,
          date: new Date().toISOString(),
        };
        localStorage.setItem("notifications", JSON.stringify([newNotification, ...notifications]));
        window.dispatchEvent(new Event("datastore:change"));
      }

      toast.success("WhatsApp dispatch triggered!");
      if (onSendSuccess) onSendSuccess();
      onClose();
    } else if (channel === "sms") {
      const link = getSmsLink(phone, customMessage);
      window.open(link, "_blank", "noopener,noreferrer");

      // Log to system notifications
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("notifications");
        const notifications = stored ? JSON.parse(stored) : [];
        const newNotification = {
          id: `sms-${Date.now()}`,
          text: `[Native SMS] Initiated default SMS to ${recipientName} (${phone}) requesting balance.`,
          type: "success",
          read: false,
          date: new Date().toISOString(),
        };
        localStorage.setItem("notifications", JSON.stringify([newNotification, ...notifications]));
        window.dispatchEvent(new Event("datastore:change"));
      }

      toast.success("Native SMS application triggered!");
      if (onSendSuccess) onSendSuccess();
      onClose();
    } else if (channel === "twilio") {
      setIsSending(true);
      try {
        await sendTwilioSmsSimulated(phone, customMessage, recipientName);
        setIsSentSuccess(true);
        toast.success(`Simulated Twilio SMS sent to ${recipientName}!`);
        
        // Wait 1.2 seconds on success screen, then close
        setTimeout(() => {
          if (onSendSuccess) onSendSuccess();
          onClose();
        }, 1200);
      } catch {
        toast.error("Failed to send simulated SMS.");
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center p-0 md:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full bg-card border-t md:border border-border rounded-t-[2.5rem] md:rounded-3xl max-w-lg shadow-2xl flex flex-col animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[90vh] md:max-h-[680px]"
        role="dialog"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-background-subtle rounded-t-3xl">
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              Flash Reminder Dispatcher
            </h3>
            <p className="text-[11px] font-semibold text-foreground-muted">
              Prepare and send balance alerts to {recipientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-icon-muted hover:text-icon-active p-2 rounded-xl hover:bg-secondary transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-6">
          {isSentSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in zoom-in-95 duration-200">
              <CheckCircle className="w-16 h-16 text-success animate-bounce" />
              <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-foreground">Message Dispatched!</h4>
                <p className="text-xs font-semibold text-foreground-muted">
                  Gateway status: Sent via Twilio Secure SMS API.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Form Input fields */}
              <div className="grid grid-cols-1 gap-4">
                {/* Contact Info Readonly / Editable */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Recipient Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-base w-full font-mono text-sm tracking-wide"
                    placeholder="+919876543210"
                    required
                  />
                  <p className="text-[9px] text-foreground-muted">
                    Must start with country code (e.g., +91 for India, +1 for US).
                  </p>
                </div>

                {/* Select Lang and Tone tabs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Language */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      Language
                    </label>
                    <div className="flex bg-secondary p-1 rounded-xl border border-border">
                      {(["en", "hi", "mr"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => handleLangChange(l)}
                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                            lang === l
                              ? "bg-card text-foreground shadow-sm font-black"
                              : "text-foreground-muted hover:text-foreground"
                          }`}
                        >
                          {l === "en" ? "EN" : l === "hi" ? "हिंदी" : "मराठी"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Alert Tone
                    </label>
                    <div className="flex bg-secondary p-1 rounded-xl border border-border">
                      {(["friendly", "formal", "urgent"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleToneChange(t)}
                          className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-all capitalize cursor-pointer ${
                            tone === t
                              ? t === "urgent"
                                ? "bg-error text-error-foreground shadow-sm font-black"
                                : "bg-card text-foreground shadow-sm font-black"
                              : "text-foreground-muted hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Message Body Draft Editor */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                    Draft Message Body
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="input-base w-full h-24 text-xs resize-none leading-relaxed py-2.5 px-3"
                    placeholder="Enter custom message body..."
                    required
                  />
                </div>

                {/* Channel Selectors */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                    Dispatch Channel
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => setChannel("whatsapp")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center space-y-1.5 ${
                        channel === "whatsapp"
                          ? "bg-success-light/20 border-success text-success"
                          : "bg-secondary/40 border-border hover:bg-secondary text-foreground-secondary hover:border-icon-muted"
                      }`}
                    >
                      <MessageCircle className="w-5 h-5 stroke-[2.5px]" />
                      <span className="text-[10px] font-black uppercase tracking-wider">WhatsApp</span>
                    </button>

                    {/* Native SMS */}
                    <button
                      type="button"
                      onClick={() => setChannel("sms")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center space-y-1.5 ${
                        channel === "sms"
                          ? "bg-primary-lighter border-primary text-primary"
                          : "bg-secondary/40 border-border hover:bg-secondary text-foreground-secondary hover:border-icon-muted"
                      }`}
                    >
                      <Smartphone className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-wider">SMS Native</span>
                    </button>

                    {/* Twilio SMS */}
                    <button
                      type="button"
                      onClick={() => setChannel("twilio")}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer text-center space-y-1.5 ${
                        channel === "twilio"
                          ? "bg-brand/10 border-brand text-brand"
                          : "bg-secondary/40 border-border hover:bg-secondary text-foreground-secondary hover:border-icon-muted"
                      }`}
                    >
                      <Send className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Twilio SMS</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] select-none ${
                    channel === "whatsapp"
                      ? "bg-success text-success-foreground hover:brightness-110"
                      : channel === "sms"
                      ? "bg-primary text-primary-foreground hover:brightness-110"
                      : "bg-brand text-white hover:brightness-110"
                  } ${isSending ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Dispatched Sim Request...
                    </>
                  ) : channel === "whatsapp" ? (
                    <>
                      <MessageCircle className="w-4 h-4 stroke-[2.5px]" />
                      Launch WhatsApp Chat
                    </>
                  ) : channel === "sms" ? (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Open Device SMS App
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Dispatch Simulated Twilio SMS
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
