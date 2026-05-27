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
      alert("체험용 계정에서는 자녀 등록 및 새 계정 생성이 제한됩니다. 로그인 후 실제 자녀 계정을 연동해 보세요! 👪");
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

      // 중복 추가 방지 필터 후 업데이트
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm lg:px-7">
        <Typography as="p" className="font-black text-indigo-700" variant="caption">
          Children
        </Typography>
        <Typography as="h1" className="mt-2 text-slate-950" variant="h1">
          자녀 관리
        </Typography>
        <Typography as="p" className="mt-3 max-w-2xl text-slate-600" variant="body">
          자녀 전용 계정을 새로 만들어 학부모 계정에 연동하거나, 이미 가입된 자녀의 계정을 가져와 연결합니다.
        </Typography>
      </section>

      {!isAuthenticated && !isAuthLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            로그인이 필요합니다.
          </Typography>
          <Typography as="p" className="mt-2 text-slate-600" variant="body">
            학부모 계정으로 로그인하면 자녀 계정을 연동하거나 추가할 수 있습니다.
          </Typography>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <Typography as="h2" className="text-slate-950" variant="h2">
              자녀 연결하기
            </Typography>
            {/* 신규 생성 및 기존 연동 탭 스위처 */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => {
                  setMode("create");
                  setErrors({});
                  setSubmitError(null);
                  setSuccessMessage(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  mode === "create"
                    ? "bg-[#064e52] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  mode === "link"
                    ? "bg-[#064e52] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                기존 계정 연동
              </button>
            </div>
          </div>

          <Typography as="p" className="text-xs text-slate-500 font-bold mb-4">
            {mode === "create"
              ? "학습 전용 자녀 계정을 새로 만들어 학부모 대시보드에 즉시 연동합니다."
              : "학생이 이미 직접 가입한 이메일을 입력하여 내 자녀로 연동을 진행합니다."}
          </Typography>

          <form className="mt-2 space-y-4" noValidate onSubmit={handleSubmit}>
            {mode === "create" && (
              <Input
                autoComplete="name"
                errorMessage={errors.fullName}
                label="자녀 이름"
                name="child_full_name"
                onChange={(event) => {
                  setForm((current) => ({ ...current, fullName: event.target.value }));
                }}
                placeholder="김루프"
                required
                value={form.fullName}
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
              />
            )}

            {submitError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800" role="alert">
                {submitError}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800" role="status">
                {successMessage}
              </div>
            ) : null}

            <Button
              disabled={!isAuthenticated || !session?.access_token}
              fullWidth
              isLoading={isSubmitting}
              type="submit"
            >
              {mode === "create" ? "자녀 계정 만들기" : "자녀 계정 연동하기"}
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <Typography as="h2" className="text-slate-950" variant="h2">
              연결된 자녀
            </Typography>
            <Typography as="p" className="font-black text-slate-500" variant="caption">
              {activeChildren.length}명
            </Typography>
          </div>

          {isLoading ? (
            <Typography as="p" className="mt-5 text-slate-600" variant="body">
              자녀 목록을 불러오고 있습니다.
            </Typography>
          ) : dataError ? (
            <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
              <Typography as="p" className="font-bold text-rose-800" variant="body">
                {dataError}
              </Typography>
              <Button
                className="mt-3"
                onClick={() => {
                  setReloadKey((key) => key + 1);
                }}
                size="sm"
                variant="outline"
              >
                다시 불러오기
              </Button>
            </div>
          ) : activeChildren.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {activeChildren.map((child) => (
                <li
                  className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4"
                  key={child.id}
                >
                  <Typography as="p" className="font-black text-slate-950" variant="body">
                    {child.name}
                  </Typography>
                  <Typography as="p" className="mt-1 text-slate-600" variant="caption">
                    연결일 {new Date(child.createdAt).toLocaleDateString("ko-KR")}
                  </Typography>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-5">
              <Typography as="p" className="text-indigo-900" variant="body">
                아직 연결된 자녀가 없습니다. 첫 자녀 계정을 연결해 보세요.
              </Typography>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
