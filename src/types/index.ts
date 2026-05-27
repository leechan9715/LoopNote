import type { AuthError, Session, User } from "@supabase/supabase-js";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthState = {
  user: User | null;
  session: Session | null;
  status: AuthStatus;
  isLoading: boolean;
  error: AuthError | null;
};

export type UseTimerOptions = {
  initialSeconds?: number;
  tickMs?: number;
  autoStart?: boolean;
  onComplete?: () => void;
};

export type TimerStatus = "idle" | "running" | "paused" | "completed";

export type TimerState = {
  remainingSeconds: number;
  totalSeconds: number;
  elapsedSeconds: number;
  progress: number;
  status: TimerStatus;
  isRunning: boolean;
};

export type OcrParserOptions = {
  preserveLineBreaks?: boolean;
  preserveMathSymbols?: boolean;
};

export type OcrParserResult = {
  text: string;
  lines: string[];
};
