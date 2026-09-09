"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; text: string; variant: ToastVariant };
type ToastContextValue = {
  notify: (text: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, variant: ToastVariant = "success") => {
      const id = ++nextId.current;
      // The success effect can fire more than once per action (StrictMode
      // double-mounts effects in dev), so skip duplicates that are still on
      // screen instead of stacking the same toast.
      setToasts((current) =>
        current.some(
          (toast) => toast.text === text && toast.variant === variant,
        )
          ? current
          : [...current, { id, text, variant }],
      );
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div
            className={`toast toast-${toast.variant}`}
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            {toast.variant === "error" ? (
              <AlertCircle aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            <span>{toast.text}</span>
            <button
              className="toast-dismiss"
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
}
