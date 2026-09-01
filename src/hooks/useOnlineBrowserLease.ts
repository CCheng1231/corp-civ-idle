import { useEffect, useRef } from "react";
import type { OnlineSession } from "../multiplayer/types";
import {
  claimBrowserLease,
  clearBrowserLeaseId,
  getOrCreateBrowserLeaseId,
  heartbeatBrowserLease,
  releaseBrowserLease,
  subscribeBrowserLease,
  tryRecoverVacantBrowserLease,
} from "../multiplayer/browserLease";

const HEARTBEAT_MS = 10_000;

interface UseOnlineBrowserLeaseOptions {
  session: OnlineSession;
  enabled: boolean;
  onKicked: () => void;
}

export function useOnlineBrowserLease({
  session,
  enabled,
  onKicked,
}: UseOnlineBrowserLeaseOptions): void {
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;
  const leaseIdRef = useRef<string | null>(null);
  const claimGenerationRef = useRef(0);
  const kickedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    kickedRef.current = false;
    const leaseId = getOrCreateBrowserLeaseId(session);
    leaseIdRef.current = leaseId;

    let unsub: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const claimGeneration = await claimBrowserLease(session, leaseId);
        if (cancelled) return;
        claimGenerationRef.current = claimGeneration;

        unsub = subscribeBrowserLease(
          session,
          leaseId,
          claimGeneration,
          () => {
            if (kickedRef.current || cancelled) return;
            kickedRef.current = true;
            clearBrowserLeaseId(session);
            onKickedRef.current();
          },
        );
      } catch (err) {
        console.error("Browser lease claim failed", err);
      }
    })();

    const heartbeatId = window.setInterval(() => {
      const leaseIdNow = leaseIdRef.current;
      const claimGeneration = claimGenerationRef.current;
      if (!leaseIdNow || !claimGeneration) return;

      void heartbeatBrowserLease(session, leaseIdNow, claimGeneration).then(
        async (stillHeld) => {
          if (stillHeld || kickedRef.current || cancelled) return;

          const outcome = await tryRecoverVacantBrowserLease(
            session,
            leaseIdNow,
            claimGeneration,
          );
          if (outcome === "lost" && !kickedRef.current) {
            kickedRef.current = true;
            clearBrowserLeaseId(session);
            onKickedRef.current();
          }
        },
      );
    }, HEARTBEAT_MS);

    const onHide = () => {
      if (leaseIdRef.current && claimGenerationRef.current) {
        void releaseBrowserLease(
          session,
          leaseIdRef.current,
          claimGenerationRef.current,
        );
      }
    };
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      window.removeEventListener("pagehide", onHide);
      unsub?.();
    };
  }, [session, enabled]);
}
