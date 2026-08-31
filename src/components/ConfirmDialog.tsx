import { type ReactNode } from "react";
import { formatResourceCost } from "../game/constants";
import type { ResourceCost } from "../game/types";

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  refund?: ResourceCost;
  refundNote?: string;
  confirmTone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Cancel job",
  cancelLabel = "Keep",
  refund,
  refundNote = "(Power 100%, other resources 95%)",
  confirmTone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="modal confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="confirm-dialog-title"
      >
        <header className="modal-header">
          <h2 id="confirm-dialog-title">{title}</h2>
        </header>
        <div className="confirm-dialog-body">
          <p>{message}</p>
          {refund && Object.keys(refund).length > 0 && (
            <p className="confirm-dialog-refund">
              Refund: {formatResourceCost(refund)}
              {refundNote ? (
                <small className="muted"> {refundNote}</small>
              ) : null}
            </p>
          )}
        </div>
        <footer className="confirm-dialog-actions">
          <button type="button" className="tab" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmTone === "primary" ? "btn primary" : "btn danger-btn"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
