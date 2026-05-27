"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { getStudentMissionList } from "@/services/data";
import type { StudentMissionListItem } from "@/services/data";
import { createBrowserSupabaseClient } from "@/services/supabase";

const progressWidthClassNames = [
  "w-0",
  "w-1/12",
  "w-2/12",
  "w-3/12",
  "w-4/12",
  "w-5/12",
  "w-6/12",
  "w-7/12",
  "w-8/12",
  "w-9/12",
  "w-10/12",
  "w-11/12",
  "w-full",
] as const;

function getProgressWidthClassName(progressPercent: number) {
  const normalizedPercent = Math.min(Math.max(progressPercent, 0), 100);
  const widthIndex = Math.round(normalizedPercent / 8.333);

  return progressWidthClassNames[widthIndex] ?? "w-full";
}

function MissionCard({ mission }: { mission: StudentMissionListItem }) {
  const progressLabel = mission.isCompleted
    ? "모든 단계를 완료했어요."
    : `${mission.currentStep}/${mission.totalSteps}단계 진행 중`;
  const progressWidthClassName = getProgressWidthClassName(mission.progressPercent);

  return (
    <Link
      className="block rounded-3xl border-2 border-sky-100 bg-white px-4 py-4 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
      href={`/missions/${mission.id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "rounded-full border-2 px-3 py-1 text-xs font-extrabold",
            mission.status === "resolved"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {mission.statusLabel}
        </span>
        <span className="text-sm font-bold text-slate-500">
          회복 에너지 {mission.isCompleted ? "획득" : "도전 중"}
        </span>
      </div>

      <Typography as="p" variant="body" className="mt-3 font-extrabold text-slate-950">
        {mission.title}
      </Typography>
      <Typography as="p" variant="caption" className="mt-1 text-slate-600">
        {mission.concept}
      </Typography>

      <div className="mt-4" aria-label={progressLabel}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <Typography as="span" variant="caption" className="font-extrabold text-slate-700">
            {progressLabel}
          </Typography>
          <Typography as="span" variant="caption" className="font-extrabold text-slate-500">
            {mission.progressPercent}%
          </Typography>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className={["h-full rounded-full bg-emerald-400", progressWidthClassName].join(" ")} />
        </div>
      </div>
    </Link>
  );
}

export default function MissionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [missions, setMissions] = useState<StudentMissionListItem[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const loadMissions = async () => {
      setIsDataLoading(true);
      setDataError(null);

      try {
        const nextMissions = await getStudentMissionList(supabase, user.id);

        if (!isMounted) {
          return;
        }

        setMissions(nextMissions);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "미션 목록을 불러오지 못했어요.";
        setDataError(message);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    };

    void loadMissions();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, supabase, user?.id]);

  const activeMissions = user?.id ? missions : [];
  const activeDataError = user?.id ? dataError : null;
  const recoveringMissions = activeMissions.filter(
    (mission) => mission.status === "recovering"
  );
  const resolvedMissions = activeMissions.filter(
    (mission) => mission.status === "resolved"
  );
  const isLoading = isAuthLoading || (Boolean(user?.id) && isDataLoading);

  return (
    <div className="flex min-h-full flex-col gap-6">
      <section className="rounded-3xl border-2 border-amber-100 bg-amber-50 px-5 py-6">
        <Typography as="p" variant="caption" className="font-extrabold text-amber-800">
          회복 미션
        </Typography>
        <Typography as="h1" variant="h1" className="mt-2 text-slate-950">
          미션 목록
        </Typography>
        <Typography as="p" variant="body" className="mt-3 text-slate-700">
          진행 중인 미션과 완료한 미션을 한눈에 확인해요.
        </Typography>
      </section>

      {activeDataError ? (
        <section className="rounded-3xl border-2 border-rose-100 bg-rose-50 px-4 py-5">
          <Typography as="p" variant="body" className="font-bold text-rose-800">
            {activeDataError}
          </Typography>
          <Button
            className="mt-4"
            onClick={() => {
              setReloadKey((key) => key + 1);
            }}
            size="sm"
            variant="outline"
          >
            다시 불러오기
          </Button>
        </section>
      ) : null}

      {isLoading ? (
        <section className="rounded-3xl border-2 border-slate-100 bg-slate-50 px-4 py-5">
          <Typography as="p" variant="body" className="text-slate-600">
            미션 목록을 불러오고 있어요.
          </Typography>
        </section>
      ) : !isAuthenticated ? (
        <section className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-5">
          <Typography as="p" variant="body" className="text-sky-900">
            로그인하면 내 회복 미션이 진행 상태별로 표시됩니다.
          </Typography>
          <Link
            className="mt-4 inline-flex min-h-10 items-center rounded-full border-2 border-sky-300 bg-white px-4 text-sm font-extrabold text-sky-800 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
            href="/login"
          >
            로그인하기
          </Link>
        </section>
      ) : activeMissions.length === 0 ? (
        <section className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-5">
          <Typography as="p" variant="body" className="text-sky-900">
            아직 생성된 미션이 없어요. 오답을 스캔하면 회복 미션이 이곳에 생깁니다.
          </Typography>
        </section>
      ) : (
        <>
          <section aria-labelledby="recovering-missions" className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <Typography
                as="h2"
                id="recovering-missions"
                variant="h2"
                className="text-slate-950"
              >
                진행 중
              </Typography>
              <Typography as="p" variant="caption" className="font-extrabold text-slate-500">
                {recoveringMissions.length}개
              </Typography>
            </div>
            {recoveringMissions.length > 0 ? (
              <ul className="space-y-3">
                {recoveringMissions.map((mission) => (
                  <li key={mission.id}>
                    <MissionCard mission={mission} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-4 py-5">
                <Typography as="p" variant="body" className="text-emerald-900">
                  지금 진행 중인 미션은 없어요.
                </Typography>
              </div>
            )}
          </section>

          <section aria-labelledby="resolved-missions" className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <Typography
                as="h2"
                id="resolved-missions"
                variant="h2"
                className="text-slate-950"
              >
                완료
              </Typography>
              <Typography as="p" variant="caption" className="font-extrabold text-slate-500">
                {resolvedMissions.length}개
              </Typography>
            </div>
            {resolvedMissions.length > 0 ? (
              <ul className="space-y-3">
                {resolvedMissions.map((mission) => (
                  <li key={mission.id}>
                    <MissionCard mission={mission} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-5">
                <Typography as="p" variant="body" className="text-sky-900">
                  완료한 미션은 아직 없어요. 한 단계씩 회복해 봐요.
                </Typography>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
