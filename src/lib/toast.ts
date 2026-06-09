"use client";

import { toast as sonnerToast } from "sonner";

type ToastOptions = Parameters<typeof sonnerToast.success>[1];
type ToastKind = "success" | "error" | "info" | "warning";

const recentToastTimestamps = new Map<string, number>();
const TOAST_DEDUPE_MS = 2500;

function showToastOnce(
  kind: ToastKind,
  message: string,
  options?: ToastOptions
) {
  const id = String(options?.id ?? `${kind}:${message}`);
  const now = Date.now();
  const lastShownAt = recentToastTimestamps.get(id);

  if (lastShownAt && now - lastShownAt < TOAST_DEDUPE_MS) {
    return id;
  }

  recentToastTimestamps.set(id, now);
  window.setTimeout(() => {
    if (recentToastTimestamps.get(id) === now) {
      recentToastTimestamps.delete(id);
    }
  }, TOAST_DEDUPE_MS);

  return sonnerToast[kind](message, { ...options, id });
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToastOnce("success", message, options),
  error: (message: string, options?: ToastOptions) =>
    showToastOnce("error", message, options),
  info: (message: string, options?: ToastOptions) =>
    showToastOnce("info", message, options),
  warning: (message: string, options?: ToastOptions) =>
    showToastOnce("warning", message, options),
};
