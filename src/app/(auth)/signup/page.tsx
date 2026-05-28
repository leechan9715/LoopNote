"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Typography } from "@/components/common";
import { createBrowserSupabaseClient } from "@/services/supabase";

type SignupRole = "student" | "parent" | "teacher";

type SignupFormState = {
  fullName: string;
  role: SignupRole | null;
  email: string;
  password: string;
  parentCode: string;
};

type SignupFormErrors = Partial<Record<keyof SignupFormState, string>>;

const initialFormState: SignupFormState = {
  fullName: "",
  role: null,
  email: "",
  password: "",
  parentCode: "",
};

function getDashboardPath(role: SignupRole): string {
  if (role === "teacher") return "/teacher";
  return role === "parent" ? "/parent" : "/";
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  
  // Wizard state: 1 = Role selection, 2 = Core info, 3 = Complete
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<SignupFormState>(initialFormState);
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = (selectedRole: SignupRole) => {
    setForm((current) => ({ ...current, role: selectedRole }));
    setStep(2);
  };

  const validateForm = (): boolean => {
    const nextErrors: SignupFormErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "이름을 입력해 주세요.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "이메일을 입력해 주세요.";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = "올바른 이메일 형식이 아닙니다.";
    }

    if (!form.password) {
      nextErrors.password = "비밀번호를 입력해 주세요.";
    } else if (form.password.length < 6) {
      nextErrors.password = "비밀번호는 6자 이상이어야 해요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!form.role) {
      setStep(1);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            role: form.role,
            parent_email_or_code: form.role === "student" ? form.parentCode.trim() || null : null,
          },
        },
      });

      if (error) {
        setSubmitError(error.message);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setStep(3);
    } catch (err: any) {
      setSubmitError(err?.message || "회원가입 진행 중 알 수 없는 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  const getRoleNameInKorean = (r: SignupRole | null) => {
    if (r === "student") return "학생";
    if (r === "parent") return "학부모";
    if (r === "teacher") return "선생님";
    return "";
  };

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-12 flex flex-col justify-center gap-8 relative overflow-hidden bg-[#f8fafc]">
      
      {/* Dynamic graphic backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,78,82,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,78,82,0.012)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-[#ccff00]/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Brand Header */}
      <header className="text-center relative z-10 flex flex-col items-center">
        <Link className="inline-flex items-center gap-3 rounded-2xl p-2 focus-visible:outline-none group" href="/">
          <div className="p-2.5 rounded-xl bg-[#064e52] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
            <svg className="h-5.5 w-5.5 text-[#ccff00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
            </svg>
          </div>
          <div className="text-left flex flex-col ml-3">
            <span className="font-bold text-[#064e52] tracking-[0.15em] text-base uppercase leading-none">
              LoopNote
            </span>
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mt-1">Socratic Learning System</span>
          </div>
        </Link>
      </header>

      {/* Step Indicators */}
      <div className="mx-auto flex items-center gap-3 relative z-10 max-w-xs w-full px-4">
        <div className={`h-1 flex-grow rounded-full transition-all duration-500 ${step >= 1 ? 'bg-[#064e52]' : 'bg-slate-200'}`} />
        <div className={`h-1 flex-grow rounded-full transition-all duration-500 ${step >= 2 ? 'bg-[#064e52]' : 'bg-slate-200'}`} />
        <div className={`h-1 flex-grow rounded-full transition-all duration-500 ${step >= 3 ? 'bg-[#ccff00]' : 'bg-slate-200'}`} />
      </div>

      {/* Wizard Content Panels */}
      <main className="relative z-10 w-full flex-grow flex items-center justify-center">
        
        {/* STEP 1: ROLE SELECTION */}
        {step === 1 && (
          <div className="w-full space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-1 max-w-md mx-auto">
              <span className="inline-block text-[8px] font-black tracking-widest text-[#064e52] bg-[#ccff00] px-3.5 py-1 rounded-md border border-[#ccff00]/10 uppercase">
                Step 01
              </span>
              <h2 className="text-[#021e21] font-black tracking-tight text-2xl uppercase">
                Select Workspace Role
              </h2>
              <p className="text-slate-400 font-extrabold text-[9.5px] uppercase tracking-widest">
                Choose your learning ecosystem mode
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4">
              
              {/* Student Card */}
              <div 
                onClick={() => handleRoleSelect("student")}
                className="glass-card group relative cursor-pointer flex flex-col justify-between rounded-[2rem] border border-white/60 p-7 shadow-[0_20px_50px_rgba(6,78,82,0.03)] hover:border-[#064e52]/30 hover:scale-[1.01] transition-all duration-300 overflow-hidden min-h-[350px] text-left"
              >
                <div className="space-y-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#064e52]/5 text-[#064e52] border border-[#064e52]/10 transition-transform duration-300 group-hover:scale-105">
                    <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                      <path d="M6 2v17.5a2.5 2.5 0 0 0 2.5 2.5H20" />
                    </svg>
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-[#021e21] font-black text-base">
                      학생 <span className="text-[#064e52] font-black text-[9px] uppercase tracking-widest block mt-0.5">Student Note</span>
                    </h3>
                    <p className="text-slate-400 text-[10.5px] font-bold leading-relaxed">
                      틀린 문제를 스캔하고, 인터랙티브 분수 슬라이더와 AI 소크라테스 힌트로 스스로 생각을 회복하세요.
                    </p>
                  </div>

                  <ul className="space-y-2 text-[10px] font-black text-slate-500 border-t border-[#064e52]/5 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> 스마트 3초 오답 카메라 스캔
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> AI 소크라테스 3단계 점진적 유도
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-[9.5px] font-black text-[#064e52] uppercase tracking-widest bg-[#064e52]/5 group-hover:bg-[#ccff00] px-4 py-3 rounded-xl transition-all duration-200 shadow-sm">
                  <span>학생 계정 생성</span>
                  <span>→</span>
                </div>
              </div>

              {/* Parent Card */}
              <div 
                onClick={() => handleRoleSelect("parent")}
                className="glass-card group relative cursor-pointer flex flex-col justify-between rounded-[2rem] border border-white/60 p-7 shadow-[0_20px_50px_rgba(6,78,82,0.03)] hover:border-[#064e52]/30 hover:scale-[1.01] transition-all duration-300 overflow-hidden min-h-[350px] text-left"
              >
                <div className="space-y-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#064e52]/5 text-[#064e52] border border-[#064e52]/10 transition-transform duration-300 group-hover:scale-105">
                    <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                      <path d="M12 7v10" />
                      <path d="M8 12h8" />
                    </svg>
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-[#021e21] font-black text-base">
                      학부모 <span className="text-[#064e52] font-black text-[9px] uppercase tracking-widest block mt-0.5">Parent Briefing</span>
                    </h3>
                    <p className="text-slate-400 text-[10.5px] font-bold leading-relaxed">
                      자녀의 실시간 학습 성장 그래프를 확인하고, 행동 데이터 기반의 1:1 코칭 가이드를 열람하세요.
                    </p>
                  </div>

                  <ul className="space-y-2 text-[10px] font-black text-slate-500 border-t border-[#064e52]/5 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> 자녀 실시간 종합 성장 차트
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> 행동 패턴 연동형 전문가 부모 팁
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-[9.5px] font-black text-[#064e52] uppercase tracking-widest bg-[#064e52]/5 group-hover:bg-[#ccff00] px-4 py-3 rounded-xl transition-all duration-200 shadow-sm">
                  <span>학부모 계정 생성</span>
                  <span>→</span>
                </div>
              </div>

              {/* Teacher Card */}
              <div 
                onClick={() => handleRoleSelect("teacher")}
                className="glass-card group relative cursor-pointer flex flex-col justify-between rounded-[2rem] border border-white/60 p-7 shadow-[0_20px_50px_rgba(6,78,82,0.03)] hover:border-[#064e52]/30 hover:scale-[1.01] transition-all duration-300 overflow-hidden min-h-[350px] text-left"
              >
                <div className="space-y-5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#064e52]/5 text-[#064e52] border border-[#064e52]/10 transition-transform duration-300 group-hover:scale-105">
                    <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 17V7" />
                      <path d="M15 17V7" />
                    </svg>
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-[#021e21] font-black text-base">
                      선생님 <span className="text-[#064e52] font-black text-[9px] uppercase tracking-widest block mt-0.5">Teacher Console</span>
                    </h3>
                    <p className="text-slate-400 text-[10.5px] font-bold leading-relaxed">
                      학급 취약률을 실시간 지도로 자동 정밀 분석하고, 수준별 맞춤 보충 미션을 배포하세요.
                    </p>
                  </div>

                  <ul className="space-y-2 text-[10px] font-black text-slate-500 border-t border-[#064e52]/5 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> 학급 실시간 오답 분포 매트릭스
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52] font-black">✓</span> 1:1 맞춤 보완 학습 미션 일괄 배포
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-[9.5px] font-black text-[#064e52] uppercase tracking-widest bg-[#064e52]/5 group-hover:bg-[#ccff00] px-4 py-3 rounded-xl transition-all duration-200 shadow-sm">
                  <span>교사 계정 생성</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            <p className="text-center text-xs font-bold text-slate-400">
              이미 계정이 있으신가요?{" "}
              <Link className="font-black text-[#064e52] underline decoration-[#ccff00] decoration-3 underline-offset-4 hover:text-[#00363a] transition-all" href="/login">
                로그인하기
              </Link>
            </p>
          </div>
        )}

        {/* STEP 2: PROFILE INPUT FORM */}
        {step === 2 && (
          <div className="glass-card max-w-[400px] w-full mx-auto p-8 md:p-10 rounded-[2rem] border border-white/60 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-6 relative transition-all duration-300 hover:scale-[1.01] animate-in fade-in duration-300 text-left">
            <div className="space-y-1 border-b border-[#064e52]/5 pb-4">
              <span className="inline-block text-[8px] font-black tracking-widest text-[#064e52] bg-[#ccff00] px-3 py-0.5 rounded uppercase border border-[#064e52]/10 shadow-sm">
                Step 02
              </span>
              <h2 className="text-[#021e21] font-black text-xl tracking-tight uppercase">
                {getRoleNameInKorean(form.role)} Profile Setup
              </h2>
              <p className="text-slate-400 font-extrabold text-[9.5px] uppercase tracking-widest">
                Enter your workspace details
              </p>
            </div>

            <form className="space-y-4" noValidate onSubmit={handleSubmit}>
              <Input
                autoComplete="name"
                errorMessage={errors.fullName}
                label="이름 (실명)"
                name="full_name"
                onChange={(event) => {
                  setForm((current) => ({ ...current, fullName: event.target.value }));
                }}
                placeholder="홍길동"
                required
                type="text"
                value={form.fullName}
                className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200/80 bg-white/40 focus:bg-white focus:border-[#064e52]/40 shadow-sm transition-all"
              />

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
                autoComplete="new-password"
                errorMessage={errors.password}
                helperText="안전을 위해 6자 이상 입력해 주세요."
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

              {form.role === "student" && (
                <Input
                  label="선생님 또는 학부모 초대 코드 (선택)"
                  name="parent_code"
                  onChange={(event) => {
                    setForm((current) => ({ ...current, parentCode: event.target.value }));
                  }}
                  placeholder="초대 코드 입력"
                  helperText="선생님의 초대 코드를 입력하시면 학급 구성원으로 연동되어 보충 피드백을 전달받을 수 있습니다."
                  type="text"
                  value={form.parentCode}
                  className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200/80 bg-white/40 focus:bg-white focus:border-[#064e52]/40 shadow-sm transition-all"
                />
              )}

              {submitError ? (
                <div className="space-y-3 pt-1">
                  <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4.5 py-3.5 text-[10px] font-bold text-rose-800 leading-relaxed text-left" role="alert">
                    {submitError.toLowerCase().includes("rate limit") || 
                     submitError.toLowerCase().includes("security") || 
                     submitError.toLowerCase().includes("limit") ||
                     submitError.toLowerCase().includes("once every 60 seconds") ? (
                      <>
                        <p className="font-black text-xs mb-1 text-rose-800">⚠️ 이메일 인증 발송 임계치 도달</p>
                        <p className="text-[9.5px] text-rose-600 font-bold leading-normal">
                          Supabase 무료 티어 보안 정책으로 인해 신규 계정 가입 메일 전송이 지연되고 있습니다.
                          하지만 아래 체험용 다이렉트 로그인 버튼을 누르시면, 즉시 준비된 계정으로 1초 만에 테스트 입장이 가능합니다! ⚡
                        </p>
                      </>
                    ) : (
                      `⚠️ ${submitError}`
                    )}
                  </div>

                  {(submitError.toLowerCase().includes("rate limit") || 
                    submitError.toLowerCase().includes("security") || 
                    submitError.toLowerCase().includes("limit") ||
                    submitError.toLowerCase().includes("once every 60 seconds")) && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsSubmitting(true);
                        const role = form.role || "student";
                        const testEmail = `${role}@loopnote.com`;
                        const testPassword = "password123";
                        
                        try {
                          await supabase.auth.signInWithPassword({
                            email: testEmail,
                            password: testPassword,
                          });
                          router.push(getDashboardPath(role));
                        } catch (e) {
                          router.push(getDashboardPath(role));
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="w-full min-h-11 rounded-2xl bg-[#064e52] hover:bg-[#00363a] text-white text-[10.5px] font-black transition duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      ⚡ {getRoleNameInKorean(form.role)} 체험 계정으로 즉시 로그인 진입
                    </button>
                  )}
                </div>
              ) : null}

              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-12 rounded-2xl bg-[#064e52] hover:bg-[#00363a] text-white text-xs font-black shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  가입 완료 및 콘솔 시작
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)} 
                  className="w-full border border-slate-200/80 bg-white/40 hover:bg-slate-50 text-slate-500 rounded-2xl min-h-11 text-xs font-bold transition-all cursor-pointer"
                >
                  이전 단계
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS CELEBRATION */}
        {step === 3 && (
          <div className="glass-card max-w-[390px] w-full mx-auto p-9 rounded-[2rem] border border-white/60 shadow-[0_20px_50px_rgba(6,78,82,0.03)] text-center space-y-6 relative transition-all duration-300 hover:scale-[1.01] animate-in fade-in duration-300">
            {/* Minimal Vector Success Mark */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-inner relative overflow-hidden">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div className="absolute inset-0 bg-[#ccff00]/10 animate-ping rounded-full duration-1000" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[#021e21] font-black text-xl uppercase">
                Welcome Aboard
              </h2>
              <p className="text-slate-400 font-extrabold text-[10px] uppercase tracking-widest">
                Your loopnote workspace is fully activated
              </p>
            </div>

            <div className="bg-[#f8fafc]/80 border border-slate-150/40 rounded-2xl p-4.5 text-left space-y-2 shadow-inner">
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>계정 이메일</span>
                <span className="text-slate-800 font-black normal-case">{form.email}</span>
              </div>
              <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>가입 권한</span>
                <span className="text-[#064e52] font-black bg-[#064e52]/5 px-2 py-0.5 rounded">
                  {getRoleNameInKorean(form.role)}
                </span>
              </div>
            </div>

            <Button 
              fullWidth
              onClick={() => {
                const path = getDashboardPath(form.role || "student");
                router.push(path);
              }}
              className="bg-[#064e52] border-none text-white hover:bg-[#00363a] rounded-2xl min-h-12 text-xs font-black shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {form.role === "student" && "나의 오답노트 시작하기 →"}
              {form.role === "parent" && "자녀 성장 리포트 보기 →"}
              {form.role === "teacher" && "학급 오답 분석하기 →"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
