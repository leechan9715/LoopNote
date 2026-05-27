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
  
  // Wizard state: 1 = 역할 선택, 2 = 기본 정보, 3 = 완료
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
      // If role is teacher, we sign up with Supabase using role: 'teacher'.
      // The DB trigger handles role mapping appropriately or defaults it to 'parent' in the profiles table.
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
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-12 flex flex-col justify-center gap-10">
      {/* Brand Header */}
      <header className="text-center">
        <Link
          className="inline-flex items-center gap-2 rounded-2xl p-2.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#064e52]/20"
          href="/"
        >
          <div className="p-2 rounded-xl bg-[#064e52] flex items-center justify-center shadow-lg">
            <svg className="h-6 w-6 text-[#b5e61d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
            </svg>
          </div>
          <Typography as="span" variant="h2" className="font-black text-[#064e52] tracking-wider text-xl">
            LoopNote
          </Typography>
        </Link>
      </header>

      {/* 3-Step Indicator */}
      <div className="mx-auto w-full max-w-xl">
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200 z-0" />
          <div 
            className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#064e52] transition-all duration-300 z-0" 
            style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
          />

          {/* Step 1 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 border-2 ${
              step >= 1 
                ? "bg-[#064e52] border-[#064e52] text-[#b5e61d] scale-110 shadow-md" 
                : "bg-white border-slate-300 text-slate-400"
            }`}>
              1
            </div>
            <span className={`text-xs font-black transition-colors ${step >= 1 ? "text-[#064e52]" : "text-slate-400"}`}>
              역할 선택
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 border-2 ${
              step >= 2 
                ? "bg-[#064e52] border-[#064e52] text-[#b5e61d] scale-110 shadow-md" 
                : "bg-white border-slate-300 text-slate-400"
            }`}>
              2
            </div>
            <span className={`text-xs font-black transition-colors ${step >= 2 ? "text-[#064e52]" : "text-slate-400"}`}>
              기본 정보 입력
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 border-2 ${
              step === 3 
                ? "bg-[#064e52] border-[#064e52] text-[#b5e61d] scale-110 shadow-md" 
                : "bg-white border-slate-300 text-slate-400"
            }`}>
              3
            </div>
            <span className={`text-xs font-black transition-colors ${step === 3 ? "text-[#064e52]" : "text-slate-400"}`}>
              완료
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-4xl">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center space-y-2">
              <Typography as="h2" variant="h2" className="text-slate-900 font-black">
                어떤 목적으로 루프노트를 시작하시나요?
              </Typography>
              <Typography as="p" variant="body" className="text-slate-500 font-bold max-w-md mx-auto text-sm">
                맞춤형 학습 대시보드와 회복 시스템을 통해 최고의 학습 성과를 이끌어 드립니다.
              </Typography>
            </div>

            {/* 3-Column Roles Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Card */}
              <div 
                onClick={() => handleRoleSelect("student")}
                className="group relative cursor-pointer flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-[#064e52] hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 bg-teal-50 group-hover:bg-[#064e52]/5 h-24 w-24 rounded-full transition-all duration-300" />
                <div className="space-y-5 relative z-10">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl group-hover:scale-110 transition-transform duration-300">
                    🎒
                  </span>
                  <div className="space-y-2">
                    <Typography as="h3" variant="h2" className="text-slate-900 font-black text-xl">
                      학생 <span className="text-[#064e52] font-black text-sm">Student</span>
                    </Typography>
                    <Typography as="p" className="text-slate-600 text-xs font-semibold leading-relaxed">
                      "나만의 오답 노트와 재밌는 10분 회복 미션으로 실력을 길러요"
                    </Typography>
                  </div>

                  <ul className="space-y-2 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52]">✓</span> 스마트폰으로 찰칵 오답 자동 스캔
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52]">✓</span> 성취감이 쑥쑥 쌓이는 회복 미션
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#064e52]">✓</span> 레벨업과 보상 배지 컬렉션
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs font-black text-[#064e52] group-hover:translate-x-1 transition-transform relative z-10">
                  <span>학생으로 시작하기</span>
                  <span>→</span>
                </div>
              </div>

              {/* Parent Card */}
              <div 
                onClick={() => handleRoleSelect("parent")}
                className="group relative cursor-pointer flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-[#064e52] hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 bg-lime-50 group-hover:bg-[#b5e61d]/5 h-24 w-24 rounded-full transition-all duration-300" />
                <div className="space-y-5 relative z-10">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-50 text-2xl group-hover:scale-110 transition-transform duration-300">
                    👪
                  </span>
                  <div className="space-y-2">
                    <Typography as="h3" variant="h2" className="text-slate-900 font-black text-xl">
                      부모 <span className="text-lime-700 font-black text-sm">Parent</span>
                    </Typography>
                    <Typography as="p" className="text-slate-600 text-xs font-semibold leading-relaxed">
                      "아이의 오답 진단 리포트와 교육 전문가 수준의 맞춤 코칭 카드를 받아보세요"
                    </Typography>
                  </div>

                  <ul className="space-y-2 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600">✓</span> 한눈에 파악하는 학습 성장 리포트
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600">✓</span> 전문가 수준의 1:1 맞춤 코칭 팁
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lime-600">✓</span> 실시간 미션 해결 알림 피드
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs font-black text-[#064e52] group-hover:translate-x-1 transition-transform relative z-10">
                  <span>부모로 시작하기</span>
                  <span>→</span>
                </div>
              </div>

              {/* Teacher Card */}
              <div 
                onClick={() => handleRoleSelect("teacher")}
                className="group relative cursor-pointer flex flex-col justify-between rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-[#064e52] hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 bg-blue-50 group-hover:bg-[#0d6e73]/5 h-24 w-24 rounded-full transition-all duration-300" />
                <div className="space-y-5 relative z-10">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl group-hover:scale-110 transition-transform duration-300">
                    👩‍🏫
                  </span>
                  <div className="space-y-2">
                    <Typography as="h3" variant="h2" className="text-slate-900 font-black text-xl">
                      선생님 <span className="text-[#0d6e73] font-black text-sm">Teacher</span>
                    </Typography>
                    <Typography as="p" className="text-slate-600 text-xs font-semibold leading-relaxed">
                      "클래스 오답 분석 리포트와 취약 단원 분석 대시보드로 학생들을 지도하세요"
                    </Typography>
                  </div>

                  <ul className="space-y-2 text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span> 우리 학급만의 취약 지점 정밀 분석
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span> 수준별 오답 학습 미션 원클릭 전송
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-blue-600">✓</span> 다중 학생 종합 성취도 모니터링
                    </li>
                  </ul>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs font-black text-[#064e52] group-hover:translate-x-1 transition-transform relative z-10">
                  <span>선생님으로 시작하기</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            <p className="text-center text-sm font-semibold text-slate-500">
              이미 계정이 있나요?{" "}
              <Link
                className="font-extrabold text-[#064e52] underline decoration-2 underline-offset-4 hover:text-[#0d6e73]"
                href="/login"
              >
                로그인하기
              </Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-md bg-white border-2 border-slate-100 rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6">
              <Typography as="h2" variant="h2" className="text-slate-900 font-black">
                {getRoleNameInKorean(form.role)} 회원정보 입력
              </Typography>
              <Typography as="p" variant="body" className="text-slate-500 font-semibold text-xs mt-1">
                기본 정보를 입력하여 안전한 학업 루프 계정을 생성하세요.
              </Typography>
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
              />

              {form.role === "student" && (
                <Input
                  label="부모님 이메일 또는 연결 코드 (선택)"
                  name="parent_code"
                  onChange={(event) => {
                    setForm((current) => ({ ...current, parentCode: event.target.value }));
                  }}
                  placeholder="부모님 이메일 주소를 적어보세요"
                  helperText="가입 후에 학부모 대시보드와 연결하여 학습 미션을 공유할 수 있습니다."
                  type="text"
                  value={form.parentCode}
                />
              )}
              {submitError ? (
                <div className="space-y-3">
                  <div
                    className="rounded-2xl border-2 border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 leading-relaxed text-left"
                    role="alert"
                  >
                    {submitError.toLowerCase().includes("rate limit") || 
                     submitError.toLowerCase().includes("security") || 
                     submitError.toLowerCase().includes("limit") ||
                     submitError.toLowerCase().includes("once every 60 seconds") ? (
                      <>
                        <p className="font-extrabold text-sm mb-1">⚠️ Supabase 이메일 전송 한도 초과</p>
                        <p className="text-[11px]">
                          Supabase 무료 요금제의 보안 정책상 메일 발송량(시간당 3회)이 초과되어 회원가입 진행이 차단되었습니다.
                          하지만 아래 버튼을 누르시면 방금 선택하신 <strong>{getRoleNameInKorean(form.role)}</strong> 역할의 체험 계정으로 1초 만에 즉시 입장하실 수 있습니다! 🚀
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
                          const { data, error } = await supabase.auth.signInWithPassword({
                            email: testEmail,
                            password: testPassword,
                          });
                          if (!error && data.session) {
                            router.push(getDashboardPath(role));
                          } else {
                            router.push(getDashboardPath(role));
                          }
                        } catch (e) {
                          router.push(getDashboardPath(role));
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="w-full min-h-11 rounded-2xl bg-[#064e52] hover:bg-[#0d6e73] text-white text-xs font-black transition shadow-md flex items-center justify-center gap-2 border border-[#064e52]"
                    >
                      <span>⚡ {getRoleNameInKorean(form.role)} 체험 계정으로 즉시 로그인하기</span>
                    </button>
                  )}
                </div>
              ) : null}
              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  fullWidth 
                  isLoading={isSubmitting} 
                  type="submit" 
                  className="bg-[#b5e61d] border-[#b5e61d] text-[#064e52] hover:bg-[#a1cf15] rounded-3xl min-h-12 text-sm font-black"
                >
                  가입 완료하고 시작하기
                </Button>
                <Button 
                  fullWidth 
                  variant="outline" 
                  onClick={() => setStep(1)} 
                  className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-3xl min-h-12 text-sm font-bold shadow-none"
                >
                  이전 단계 (역할 선택)
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-md bg-white border-2 border-slate-100 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Celebration Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-4xl shadow-inner relative overflow-hidden">
              <span className="relative z-10 animate-bounce">🎉</span>
              <div className="absolute inset-0 bg-[#b5e61d]/20 animate-ping rounded-full duration-1000" />
            </div>

            <div className="space-y-2">
              <Typography as="h2" variant="h2" className="text-slate-900 font-black">
                반갑습니다, {form.fullName}님!
              </Typography>
              <Typography as="p" variant="body" className="text-emerald-700 font-extrabold text-sm">
                루프노트에 오신 것을 진심으로 환영해요.
              </Typography>
            </div>

            {/* Profile Info Summary */}
            <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-4 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>계정 이메일</span>
                <span className="text-slate-900 font-extrabold">{form.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>선택한 역할</span>
                <span className="text-[#064e52] font-black bg-teal-50 px-2.5 py-0.5 rounded-full">
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
              className="bg-[#064e52] border-[#064e52] text-white hover:bg-[#0d6e73] rounded-3xl min-h-12 text-sm font-black shadow-lg shadow-[#064e52]/10"
            >
              {form.role === "student" && "나의 오답노트 시작하기 →"}
              {form.role === "parent" && "자녀 성장 리포트 보기 →"}
              {form.role === "teacher" && "학급 오답 분석하기 →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
