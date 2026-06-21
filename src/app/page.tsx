"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    // PWA Service Worker Registration - Only in production to prevent caching issues in development
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("Service Worker registered successfully:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }

    // Delay routing slightly to show the beautiful branded load layout
    const timer = setTimeout(() => {
      const session = localStorage.getItem("user_session");
      const pinHash = localStorage.getItem("pin_hash");

      if (!session) {
        // Redirect to login if session missing
        router.push("/login");
      } else if (pinHash) {
        // Security PIN set up, route to validation view
        router.push("/pin-lock");
      } else {
        // Valid session and no lock configured, route directly to dashboard
        router.push("/home");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 pt-24 bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Animated Brand Symbol */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-lighter text-primary animate-bounce shadow-md">
          <svg
            className="w-12 h-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Bachat Khata
          </h1>
          <p className="text-sm font-semibold tracking-wide text-foreground-secondary uppercase">
            Personal Wealth Manager
          </p>
        </div>

        {/* Custom CSS Spinner */}
        <div className="mt-8 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent"></div>
        </div>
      </div>
    </main>
  );
}
