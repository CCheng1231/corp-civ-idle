import { useEffect, useRef, useState } from "react";

export interface AccessKeyInviteDetails {
  keyId: string;
  displayName: string;
  lockedEmail?: string;
}

interface AccessKeyInviteDialogProps {
  details: AccessKeyInviteDetails;
  onClose: () => void;
}

async function copyAccessKey(keyId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(keyId);
    return true;
  } catch {
    return false;
  }
}

export function AccessKeyInviteDialog({
  details,
  onClose,
}: AccessKeyInviteDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [details.keyId]);

  const onCopy = () => {
    void copyAccessKey(details.keyId).then((ok) => {
      setCopyHint(
        ok ? "Copied to clipboard." : "Could not copy — select the key and press Ctrl+C.",
      );
      window.setTimeout(() => setCopyHint(null), 2500);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal confirm-dialog access-key-invite-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="access-key-invite-title"
        aria-describedby="access-key-invite-desc"
      >
        <header className="modal-header">
          <h2 id="access-key-invite-title">Access key created</h2>
        </header>
        <div className="confirm-dialog-body">
          <p id="access-key-invite-desc" className="confirm-dialog-message">
            Invite for <strong>{details.displayName}</strong>
            {details.lockedEmail ? (
              <>
                {" "}
                (locked to <strong>{details.lockedEmail}</strong>)
              </>
            ) : null}
            . Copy the key now — it is not stored in Settings after you close this.
          </p>
          <div className="access-key-invite-field">
            <input
              ref={inputRef}
              type="text"
              className="access-key-invite-input"
              value={details.keyId}
              readOnly
              aria-label="Playtest access key"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="btn primary" onClick={onCopy}>
              Copy key
            </button>
          </div>
          {copyHint ? (
            <p className="muted access-key-invite-copy-hint" role="status">
              {copyHint}
            </p>
          ) : null}
        </div>
        <footer className="confirm-dialog-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}

interface AccessKeyInviteCopyRowProps {
  details: AccessKeyInviteDetails;
}

/** Inline last-created key with selectable field + copy (after dialog is closed). */
export function AccessKeyInviteCopyRow({ details }: AccessKeyInviteCopyRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const onCopy = () => {
    void copyAccessKey(details.keyId).then((ok) => {
      if (!ok && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
      setCopyHint(ok ? "Copied." : "Select the key and press Ctrl+C.");
      window.setTimeout(() => setCopyHint(null), 2000);
    });
  };

  return (
    <div className="access-key-invite-last">
      <p className="muted setting-hint">
        Last invite: <strong>{details.displayName}</strong>
        {details.lockedEmail ? ` (${details.lockedEmail})` : ""}
      </p>
      <div className="access-key-invite-field">
        <input
          ref={inputRef}
          type="text"
          className="access-key-invite-input"
          value={details.keyId}
          readOnly
          aria-label="Last playtest access key"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn" onClick={onCopy}>
          Copy
        </button>
      </div>
      {copyHint ? (
        <p className="muted access-key-invite-copy-hint" role="status">
          {copyHint}
        </p>
      ) : null}
    </div>
  );
}