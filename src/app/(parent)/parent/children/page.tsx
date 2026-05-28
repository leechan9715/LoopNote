"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import {
  addChildProfile,
  getParentChildren,
  type ParentChildProfile,
} from "@/services/data";
import { createBrowserSupabaseClient } from "@/services/supabase";

type ChildFormState = {
  email: string;
  fullName: string;
  password: string;
};

type ChildFormErrors = Partial<Record<keyof ChildFormState, string>>;

const initialChildForm: ChildFormState = {
  email: "",
  fullName: "",
  password: "",
};

// ─── SVG 벡터 아이콘 ───────────────────────────────────────────
const Icons = {
  Alert: () => (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  UserAdd: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235A8.91 8.91 0 019 18a8.91 8.91 0 015 1.235A17.92 17.92 0 019 20.25a17.92 17.92 0 01-5-1.015z" />
    </svg>
  ),
  Link: () => (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  Spinner: () => (
    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  Reload: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
};

function validateChildForm(form: ChildFormState, mode: "create" | "link"): ChildFormErrors {
  const errors: ChildFormErrors = {};

  if (mode === "create" && !form.fullName.trim()) {
    errors.fullName = "자녀 이름을 입력해 주세요.";
  }

  if (!form.email.trim()) {
    errors.email = "자녀 로그인 이메일을 입력해 주세요.";
  }

  if (mode === "create") {
    if (!form.password) {
      errors.password = "자녀 비밀번호를 입력해 주세요.";
    } else if (form.password.length < 6) {
      errors.password = "비밀번호는 6자 이상이어야 합니다.";
    }
  }

  return errors;
}

export default function ParentChildrenPage() {
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const isDemoParent = !isAuthenticated || (user && user.email === "parent@loopnote.com");
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [children, setChildren] = useState<ParentChildProfile[]>([]);
  const [mode, setMode] = useState<"create" | "link">("create");
  const [form, setForm] = useState<ChildFormState>(initialChildForm);
  const [errors, setErrors] = useState<ChildFormErrors>({});
  const [dataError, setDataError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const loadChildren = async () => {
      setIsDataLoading(true);
      setDataError(null);

      try {
        const nextChildren = await getParentChildren(supabase, user.id);

        if (!isMounted) {
          return;
        }

        setChildren(nextChildren);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "자녀 목록을 불러오지 못했습니다.";
        setDataError(message);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    };

    void loadChildren();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, supabase, user?.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isDemoParent) {
      alert("체험용 계정에서는 자녀 등록 및 새 계정 생성이 제한됩니다. 로그인 후 실제 자녀 계정을 연동해 보세요!");
      return;
    }

    const nextErrors = validateChildForm(form, mode);
    setErrors(nextErrors);
    setSubmitError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0 || !user?.id || !session?.access_token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const child = await addChildProfile({
        accessToken: session.access_token,
        action: mode,
        email: form.email.trim(),
        fullName: mode === "create" ? form.fullName.trim() : undefined,
        parentId: user.id,
        password: mode === "create" ? form.password : undefined,
      });

      setChildren((current) => {
        const filtered = current.filter((c) => c.id !== child.id);
        return [...filtered, child];
      });
      setForm(initialChildForm);
      
      if (mode === "create") {
        setSuccessMessage(`${child.name} 계정을 생성하고 연결했습니다.`);
      } else {
        setSuccessMessage(`${child.name} 학생 계정을 내 자녀로 성공적으로 연동했습니다.`);
      }
      
      setReloadKey((key) => key + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "자녀 계정을 처리하지 못했습니다.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeChildren = user?.id ? children : [];
  const isLoading = isAuthLoading || (Boolean(user?.id) && isDataLoading);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16 font-sans">
      
      {/* Header Banner */}
      <section className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-lime/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="space-y-2.5">
          <Typography as="p" className="font-bold text-brand-teal/70 uppercase tracking-widest mb-1" variant="caption">
            Children Profile Linkage
          </Typography>
          <Typography as="h1" className="text-brand-teal font-extrabold text-2xl tracking-tight uppercase" variant="h1">
            자녀 관리 및 연동 설정
          </Typography>
          <Typography as="p" className="text-slate-400 font-semibold text-[11px] leading-relaxed max-w-xl" variant="body">
            자녀 계정을 새로 만들어 학부모 대시보드에 즉시 연동하거나, 가입된 자녀의 계정을 가져와 실시간 오답 성장을 추적합니다.
          </Typography>
        </div>
      </section>

      {!isAuthenticated && !isAuthLoading ? (
        <section className="glass-card rounded-[2.5rem] p-8 border border-rose-500/10 bg-rose-550/5">
          <Typography as="h2" className="text-rose-500 font-extrabold text-sm uppercase tracking-widest" variant="h2">
            Authentication Required
          </Typography>
          <Typography as="p" className="mt-2 text-slate-400 text-xs font-semibold leading-relaxed" variant="body">
            자녀 계정 관리 및 신규 발급 연동을 시작하기 위해 학부모 계정으로 로그인해 주세요.
          </Typography>
        </section>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        
        {/* Child linking form widget */}
        <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-4">
            <Typography as="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest" variant="h2">
              자녀 연결하기
            </Typography>
            
            {/* Tab Swapper */}
            <div className="flex bg-[#064e52]/5 p-1 rounded-xl border border-slate-150 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setErrors({});
                  setSubmitError(null);
                  setSuccessMessage(null);
                }}
                className={`px-4 py-2 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                  mode === "create"
                    ? "bg-brand-teal text-white shadow-sm"
                    : "text-brand-teal/70 hover:text-brand-teal"
                }`}
              >
                새 계정 만들기
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("link");
                  setErrors({});
                  setSubmitError(null);
                  setSuccessMessage(null);
                }}
                className={`px-4 py-2 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                  mode === "link"
                    ? "bg-brand-teal text-white shadow-sm"
                    : "text-brand-teal/70 hover:text-brand-teal"
                }`}
              >
                기존 계정 연동
              </button>
            </div>
          </div>

          <Typography as="p" className="text-[11px] text-slate-400 font-semibold leading-relaxed">
            {mode === "create"
              ? "학습 전용 자녀 계정을 새로 만들어 학부모 대시보드에 즉시 연동합니다."
              : "학생이 이미 직접 가입한 이메일을 입력하여 내 자녀로 연동을 진행합니다."}
          </Typography>

          <form className="space-y-5 pt-1" noValidate onSubmit={handleSubmit}>
            {mode === "create" && (
              <Input
                autoComplete="name"
                errorMessage={errors.fullName}
                label="자녀 이름"
                name="child_full_name"
                onChange={(event) => {
                  setForm((current) => ({ ...current, fullName: event.target.value }));
                }}
                placeholder="김지우"
                required
                value={form.fullName}
                className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:border-brand-teal/50 shadow-sm transition-all"
              />
            )}
            <Input
              autoComplete="email"
              errorMessage={errors.email}
              inputMode="email"
              label="자녀 로그인 이메일"
              name="child_email"
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }));
              }}
              placeholder="child@example.com"
              required
              type="email"
              value={form.email}
              className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:border-brand-teal/50 shadow-sm transition-all"
            />
            {mode === "create" && (
              <Input
                autoComplete="new-password"
                errorMessage={errors.password}
                helperText="6자 이상 입력해 주세요."
                label="자녀 비밀번호"
                name="child_password"
                onChange={(event) => {
                  setForm((current) => ({ ...current, password: event.target.value }));
                }}
                required
                type="password"
                value={form.password}
                className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:border-brand-teal/50 shadow-sm transition-all"
              />
            )}

            {submitError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-500/5 px-4.5 py-3.5 text-xs font-bold text-rose-550 flex items-center gap-2" role="alert">
                <Icons.Alert />
                <span>{submitError}</span>
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-500/5 px-4.5 py-3.5 text-xs font-bold text-emerald-600" role="status">
                {successMessage}
              </div>
            ) : null}

            <button
              disabled={!isAuthenticated || !session?.access_token || isSubmitting}
              type="submit"
              className="w-full min-h-12 rounded-2xl bg-brand-teal hover:bg-brand-teal-dark disabled:bg-slate-200 text-white font-extrabold text-xs shadow-md transition duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icons.Spinner />
                  <span>처리하는 중...</span>
                </>
              ) : (
                <span className="flex items-center">
                  {mode === "create" ? <Icons.UserAdd /> : <Icons.Link />}
                  <span>{mode === "create" ? "자녀 계정 생성 및 연결" : "자녀 계정 연동 진행"}</span>
                </span>
              )}
            </button>
          </form>
        </section>

        {/* Connected children list */}
        <section className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-end justify-between border-b border-slate-200/40 pb-4 mb-6">
              <Typography as="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest flex items-center" variant="h2">
                연결된 자녀 리스트
              </Typography>
              <span className="text-[9.5px] font-bold text-brand-teal bg-brand-lime px-2.5 py-1 rounded border border-brand-teal/10 shadow-sm uppercase tracking-wider font-sans">
                Linked: {activeChildren.length}
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-brand-teal border-t-brand-lime animate-spin" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Loading Profiles</span>
              </div>
            ) : dataError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5 flex flex-col gap-3.5">
                <Typography as="p" className="font-bold text-rose-800 text-xs flex items-center gap-2" variant="body">
                  <Icons.Alert />
                  <span>{dataError}</span>
                </Typography>
                <button
                  className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10.5px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                  onClick={() => {
                    setReloadKey((key) => key + 1);
                  }}
                  type="button"
                >
                  <Icons.Reload />
                  <span>다시 불러오기</span>
                </button>
              </div>
            ) : activeChildren.length > 0 ? (
              <ul className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                {activeChildren.map((child) => (
                  <li
                    className="rounded-2xl border border-slate-200 bg-white/50 p-5 hover:scale-[1.005] hover:shadow-sm transition-all duration-200 flex items-center justify-between gap-3"
                    key={child.id}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-lime border border-brand-teal/20" />
                        <Typography as="p" className="font-bold text-slate-800 text-xs tracking-tight" variant="body">
                          {child.name}
                        </Typography>
                      </div>
                      <Typography as="p" className="text-slate-400 text-[9px] font-bold" variant="caption">
                        연결일 {new Date(child.createdAt).toLocaleDateString("ko-KR")}
                      </Typography>
                    </div>
                    <span className="text-[9px] font-bold text-brand-teal bg-brand-teal/5 px-2.5 py-1 rounded">Active</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/40 p-12 flex flex-col items-center justify-center text-center gap-3">
                <span className="text-xs text-slate-450 font-semibold leading-relaxed">
                  아직 연결된 자녀 계정이 존재하지 않습니다.<br />
                  첫 자녀 계정을 연동해 보세요!
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
