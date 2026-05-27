"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { TimerState, TimerStatus, UseTimerOptions } from "@/types";

const DEFAULT_MISSION_SECONDS = 10 * 60;
const DEFAULT_TICK_MS = 250;

const clampSeconds = (seconds: number) => Math.max(0, Math.floor(seconds));

export function useTimer({
  autoStart = false,
  initialSeconds = DEFAULT_MISSION_SECONDS,
  onComplete,
  tickMs = DEFAULT_TICK_MS,
}: UseTimerOptions = {}) {
  const safeInitialSeconds = clampSeconds(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(safeInitialSeconds);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const endAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(safeInitialSeconds * 1000);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const updateFromClock = useCallback(() => {
    if (!endAtRef.current) {
      return;
    }

    const remainingMs = Math.max(0, endAtRef.current - Date.now());
    remainingMsRef.current = remainingMs;
    setRemainingSeconds(Math.ceil(remainingMs / 1000));

    if (remainingMs === 0 && !completedRef.current) {
      completedRef.current = true;
      endAtRef.current = null;
      setStatus("completed");
      onCompleteRef.current?.();
    }
  }, []);

  const start = useCallback(
    (overrideSeconds?: number) => {
      const nextRemainingMs =
        typeof overrideSeconds === "number"
          ? clampSeconds(overrideSeconds) * 1000
          : remainingMsRef.current || safeInitialSeconds * 1000;

      completedRef.current = false;
      remainingMsRef.current = nextRemainingMs;
      endAtRef.current = Date.now() + nextRemainingMs;
      setRemainingSeconds(Math.ceil(nextRemainingMs / 1000));
      setStatus("running");
    },
    [safeInitialSeconds]
  );

  const pause = useCallback(() => {
    if (status !== "running" || !endAtRef.current) {
      return;
    }

    const remainingMs = Math.max(0, endAtRef.current - Date.now());
    endAtRef.current = null;
    remainingMsRef.current = remainingMs;
    setRemainingSeconds(Math.ceil(remainingMs / 1000));
    setStatus(remainingMs > 0 ? "paused" : "completed");
  }, [status]);

  const reset = useCallback(
    (nextSeconds = safeInitialSeconds) => {
      const safeNextSeconds = clampSeconds(nextSeconds);

      completedRef.current = false;
      endAtRef.current = null;
      remainingMsRef.current = safeNextSeconds * 1000;
      setRemainingSeconds(safeNextSeconds);
      setStatus("idle");
    },
    [safeInitialSeconds]
  );

  useEffect(() => {
    if (autoStart) {
      start(safeInitialSeconds);
    }
  }, [autoStart, safeInitialSeconds, start]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }

    updateFromClock();
    const intervalId = window.setInterval(updateFromClock, tickMs);

    return () => window.clearInterval(intervalId);
  }, [status, tickMs, updateFromClock]);

  const elapsedSeconds = safeInitialSeconds - remainingSeconds;
  const progress =
    safeInitialSeconds > 0
      ? Math.min(1, Math.max(0, elapsedSeconds / safeInitialSeconds))
      : 1;

  const state: TimerState = {
    remainingSeconds,
    totalSeconds: safeInitialSeconds,
    elapsedSeconds,
    progress,
    status,
    isRunning: status === "running",
  };

  return {
    ...state,
    start,
    pause,
    reset,
  };
}
