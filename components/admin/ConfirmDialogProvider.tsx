"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Replaces window.confirm() app-wide with a styled modal matching the admin
// UI, so every "are you sure?" prompt looks the same instead of a native
// browser alert. Mounted once in AdminShell — every admin client component
// can call useConfirm() without its own dialog markup/state.
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return ctx;
}

export default function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(typeof opts === "string" ? { message: opts } : opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  useEffect(() => {
    if (!options) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [options, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {options ? (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={(event) => event.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            >
              {options.title ? (
                <h2 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">{options.title}</h2>
              ) : null}
              <p className="text-sm text-slate-600 dark:text-slate-300">{options.message}</p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-zinc-800"
                >
                  {options.cancelLabel ?? "Annuleren"}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  autoFocus
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                    options.danger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-200"
                  }`}
                >
                  {options.confirmLabel ?? "Bevestigen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
