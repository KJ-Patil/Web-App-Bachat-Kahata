"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, CheckCircle2 } from "lucide-react";
import { auth } from "@/config/firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Sign in against Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);

      localStorage.setItem(
        "user_session",
        JSON.stringify({ email, name: email.split("@")[0] })
      );

      const pinHash = localStorage.getItem("pin_hash");
      if (pinHash) {
        router.push("/pin-lock");
      } else {
        router.push("/home");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Open the Google sign-in popup via Firebase Authentication
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      localStorage.setItem(
        "user_session",
        JSON.stringify({
          email: user.email,
          name: user.displayName || "Google User",
        })
      );

      const pinHash = localStorage.getItem("pin_hash");
      if (pinHash) {
        router.push("/pin-lock");
      } else {
        router.push("/home");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-12 bg-background-subtle">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome Back
          </h2>
          <p className="text-sm font-medium text-foreground-muted">
            Access your secure personal ledger.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-6">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-error-light text-error font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-icon-muted">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base pl-10 w-full"
                  placeholder="name@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-icon-muted">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pl-10 pr-10 w-full"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-icon-muted hover:text-icon-active"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-foreground-muted uppercase tracking-wider bg-card">
              Or Connect With
            </span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          {/* Google SSO Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-secondary w-full flex items-center justify-center gap-3 bg-background hover:bg-background-subtle border border-border"
            disabled={loading}
          >
            {/* Google G Symbol Vector */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" width="24" height="24">
              <g transform="matrix(1, 0, 0, 1, 0, 0)">
                <path
                  d="M21.35,11.1H12v2.7h5.38C16.88,15.53,14.77,16.5,12,16.5c-3.04,0-5.61-2.05-6.53-4.8c-0.23-0.7-0.37-1.45-0.37-2.2s0.14-1.5,0.37-2.2C6.39,4.55,8.96,2.5,12,2.5c1.66,0,3.16,0.61,4.33,1.62l2.02-2.02C16.57,0.51,14.4,0,12,0C7.3,0,3.31,2.69,1.38,6.6C0.91,7.56,0.65,8.61,0.65,9.7c0,1.09,0.26,2.14,0.73,3.1c1.93,3.91,5.92,6.6,10.62,6.6c4.98,0,8.95-3.32,8.95-8.9C21.75,11.83,21.58,11.43,21.35,11.1z"
                  fill="#ea4335"
                />
                <path
                  d="M12,24c3.24,0,5.97-1.08,7.96-2.91l-3.08-2.39c-0.85,0.57-1.95,0.92-3.2,0.92c-3.04,0-5.61-2.05-6.53-4.8C6.92,14.93,6.7,15.05,6.48,15.18l-3.31,2.56C5.1,21.31,8.55,24,12,24z"
                  fill="#34a853"
                />
                <path
                  d="M5.47,14.82C5.24,14.12,5.1,13.37,5.1,12.62c0-0.75,0.14-1.5,0.37-2.2L2.16,7.86C1.19,9.4,0.65,11.02,0.65,12.62s0.54,3.22,1.51,4.76L5.47,14.82z"
                  fill="#fbbc05"
                />
                <path
                  d="M12,5.08c1.66,0,3.16,0.61,4.33,1.62l2.02-2.02C16.57,3.09,14.4,2.5,12,2.5C8.55,2.5,5.1,5.19,3.17,8.74l3.31,2.56C7.39,8.5,9.96,5.08,12,5.08z"
                  fill="#4285f4"
                />
              </g>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-foreground-muted">
          New to Bachat Khata?{" "}
          <Link href="/register" className="text-link hover:text-link-hover font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
