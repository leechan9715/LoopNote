"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, updateProfileName } from "@/services/data";
import { createBrowserSupabaseClient } from "@/services/supabase";

function readMetadataName(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading, logout, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [fullName, setFullName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [missionAlertsEnabled, setMissionAlertsEnabled] = useState(true);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);
      setProfileError(null);

      try {
        const profile = await getUserProfile(supabase, user.id);

        if (!isMounted) {
          return;
        }

        setFullName(profile?.fullName ?? readMetadataName(user.user_metadata.full_name));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "프로필을 불러오지 못했습니다.";
        setProfileError(message);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, user?.user_metadata.full_name]);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFullName = fullName.trim();
    setProfileError(null);
    setProfileMessage(null);

    if (!user?.id) {
      setProfileError("로그인이 필요합니다.");
      return;
    }

    if (!nextFullName) {
      setProfileError("이름을 입력해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const nextProfile = await updateProfileName(supabase, user.id, nextFullName);
      await supabase.auth.updateUser({
        data: {
          full_name: nextProfile.fullName,
        },
      });
      setFullName(nextProfile.fullName);
      setProfileMessage("프로필 이름을 저장했습니다.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "프로필을 저장하지 못했습니다.";
      setProfileError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await logout();
    setIsLoggingOut(false);

    if (error) {
      setProfileError(error.message);
      return;
    }

    router.push("/login");
  };

  const backPath = user?.user_metadata?.role === "parent" ? "/parent" : "/";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
            href={backPath}
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="p" className="font-black text-sky-700" variant="caption">
            Settings
          </Typography>
          <Typography as="h1" className="mt-2 text-slate-950" variant="h1">
            설정
          </Typography>
          <Typography as="p" className="mt-3 text-slate-600" variant="body">
            프로필과 알림, 로그인 상태를 관리합니다.
          </Typography>
        </section>

        {!isAuthenticated && !isAuthLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
            <Typography as="h2" className="text-slate-950" variant="h2">
              로그인이 필요합니다.
            </Typography>
            <Typography as="p" className="mt-2 text-slate-600" variant="body">
              로그인 후 프로필과 알림 설정을 변경할 수 있습니다.
            </Typography>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            개인 프로필
          </Typography>
          <form className="mt-5 space-y-4" noValidate onSubmit={handleProfileSubmit}>
            <Input
              disabled={!isAuthenticated || isProfileLoading}
              label="이름"
              name="full_name"
              onChange={(event) => {
                setFullName(event.target.value);
              }}
              placeholder="이름"
              required
              value={fullName}
            />

            {profileError ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800" role="alert">
                {profileError}
              </div>
            ) : null}
            {profileMessage ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800" role="status">
                {profileMessage}
              </div>
            ) : null}

            <Button
              disabled={!isAuthenticated}
              isLoading={isSaving}
              type="submit"
            >
              이름 저장
            </Button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            알림 설정
          </Typography>
          <div className="mt-5 space-y-3">
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span>
                <span className="block text-base font-extrabold text-slate-900">
                  미션 시작/완료 알림
                </span>
                <span className="block text-sm font-semibold text-slate-600">
                  자녀의 주요 활동을 알려드립니다.
                </span>
              </span>
              <input
                checked={missionAlertsEnabled}
                className="h-6 w-6 accent-emerald-500"
                onChange={(event) => {
                  setMissionAlertsEnabled(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
            <label className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span>
                <span className="block text-base font-extrabold text-slate-900">
                  주간 리포트 알림
                </span>
                <span className="block text-sm font-semibold text-slate-600">
                  매주 회복 흐름 요약을 받을 수 있습니다.
                </span>
              </span>
              <input
                checked={weeklyReportEnabled}
                className="h-6 w-6 accent-indigo-500"
                onChange={(event) => {
                  setWeeklyReportEnabled(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-rose-100 bg-rose-50 px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-rose-950" variant="h2">
            세션
          </Typography>
          <Typography as="p" className="mt-2 text-rose-900" variant="body">
            공용 기기에서는 사용 후 로그아웃해 주세요.
          </Typography>
          <Button
            className="mt-5 border-rose-200 text-rose-800"
            disabled={!isAuthenticated}
            isLoading={isLoggingOut}
            onClick={handleLogout}
            variant="outline"
          >
            로그아웃
          </Button>
        </section>
      </div>
    </main>
  );
}
