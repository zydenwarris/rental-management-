import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button, ui } from "@app/components/ui/index.js";

/**
 * Deletes in this app are frequently refused by the server (a property with
 * units, a tenant with lease history), so the dialog has to be able to show a
 * server error in place rather than closing optimistically.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  error,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  error?: string | undefined;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className={ui.overlay} onClick={onCancel}>
      <div
        className={ui.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className={ui.dialogTitle}>{title}</h2>
        <p className={ui.dialogMessage}>{message}</p>
        {error && (
          <div className={ui.formBanner} role="alert">
            <span>{error}</span>
          </div>
        )}
        <div className={ui.dialogActions}>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button ref={confirmRef} variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
