"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type AppToastTone = "success" | "error" | "info" | "progress";

export type AppToastDetailStatus = "complete" | "current" | "error" | "pending";

export type AppToastDetail = {
  description?: string;
  id: string;
  label: string;
  status: AppToastDetailStatus;
};

export type AppToast = {
  details?: AppToastDetail[];
  durationMs?: number;
  id: number;
  isClosing: boolean;
  message: string;
  persistent?: boolean;
  title?: string | null;
  tone: AppToastTone;
};

type AppToastInput = {
  details?: AppToastDetail[];
  durationMs?: number;
  message: string;
  persistent?: boolean;
  title?: string | null;
};

type AppToastPatch = Partial<Omit<AppToast, "id">>;

type AppToastTimeouts = {
  closeTimeoutId: number;
  removeTimeoutId: number | null;
};

type AppToastContextValue = {
  clear: () => void;
  dismiss: (id: number) => void;
  error: (input: AppToastInput) => number;
  info: (input: AppToastInput) => number;
  progress: (input: AppToastInput) => number;
  success: (input: AppToastInput) => number;
  update: (id: number, patch: AppToastPatch) => void;
};

const DEFAULT_TOAST_DURATION_MS: Record<Exclude<AppToastTone, "progress">, number> = {
  error: 4200,
  info: 3200,
  success: 3200
};
const TOAST_EXIT_DURATION_MS = 240;

const AppToastContext = createContext<AppToastContextValue | null>(null);

function getToastIcon(tone: AppToastTone) {
  if (tone === "error") return "!";
  if (tone === "success") return "✓";
  if (tone === "info") return "i";
  return "⋯";
}

function createToastId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const toastTimeoutsRef = useRef<Map<number, AppToastTimeouts>>(new Map());

  const clearToastTimeouts = useCallback((toastId: number) => {
    const timeouts = toastTimeoutsRef.current.get(toastId);

    if (!timeouts) {
      return;
    }

    window.clearTimeout(timeouts.closeTimeoutId);
    if (timeouts.removeTimeoutId !== null) {
      window.clearTimeout(timeouts.removeTimeoutId);
    }
    toastTimeoutsRef.current.delete(toastId);
  }, []);

  const removeToast = useCallback(
    (toastId: number) => {
      clearToastTimeouts(toastId);
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    },
    [clearToastTimeouts]
  );

  const dismiss = useCallback((toastId: number) => {
    const timeouts = toastTimeoutsRef.current.get(toastId);

    if (timeouts?.removeTimeoutId !== null && timeouts?.removeTimeoutId !== undefined) {
      return;
    }

    setToasts((current) =>
      current.map((toast) =>
        toast.id === toastId
          ? {
              ...toast,
              isClosing: true
            }
          : toast
      )
    );

    const removeTimeoutId = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
      toastTimeoutsRef.current.delete(toastId);
    }, TOAST_EXIT_DURATION_MS);

    toastTimeoutsRef.current.set(toastId, {
      closeTimeoutId: timeouts?.closeTimeoutId ?? removeTimeoutId,
      removeTimeoutId
    });
  }, []);

  const scheduleToastDismiss = useCallback(
    (toastId: number, durationMs: number) => {
      clearToastTimeouts(toastId);
      const closeTimeoutId = window.setTimeout(() => {
        dismiss(toastId);
      }, durationMs);

      toastTimeoutsRef.current.set(toastId, {
        closeTimeoutId,
        removeTimeoutId: null
      });
    },
    [clearToastTimeouts, dismiss]
  );

  const showToast = useCallback(
    (tone: AppToastTone, input: AppToastInput) => {
      const toastId = createToastId();
      const persistent = tone === "progress" ? input.persistent ?? true : input.persistent ?? false;
      const durationMs =
        input.durationMs ?? (tone === "progress" ? undefined : DEFAULT_TOAST_DURATION_MS[tone]);

      setToasts((current) => [
        ...current,
        {
          details: input.details,
          durationMs,
          id: toastId,
          isClosing: false,
          message: input.message,
          persistent,
          title: input.title ?? null,
          tone
        }
      ]);

      if (!persistent && durationMs !== undefined) {
        scheduleToastDismiss(toastId, durationMs);
      }

      return toastId;
    },
    [scheduleToastDismiss]
  );

  const update = useCallback(
    (toastId: number, patch: AppToastPatch) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === toastId
            ? {
                ...toast,
                ...patch,
                isClosing: patch.isClosing ?? false
              }
            : toast
        )
      );

      if (patch.persistent) {
        clearToastTimeouts(toastId);
        return;
      }

      if (patch.durationMs !== undefined) {
        scheduleToastDismiss(toastId, patch.durationMs);
      }
    },
    [clearToastTimeouts, scheduleToastDismiss]
  );

  const clear = useCallback(() => {
    for (const toastId of toastTimeoutsRef.current.keys()) {
      clearToastTimeouts(toastId);
    }
    setToasts([]);
  }, [clearToastTimeouts]);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      for (const toastId of toastTimeoutsRef.current.keys()) {
        clearToastTimeouts(toastId);
      }
    };
  }, [clearToastTimeouts]);

  const contextValue = useMemo<AppToastContextValue>(
    () => ({
      clear,
      dismiss,
      error: (input) => showToast("error", input),
      info: (input) => showToast("info", input),
      progress: (input) => showToast("progress", input),
      success: (input) => showToast("success", input),
      update
    }),
    [clear, dismiss, showToast, update]
  );

  return (
    <AppToastContext.Provider value={contextValue}>
      {children}
      {isMounted && toasts.length > 0
        ? createPortal(
            <div aria-live="polite" className="app-toast-layer">
              {toasts.map((toast) => (
                <article
                  className={`app-toast is-${toast.tone} ${toast.isClosing ? "is-closing" : ""}`}
                  key={toast.id}
                  role={toast.tone === "error" ? "alert" : "status"}
                >
                  <span className="app-toast-icon" aria-hidden="true">
                    {getToastIcon(toast.tone)}
                  </span>
                  <div className="app-toast-copy">
                    <div className="app-toast-main">
                      {toast.title ? <strong>{toast.title}</strong> : null}
                      <p>{toast.message}</p>
                    </div>
                    {toast.details?.length ? (
                      <div className="app-toast-details">
                        {toast.details.map((detail, index) => (
                          <div className={`app-toast-detail is-${detail.status}`} key={detail.id}>
                            <div className="app-toast-detail-indicator" aria-hidden="true">
                              {detail.status === "complete" ? "✓" : index + 1}
                            </div>
                            <div className="app-toast-detail-copy">
                              <strong>{detail.label}</strong>
                              {detail.description ? <p>{detail.description}</p> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>,
            document.body
          )
        : null}
    </AppToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useToast must be used inside AppToastProvider.");
  }

  return context;
}
