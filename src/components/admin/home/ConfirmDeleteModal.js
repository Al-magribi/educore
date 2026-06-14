"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * @param {{
 *   open: boolean;
 *   title?: string;
 *   description?: string;
 *   confirmLabel?: string;
 *   cancelLabel?: string;
 *   loading?: boolean;
 *   onConfirm: () => void | Promise<void>;
 *   onCancel: () => void;
 * }} props
 */
export function ConfirmDeleteModal({
  open,
  title = "Konfirmasi hapus",
  description = "Tindakan ini tidak dapat dibatalkan.",
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Tutup dialog"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={loading ? undefined : onCancel}
            disabled={loading}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            aria-describedby="confirm-delete-description"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="px-6 pb-2 pt-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
                <svg
                  className="h-6 w-6 text-rose-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h2
                id="confirm-delete-title"
                className="mt-4 text-center text-lg font-semibold tracking-tight text-slate-900"
              >
                {title}
              </h2>
              <p
                id="confirm-delete-description"
                className="mt-2 text-center text-sm leading-relaxed text-slate-600"
              >
                {description}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition hover:bg-rose-700 disabled:opacity-60"
              >
                {loading ? "Menghapus..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** @typedef {{ title?: string; description?: string; confirmLabel?: string }} ConfirmDeleteOptions */

export function useConfirmDelete() {
  const [state, setState] = useState(null);

  const confirmDelete = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const handleConfirm = useCallback(async () => {
    if (!state) return;
    state.resolve(true);
    setState(null);
  }, [state]);

  const ConfirmDeleteDialog = useCallback(
    () => (
      <ConfirmDeleteModal
        open={Boolean(state)}
        title={state?.title}
        description={state?.description}
        confirmLabel={state?.confirmLabel}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [state, handleConfirm, handleCancel]
  );

  return { confirmDelete, ConfirmDeleteDialog };
}
