"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Fingerprint, Delete, ShieldCheck, AlertCircle } from "lucide-react";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export default function PinLockPage() {
  const router = useRouter();
  
  const [pin, setPin] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [tempPin, setTempPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState(false);
  const [isCheckingWebAuthn, setIsCheckingWebAuthn] = useState(false);

  useEffect(() => {
    // Check if user has already set up a PIN
    const storedHash = localStorage.getItem("pin_hash");
    if (!storedHash) {
      setIsSetup(true); // PIN setup mode
    }

    // Check for WebAuthn capability
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
          .then((available) => {
            setIsWebAuthnAvailable(available);
          })
          .catch(() => {
            setIsWebAuthnAvailable(false);
          });
      }
    }
  }, []);

  const handleKeyPress = (num: string) => {
    setError("");
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      
      // Auto-submit when length reaches 4
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handlePinSubmit = async (enteredPin: string) => {
    setError("");
    const enteredHash = await sha256(enteredPin);

    if (isSetup) {
      // Setup Mode
      if (setupStep === "enter") {
        setTempPin(enteredPin);
        setSetupStep("confirm");
        setPin("");
      } else {
        // Confirm Step
        if (enteredPin === tempPin) {
          localStorage.setItem("pin_hash", enteredHash);
          setSuccess("PIN setup successfully!");
          setIsSetup(false);
          setPin("");
          setTimeout(() => {
            router.push("/home");
          }, 1000);
        } else {
          setError("PINs do not match. Please restart setup.");
          setSetupStep("enter");
          setTempPin("");
          setPin("");
        }
      }
    } else {
      // Verify Mode
      const storedHash = localStorage.getItem("pin_hash");
      if (enteredHash === storedHash) {
        setSuccess("Access Granted.");
        setTimeout(() => {
          router.push("/home");
        }, 800);
      } else {
        setError("Invalid PIN. Please try again.");
        // Clear input with shake effect trigger
        setPin("");
      }
    }
  };

  const handleWebAuthnBiometrics = async () => {
    if (!isWebAuthnAvailable) {
      setError("Biometrics not available or not configured on this device.");
      return;
    }

    setIsCheckingWebAuthn(true);
    setError("");
    
    // Simulate/mock browser-native WebAuthn assertion (TouchID/FaceID)
    setTimeout(() => {
      setIsCheckingWebAuthn(false);
      // Let's check if there is a pin hash in storage. If so, biometric matches it.
      const storedHash = localStorage.getItem("pin_hash");
      if (storedHash) {
        setSuccess("Biometrics verified. Access Granted.");
        setTimeout(() => {
          router.push("/home");
        }, 800);
      } else {
        setError("Please set up a secure PIN first before using biometrics.");
      }
    }, 1200);
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
        
        {/* Status Graphic & Title */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border shadow-sm text-primary transition-all duration-300 ${success ? "bg-success-light text-success border-success" : ""}`}>
              {success ? (
                <ShieldCheck className="w-8 h-8 animate-pulse" />
              ) : isSetup ? (
                <Lock className="w-8 h-8" />
              ) : (
                <Lock className="w-8 h-8 text-foreground-secondary" />
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {isSetup 
                ? (setupStep === "enter" ? "Set Security PIN" : "Confirm Security PIN")
                : "Enter Security PIN"
              }
            </h1>
            <p className="text-sm font-medium text-foreground-muted mt-1">
              {isSetup 
                ? "Establish a 4-digit security code." 
                : "Confirm identity to unlock data visibility."
              }
            </p>
          </div>
        </div>

        {/* Dynamic Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-error-light text-error font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-success-light text-success font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Pin Code Indicators */}
        <div className="flex gap-4 justify-center py-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 border-border transition-all duration-150 ${
                pin.length > index 
                  ? "bg-primary border-primary scale-110 shadow-sm" 
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* 3x4 Number Keypad Grid */}
        <div className="w-full max-w-[280px] grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="flex items-center justify-center aspect-square rounded-2xl bg-card border border-border text-xl font-bold text-foreground hover:bg-accent hover:border-accent-foreground active:scale-95 transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* WebAuthn Fingerprint Icon (Bottom Left of Keypad) */}
          <button
            type="button"
            onClick={handleWebAuthnBiometrics}
            className={`flex items-center justify-center aspect-square rounded-2xl border text-xl font-bold transition-all cursor-pointer active:scale-95 ${
              isCheckingWebAuthn 
                ? "bg-primary-lighter text-primary border-primary" 
                : isWebAuthnAvailable 
                  ? "bg-card border-border text-primary hover:bg-accent hover:border-accent-foreground" 
                  : "bg-muted border-border text-icon-muted cursor-not-allowed opacity-50"
            }`}
            disabled={isCheckingWebAuthn}
            title={isWebAuthnAvailable ? "Unlock with Biometrics" : "Biometrics not available"}
          >
            {isCheckingWebAuthn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            ) : (
              <Fingerprint className="w-6 h-6" />
            )}
          </button>

          {/* Zero (Bottom Middle of Keypad) */}
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="flex items-center justify-center aspect-square rounded-2xl bg-card border border-border text-xl font-bold text-foreground hover:bg-accent hover:border-accent-foreground active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>

          {/* Backspace Delete (Bottom Right of Keypad) */}
          <button
            type="button"
            onClick={handleBackspace}
            className="flex items-center justify-center aspect-square rounded-2xl bg-card border border-border text-xl font-bold text-foreground-secondary hover:bg-accent hover:border-accent-foreground active:scale-95 transition-all cursor-pointer"
            title="Delete last digit"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Secondary Navigation Options */}
        {!isSetup && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("user_session");
              router.push("/login");
            }}
            className="text-xs font-bold uppercase tracking-wider text-foreground-muted hover:text-primary transition-colors cursor-pointer"
          >
            Switch Account
          </button>
        )}
      </div>
    </main>
  );
}
