"use client";

import { useCallback, useEffect, useRef } from "react";

type UseLongPressOptions = {
  /**
   * Wat er gebeurt bij elke "tik": één keer bij indrukken en daarna
   * herhaaldelijk zolang de knop ingedrukt blijft.
   */
  onTrigger: () => void;
  /** Wachttijd voordat de auto-repeat begint. */
  initialDelayMs?: number;
  /** Interval tussen herhalingen in de eerste fase. */
  intervalMs?: number;
  /** Na hoeveel milliseconden ingedrukt houden we versnellen. */
  accelerateAfterMs?: number;
  /** Snellere interval na de versnellingsdrempel. */
  fastIntervalMs?: number;
  /** Schakel het hele gedrag uit (bv. tijdens opslaan). */
  disabled?: boolean;
};

/**
 * Universele "long-press to repeat" hook. Werkt op muis én touch en stopt
 * netjes bij blur, leave, cancel of unmount. Bij elke aanroep voert hij
 * `onTrigger` één keer direct uit, en daarna automatisch in een
 * versnellend ritme zolang de knop wordt vastgehouden.
 *
 * Gebruik:
 *   const press = useLongPress({ onTrigger: () => setTemp(t => t + 1) });
 *   <button {...press}>+</button>
 */
export function useLongPress({
  onTrigger,
  initialDelayMs = 350,
  intervalMs = 110,
  accelerateAfterMs = 1500,
  fastIntervalMs = 40,
  disabled = false,
}: UseLongPressOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const acceleratedRef = useRef<boolean>(false);
  // onTrigger in een ref zodat we hem altijd "vers" aanroepen zonder
  // start/stop steeds opnieuw te memoiseren.
  const triggerRef = useRef(onTrigger);

  useEffect(() => {
    triggerRef.current = onTrigger;
  }, [onTrigger]);

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    acceleratedRef.current = false;
  }, []);

  useEffect(() => () => stop(), [stop]);

  const beginAutoRepeat = useCallback(
    (delay: number) => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        triggerRef.current();
        if (
          !acceleratedRef.current &&
          Date.now() - startedAtRef.current >= accelerateAfterMs
        ) {
          acceleratedRef.current = true;
          beginAutoRepeat(fastIntervalMs);
        }
      }, delay);
    },
    [accelerateAfterMs, fastIntervalMs],
  );

  const start = useCallback(
    (e?: React.SyntheticEvent) => {
      if (disabled) return;
      // Negeer rechter-/middenmuisknop zodat alleen primaire klik telt.
      if (e && "button" in e) {
        const button = (e as unknown as { button?: number }).button;
        if (typeof button === "number" && button !== 0) return;
      }
      stop();
      startedAtRef.current = Date.now();
      // Direct één keer triggeren zodat een korte tik ook werkt.
      triggerRef.current();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        beginAutoRepeat(intervalMs);
      }, initialDelayMs);
    },
    [disabled, stop, beginAutoRepeat, intervalMs, initialDelayMs],
  );

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
    onBlur: stop,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  } as const;
}
