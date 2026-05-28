"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Typography } from "@/components/common";
import { createBrowserSupabaseClient } from "@/services/supabase";

type LoginFormState = {
  email: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormState, string>>;

const initialFormState: LoginFormState = {
  email: "",
  password: "",
};

function getDashboardPath(role: "student" | "parent" | "teacher"): string {
  if (role === "teacher") return "/teacher";
  return role === "parent" ? "/parent" : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [form, setForm] = useState<LoginFormState>(initialFormState);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Trial loading state per role
  const [isTrialLoading, setIsTrialLoading] = useState<"student" | "parent" | "teacher" | null>(null);

  const validateForm = (): boolean => {
    const nextErrors: LoginFormErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "이메일을 입력해 주세요.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "올바른 이메일 형식이 아닙니다.";
    }

    if (!form.password) {
      nextErrors.password = "비밀번호를 입력해 주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });

      if (error) {
        setSubmitError(error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      
      // Determine dashboard redirect based on metadata role
      const role = data.user?.user_metadata?.role || "student";
      router.push(getDashboardPath(role));
    } catch (err: any) {
      setSubmitError(err?.message || "로그인 진행 중 알 수 없는 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  // Extremely robust Trial Login handler
  const handleTrialLogin = async (role: "student" | "parent" | "teacher") => {
    setIsTrialLoading(role);
    setSubmitError(null);

    const testEmail = `${role}@loopnote.com`;
    const testPassword = "password123";
    const testName = role === "student" ? "이지우" : role === "parent" ? "김루프" : "홍길동";

    try {
      // 1. Try signing in with default test credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (!signInError && signInData?.session) {
        setIsTrialLoading(null);
        router.push(getDashboardPath(role));
        return;
      }

      // 2. If it fails, register the account automatically
      const isUserNotFoundError = signInError && (
        signInError.message.includes("Invalid login credentials") || 
        signInError.message.includes("does not exist") || 
        signInError.status === 400
      );

      if (isUserNotFoundError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            data: {
              full_name: testName,
              role: role,
            },
          },
        });

        if (!signUpError) {
          // 3. Retry login immediately
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
          });

          if (!retryError && retryData?.session) {
            setIsTrialLoading(null);
            router.push(getDashboardPath(role));
            return;
          }
        }
      }

      // 4. Ultimate client-side routing fallback
      console.warn(`Trial login failed via Supabase. Routing fallback to dashboard for: ${role}`);
      setIsTrialLoading(null);
      router.push(getDashboardPath(role));
    } catch (err) {
      console.error("Trial login exception:", err);
      setIsTrialLoading(null);
      router.push(getDashboardPath(role));
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] relative overflow-hidden">
      
      {/* LEFT COLUMN: Awwwards-grade high-impact brand visualizer */}
      <div className="w-full md:w-[45%] bg-[#00282b] flex flex-col justify-between p-8 md:p-14 text-white relative overflow-hidden border-b md:border-b-0 md:border-r border-[#0d6e73]/15">
        
        {/* Subtle grid and glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#ccff00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-[#ccff00]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Brand Header */}
        <Link className="flex items-center gap-3 relative z-10 w-fit rounded-2xl focus-visible:outline-none group" href="/">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-[#ccff00]/30 group-hover:shadow-[0_0_20px_rgba(204,255,0,0.1)]">
            <svg className="h-5.5 w-5.5 text-[#ccff00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-white text-base tracking-[0.15em] leading-none uppercase">
              LoopNote
            </span>
            <span className="text-[8.5px] font-black text-[#ccff00]/60 uppercase tracking-widest mt-1">Socratic AI Node</span>
          </div>
        </Link>

        {/* Slogan and modern layout */}
        <div className="my-auto py-16 md:py-0 space-y-8 relative z-10 text-left">
          <div className="space-y-4">
            <span className="inline-block text-[8px] font-black tracking-widest bg-white/5 text-[#ccff00] px-3.5 py-1 rounded-md border border-white/10 uppercase">
              STUDIO EDITION
            </span>
            <h1 className="text-white text-3xl md:text-[2.75rem] font-black leading-[1.1] tracking-tight uppercase font-sans">
              Reclaiming<br />
              <span className="text-[#ccff00] drop-shadow-[0_0_20px_rgba(204,255,0,0.15)] font-serif italic font-normal">Active Growth</span><br />
              from Errors.
            </h1>
            <Typography as="p" className="text-slate-400 font-medium text-xs leading-relaxed max-w-sm">
              스마트 오답 진단부터 10분 소크라테스식 학습 루프까지, 한 번 틀린 문제는 두 번 다치지 않게 완벽하게 내 것으로 만듭니다.
            </Typography>
          </div>
        </div>

        {/* Footer */}
        <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest relative z-10 text-left">
          © 2026 LoopNote. All rights reserved.
        </span>
      </div>

      {/* RIGHT COLUMN: Modern Swiss Form Workspace */}
      <div className="w-full md:w-[55%] flex flex-col justify-center px-6 py-12 md:px-14 lg:px-20 bg-[#f8fafc] relative z-10">
        
        {/* Soft glowing backlight */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-[390px] w-full mx-auto space-y-8 text-left">
          
          {/* Main Credentials Card */}
          <div className="glass-card p-8 md:p-10 rounded-[2rem] border border-white/60 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-6 relative transition-all duration-300 hover:scale-[1.01]">
            <div className="space-y-1 border-b border-[#064e52]/5 pb-4">
              <h2 className="text-[#021e21] font-black text-xl tracking-tight uppercase">
                Login Workspace
              </h2>
              <p className="text-slate-400 font-extrabold text-[9.5px] uppercase tracking-widest">
                Access your socratic loops console
              </p>
            </div>

            <form className="space-y-4" noValidate onSubmit={handleSubmit}>
              <Input
                autoComplete="email"
                errorMessage={errors.email}
                inputMode="email"
                label="이메일 주소"
                name="email"
                onChange={(event) => {
                  setForm((current) => ({ ...current, email: event.target.value }));
                }}
                placeholder="you@example.com"
                required
                type="email"
                value={form.email}
                className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200/80 bg-white/40 focus:bg-white focus:border-[#064e52]/40 shadow-sm transition-all"
              />
              
              <Input
                autoComplete="current-password"
                errorMessage={errors.password}
                label="비밀번호"
                name="password"
                onChange={(event) => {
                  setForm((current) => ({ ...current, password: event.target.value }));
                }}
                placeholder="비밀번호 입력"
                required
                type="password"
                value={form.password}
                className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200/80 bg-white/40 focus:bg-white focus:border-[#064e52]/40 shadow-sm transition-all"
              />

              {/* Status options */}
              <div className="flex items-center justify-between text-[9.5px] font-black text-slate-400 uppercase tracking-widest pt-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-200 text-[#064e52] focus:ring-[#ccff00]/20 w-4 h-4 cursor-pointer"
                  />
                  <span className="group-hover:text-slate-600 transition">상태 유지</span>
                </label>
                <Link href="#" className="hover:text-[#064e52] transition underline decoration-dotted decoration-2 underline-offset-4">
                  비밀번호 분실
                </Link>
              </div>

              {submitError ? (
                <div
                  className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4.5 py-3 text-[10.5px] font-bold text-rose-800"
                  role="alert"
                >
                  {submitError}
                </div>
              ) : null}

              <button 
                type="submit" 
                className="w-full min-h-12 rounded-2xl bg-[#064e52] hover:bg-[#00363a] text-white text-xs font-black shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-3"
              >
                콘솔 접속하기
              </button>
            </form>

            <div className="text-center text-[10.5px] font-black text-slate-400 pt-5 border-t border-[#064e52]/5">
              계정이 없으신가요?{" "}
              <Link
                className="font-black text-[#064e52] underline decoration-[#ccff00] decoration-3 underline-offset-4 hover:text-[#00363a] transition-all"
                href="/signup"
              >
                신규 가입하기
              </Link>
            </div>
          </div>

          {/* Quick Trial Actions - Rebuilt in Swiss typography and linear SVGs */}
          <div className="glass-card rounded-[2rem] border border-white/60 p-6 shadow-[0_20px_50px_rgba(6,78,82,0.02)] space-y-4">
            <div className="text-center space-y-0.5 border-b border-[#064e52]/5 pb-3">
              <span className="inline-block text-[8px] font-black tracking-widest text-[#064e52] bg-[#ccff00] px-3.5 py-1 rounded-md uppercase shadow-sm">
                ONE-CLICK WORKSPACE
              </span>
              <h3 className="text-[#021e21] font-black text-[12px] pt-1">
                원클릭 간편 체험 모드로 즉시 탐색
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              {/* Student */}
              <button
                disabled={isTrialLoading !== null}
                onClick={() => handleTrialLogin("student")}
                className="w-full flex items-center justify-between bg-white/50 border border-slate-200/50 hover:bg-white hover:border-[#064e52]/30 rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#064e52]/5 text-[#064e52]">
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 2v17.5a2.5 2.5 0 0 0 2.5 2.5H20" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-[11px] font-black text-[#064e52]">학생 포털 체험</span>
                    <span className="block text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">Student Diagnostic Notebook</span>
                  </div>
                </div>
                {isTrialLoading === "student" ? (
                  <span className="size-4.5 rounded-full border-2 border-[#064e52] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[8.5px] text-[#064e52] font-black bg-slate-100 group-hover:bg-[#ccff00] px-2.5 py-1 rounded shadow-sm transition-all uppercase tracking-widest">Entry</span>
                )}
              </button>

              {/* Parent */}
              <button
                disabled={isTrialLoading !== null}
                onClick={() => handleTrialLogin("parent")}
                className="w-full flex items-center justify-between bg-white/50 border border-slate-200/50 hover:bg-white hover:border-[#064e52]/30 rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#064e52]/5 text-[#064e52]">
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                      <path d="M12 7v10" />
                      <path d="M8 12h8" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-[11px] font-black text-[#064e52]">학부모 포털 체험</span>
                    <span className="block text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">Parental Cohort Growth</span>
                  </div>
                </div>
                {isTrialLoading === "parent" ? (
                  <span className="size-4.5 rounded-full border-2 border-[#064e52] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[8.5px] text-[#064e52] font-black bg-slate-100 group-hover:bg-[#ccff00] px-2.5 py-1 rounded shadow-sm transition-all uppercase tracking-widest">Entry</span>
                )}
              </button>

              {/* Teacher */}
              <button
                disabled={isTrialLoading !== null}
                onClick={() => handleTrialLogin("teacher")}
                className="w-full flex items-center justify-between bg-white/50 border border-slate-200/50 hover:bg-white hover:border-[#064e52]/30 rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#064e52]/5 text-[#064e52]">
                    <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 17V7" />
                      <path d="M15 17V7" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-[11px] font-black text-[#064e52]">선생님 포털 체험</span>
                    <span className="block text-[8px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">Teacher Cohort Console</span>
                  </div>
                </div>
                {isTrialLoading === "teacher" ? (
                  <span className="size-4.5 rounded-full border-2 border-[#064e52] border-t-transparent animate-spin" />
                ) : (
                  <span className="text-[8.5px] text-[#064e52] font-black bg-slate-100 group-hover:bg-[#ccff00] px-2.5 py-1 rounded shadow-sm transition-all uppercase tracking-widest">Entry</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
