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

function validateChildForm(form: ChildFormState): ChildFormErrors {
  const errors: ChildFormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "자녀 이름을 입력해 주세요.";
  }

  if (!form.email.trim()) {
    errors.email = "자녀 로그인 이메일을 입력해 주세요.";
  }

  if (!form.password) {
    errors.password = "자녀 비밀번호를 입력해 주세요.";
  } else if (form.password.length < 6) {
    errors.password = "비밀번호는 6자 이상이어야 합니다.";
  }

  return errors;
}

export default function ParentChildrenPage() {
  const { isAuthenticated, isLoading: isAuthLoading, session, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [children, setChildren] = useState<ParentChildProfile[]>([]);
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

    const nextErrors = validateChildForm(form);
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
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        parentId: user.id,
        password: form.password,
      });

      setChildren((current) => [...current, child]);
      setForm(initialChildForm);
      setSuccessMessage(`${child.name} 계정을 연결했습니다.`);
      setReloadKey((key) => key + 1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "자녀 계정을 추가하지 못했습니다.";
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
          자녀 전용 계정을 만들고 학부모 계정에 연결합니다.
        </Typography>
      </section>

      {!isAuthenticated && !isAuthLoading ? (
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            로그인이 필요합니다.
          </Typography>
          <Typography as="p" className="mt-2 text-slate-600" variant="body">
            학부모 계정으로 로그인하면 자녀 계정을 추가할 수 있습니다.
          </Typography>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            자녀 추가하기
          </Typography>
          <form className="mt-5 space-y-4" noValidate onSubmit={handleSubmit}>
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
              자녀 계정 만들기
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
                아직 연결된 자녀가 없습니다. 첫 자녀 계정을 만들어 보세요.
              </Typography>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
