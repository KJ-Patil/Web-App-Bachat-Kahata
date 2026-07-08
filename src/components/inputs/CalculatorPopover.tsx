"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calculator, Delete } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalculatorPopoverProps {
  /** The current numeric string value of the input field */
  value: string;
  /** Callback when the calculator value is applied/changed */
  onChange: (val: string) => void;
  /** Optional title to show in the calculator popover */
  title?: string;
}

import { evaluateArithmetic } from "@/core/math/mathEvaluator";

export default function CalculatorPopover({ value, onChange, title = "Calculator" }: CalculatorPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState("");
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Synchronize expression with input value when opened
  useEffect(() => {
    if (isOpen) {
      // Strip any commas or local formatting to work with pure digits
      const sanitizedVal = value ? value.toString().replace(/,/g, "") : "";
      setExpression(sanitizedVal);
    }
  }, [isOpen, value]);

  // Compute live result whenever the expression changes
  useEffect(() => {
    if (!expression) {
      setLiveResult(null);
      return;
    }
    try {
      const res = evaluateArithmetic(expression);
      // Limit decimals to 4 places for preview
      if (!isNaN(res) && isFinite(res)) {
        setLiveResult(Number(res.toFixed(4)).toString());
      } else {
        setLiveResult(null);
      }
    } catch {
      // Suppress errors during live typing (e.g. operator at the end)
      setLiveResult(null);
    }
  }, [expression]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Listen to physical keyboard events when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent mapping inputs when user is typing in unrelated fields
      if (e.target instanceof HTMLInputElement && e.target.id !== "amount-calculator-fake-focus") {
        // Allow escape and enter key to work anywhere inside the popover context
        if (e.key === "Escape") {
          e.preventDefault();
          setIsOpen(false);
        }
        return;
      }

      const key = e.key;

      if (/[0-9.()+\-*/]/.test(key)) {
        e.preventDefault();
        setExpression((prev) => prev + key);
      } else if (key === "Backspace") {
        e.preventDefault();
        setExpression((prev) => prev.slice(0, -1));
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleEvaluateOrApply();
      } else if (key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      } else if (key.toLowerCase() === "c") {
        e.preventDefault();
        setExpression("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, expression, liveResult]);

  const appendChar = (char: string) => {
    setExpression((prev) => prev + char);
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setExpression("");
  };

  const handleEvaluateOrApply = () => {
    try {
      if (!expression) return;
      const res = evaluateArithmetic(expression);
      if (!isNaN(res) && isFinite(res)) {
        const rounded = Number(res.toFixed(4)).toString();
        // If the expression was not just a plain number, evaluate it first,
        // letting the user see the result in the display. If they press apply/enter again, it writes it.
        if (expression !== rounded) {
          setExpression(rounded);
        } else {
          // It's already fully evaluated, apply it
          onChange(rounded);
          setIsOpen(false);
        }
      }
    } catch {
      // Show an temporary error indicator
      setExpression("Error");
      setTimeout(() => setExpression(""), 1200);
    }
  };

  const handleApply = () => {
    try {
      if (!expression) {
        onChange("");
        setIsOpen(false);
        return;
      }
      const res = evaluateArithmetic(expression);
      if (!isNaN(res) && isFinite(res)) {
        onChange(Number(res.toFixed(4)).toString());
        setIsOpen(false);
      }
    } catch {
      setExpression("Error");
      setTimeout(() => setExpression(""), 1200);
    }
  };

  return (
    <div className="relative inline-block text-left select-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background-subtle border border-transparent hover:border-border transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
        title="Open Calculator"
      >
        <Calculator className="w-4 h-4 text-primary" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 p-4 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-[270px] text-white flex flex-col gap-3 font-sans z-50 pointer-events-auto"
            style={{ filter: "drop-shadow(0 25px 25px rgb(0 0 0 / 0.25))" }}
          >
            {/* Fake input element to capture window focus for keyboard inputs */}
            <input
              id="amount-calculator-fake-focus"
              className="sr-only"
              autoFocus
              readOnly
            />

            {/* Top Bar Header */}
            <div className="flex justify-between items-center px-1 text-slate-400">
              <span className="text-[10px] font-extrabold tracking-wider uppercase">{title}</span>
              <span className="text-[9px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                RAD / MATH
              </span>
            </div>

            {/* LCD Display Panel */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-end items-end h-[68px] font-mono shadow-inner select-all">
              <div className="text-[10px] text-slate-400 tracking-wider truncate max-w-full font-medium h-4">
                {expression && expression !== liveResult ? expression : ""}
              </div>
              <div className="text-xl font-extrabold text-emerald-400 tracking-tight truncate max-w-full leading-none mt-1">
                {expression === "Error" ? "Error" : liveResult || expression || "0"}
              </div>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                type="button"
                onClick={handleClear}
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-xs font-black py-2.5 rounded-xl transition-all active:scale-95 border border-rose-900/30 cursor-pointer shadow-sm animate-pulse-once"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => appendChar("(")}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-700/30 cursor-pointer shadow-sm"
              >
                (
              </button>
              <button
                type="button"
                onClick={() => appendChar(")")}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-700/30 cursor-pointer shadow-sm"
              >
                )
              </button>
              <button
                type="button"
                onClick={() => appendChar("/")}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-extrabold py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-900/20"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                type="button"
                onClick={() => appendChar("7")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                7
              </button>
              <button
                type="button"
                onClick={() => appendChar("8")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                8
              </button>
              <button
                type="button"
                onClick={() => appendChar("9")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                9
              </button>
              <button
                type="button"
                onClick={() => appendChar("*")}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-extrabold py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-900/20"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                type="button"
                onClick={() => appendChar("4")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                4
              </button>
              <button
                type="button"
                onClick={() => appendChar("5")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                5
              </button>
              <button
                type="button"
                onClick={() => appendChar("6")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                6
              </button>
              <button
                type="button"
                onClick={() => appendChar("-")}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-extrabold py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-900/20"
              >
                −
              </button>

              {/* Row 4 */}
              <button
                type="button"
                onClick={() => appendChar("1")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                1
              </button>
              <button
                type="button"
                onClick={() => appendChar("2")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                2
              </button>
              <button
                type="button"
                onClick={() => appendChar("3")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                3
              </button>
              <button
                type="button"
                onClick={() => appendChar("+")}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-extrabold py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-900/20"
              >
                +
              </button>

              {/* Row 5 */}
              <button
                type="button"
                onClick={() => appendChar("0")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => appendChar(".")}
                className="bg-slate-700 hover:bg-slate-650 text-white text-base font-bold py-2.5 rounded-xl transition-all active:scale-95 border border-slate-600/20 cursor-pointer shadow-sm"
              >
                .
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="bg-slate-800 hover:bg-slate-750 text-slate-300 py-2.5 rounded-xl transition-all active:scale-95 border border-slate-700/30 flex items-center justify-center cursor-pointer shadow-sm"
                title="Backspace"
              >
                <Delete className="w-4 h-4 text-slate-300" />
              </button>
              <button
                type="button"
                onClick={handleEvaluateOrApply}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-black py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-900/20"
              >
                =
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 bg-emerald-600 hover:bg-emerald-555 active:bg-emerald-500 text-white text-xs font-black py-2 rounded-xl transition-all cursor-pointer text-center shadow-md shadow-emerald-900/10"
              >
                Apply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
