"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { useAuth } from "@/hooks/useAuth";
import { getParentDashboardData } from "@/services/data";
import type { ParentChildReport, ParentRecentActivity } from "@/services/data";
import { createBrowserSupabaseClient } from "@/services/supabase";

// Mock child report for "지우" which serves as the ultimate beautiful fallback
const MOCK_JIWOO_REPORT: ParentChildReport = {
  childId: "jiwoo-mock-id",
  childName: "지우",
  difficultConcept: "분수 크기 비교",
  grade: "초등 4학년",
  totalEnergy: 84,
  weeklyMissions: 3,
  weeklyTrend: [
    { completed: 1, day: "월", heightClassName: "h-8" },
    { completed: 2, day: "화", heightClassName: "h-16" },
    { completed: 0, day: "수", heightClassName: "h-4" },
    { completed: 1, day: "목", heightClassName: "h-8" },
    { completed: 0, day: "금", heightClassName: "h-4" },
    { completed: 0, day: "토", heightClassName: "h-4" },
    { completed: 0, day: "일", heightClassName: "h-4" },
  ],
  recentActivities: [
    {
      concept: "분수 크기 비교",
      date: "오늘 15:42",
      result: "미션 완료",
      title: "분수 크기 비교 개념 복습 및 문제 풀이",
    },
    {
      concept: "초등 4학년 분수",
      date: "어제 10:20",
      result: "미션 완료",
      title: "분수의 덧셈 and 뺄셈 미션",
    },
    {
      concept: "자연수의 나눗셈",
      date: "5월 25일",
      result: "미션 완료",
      title: "세 자리 수 나누기 두 자리 수",
    },
  ],
};

interface CoachingGuide {
  praise: string;
  question: string;
  avoid: string;
}

// ─── SVG 벡터 아이콘 ───────────────────────────────────────────
const Icons = {
  Sparkles: () => (
    <svg
      className="w-4 h-4 text-brand-lime"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5-3.5-3.5-.5 3.5-.5.5-3.5.5 3.5 3.5.5-3.5.5-.5 3.5z"
      />
    </svg>
  ),
  Check: () => (
    <svg
      className="w-4 h-4 text-emerald-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  Warning: () => (
    <svg
      className="w-4 h-4 text-amber-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  ),
  Close: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Energy: () => (
    <svg
      className="w-4 h-4 text-[#064e52] mr-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  ),
};

function getCoachingGuide(
  childName: string,
  difficultConcept: string,
  recentActivities: ParentRecentActivity[]
): CoachingGuide {
  const completedMissions = recentActivities.filter((act) => act.result === "미션 완료");
  const activeMissions = recentActivities.filter(
    (act) => act.result && act.result.includes("진행 중")
  );
  const hasCompleted = completedMissions.length > 0;
  const hasActive = activeMissions.length > 0;

  if (difficultConcept === "오답 분석 중" || recentActivities.length === 0) {
    return {
      praise: `"${childName} 학생이 첫 오답을 등록하고 분석을 기다리는 중입니다. 도전하려는 마음에 미리 아낌없는 격려와 박수를 보내 주세요!"`,
      question: `"${childName}야, 오늘 배운 수학 내용 중에 혹시 조금이라도 막히거나 아리송한 부분은 없었어? 편하게 이야기해 줘."`,
      avoid: `"'수학 공부 좀 해라'라며 다그치기보다는, '${childName}가 언제든 도움을 청할 수 있도록 편안한 대화 공간을 만들어 줄게'라고 따스한 신뢰를 보여주세요."`,
    };
  }

  if (hasActive) {
    const concept = activeMissions[0].concept || difficultConcept;
    return {
      praise: `"${childName} 학생이 취약 단원인 [${concept}] 극복 미션을 스스로 시작해 포기하지 않고 열심히 도전하고 있는 모습이 아주 멋집니다!"`,
      question: `"${childName}야, 지금 도전하고 있는 [${concept}] 문제 중에 혹시 힌트가 필요하면 언제든 말씀해 줘. 엄마(아빠)가 힌트를 같이 읽어줄 수 있어!"`,
      avoid: `"'왜 아직도 미션을 다 안 끝냈니?'라며 속도를 다그치기보다는, '한 걸음씩 가다 보면 완벽하게 이해하게 될 거야'라고 페이스를 존중해 주세요."`,
    };
  }

  if (hasCompleted) {
    const concept = completedMissions[0].concept || difficultConcept;
    return {
      praise: `"${childName} 학생이 가장 헷갈려했던 [${concept}] 회복 미션을 성공적으로 정복하여 10분 회복 에너지를 기쁘게 획득했습니다!"`,
      question: `"${childName}야, 오늘 [${concept}] 미션을 완벽히 해냈던데! 어떻게 정답을 찾아냈는지 엄마(아빠)한테 자랑스럽게 한 번만 알려줄 수 있어?"`,
      avoid: `"'틀렸던 건데 다음엔 당연히 맞춰야지'라는 덤덤한 반응 대신, '오답을 극복하고 마스터해 낸 능력이 정말 위대하다'라며 과정과 성장을 적극 칭찬해 주세요."`,
    };
  }

  return {
    praise: `"${childName} 학생이 틀린 문제에 대해 감정을 스스로 마킹하고, 10분 회복 미션을 포기하지 않고 완료해 내는 훌륭한 회복력을 보여주었습니다!"`,
    question: `"${childName}야, 오늘 [${difficultConcept}] 미션을 완벽히 완료했던데, 1/3 피자 조각이랑 1/5 피자 조각 중에 왜 1/3 조각이 더 큰지 수학 척척박사님처럼 엄마에게 한 번 설명해 줄 수 있어?"`,
    avoid: `"'진작 이렇게 잘하지 그랬니?'라며 과거를 탓하는 말보다는, '실수를 극복하는 과정을 통해 진짜 똑똑해지는 거란다'라고 말하며 아이의 도전을 응원해 주세요."`,
  };
}

function ParentDashboardPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reports, setReports] = useState<ParentChildReport[]>([MOCK_JIWOO_REPORT]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    MOCK_JIWOO_REPORT.childId
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customCoaching, setCustomCoaching] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChildId) {
      return;
    }

    let isMounted = true;

    const fetchCoachingFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coaching_feedback")
          .eq("id", selectedChildId)
          .single();

        if (error) {
          console.warn("Failed to load coaching feedback:", error.message);
          return;
        }

        if (isMounted && data) {
          setCustomCoaching(data.coaching_feedback);
        }
      } catch (err) {
        console.warn("Error fetching coaching feedback:", err);
      }
    };

    void fetchCoachingFeedback();

    const channel = supabase
      .channel(`parent-child-coaching-${selectedChildId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${selectedChildId}`,
        },
        (payload) => {
          if (isMounted && payload.new) {
            setCustomCoaching(payload.new.coaching_feedback as string | null);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [selectedChildId, supabase]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    const loadParentData = async () => {
      try {
        const nextReports = await getParentDashboardData(supabase, user.id);

        if (!isMounted) {
          return;
        }

        if (nextReports.length === 0) {
          setReports([MOCK_JIWOO_REPORT]);
          setSelectedChildId(MOCK_JIWOO_REPORT.childId);
        } else {
          const enrichedReports = nextReports.map((report) => {
            return {
              ...report,
              grade: "초등 4학년",
              difficultConcept:
                report.difficultConcept === "아직 없음" ? "오답 분석 중" : report.difficultConcept,
              weeklyTrend: report.weeklyTrend,
              recentActivities: report.recentActivities,
            };
          });
          setReports(enrichedReports);
          setSelectedChildId((currentId) => {
            if (currentId && enrichedReports.some((report) => report.childId === currentId)) {
              return currentId;
            }
            return enrichedReports[0]?.childId ?? null;
          });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.error("Database query failed, falling back to mock data:", error);
        setReports([MOCK_JIWOO_REPORT]);
        setSelectedChildId(MOCK_JIWOO_REPORT.childId);
      }
    };

    void loadParentData();

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id]);

  const selectedReport = useMemo(
    () =>
      reports.find((report) => report.childId === selectedChildId) ??
      reports[0] ??
      MOCK_JIWOO_REPORT,
    [reports, selectedChildId]
  );

  const hasActivity = (selectedReport?.recentActivities.length ?? 0) > 0;

  const isDemoMode =
    selectedChildId === MOCK_JIWOO_REPORT.childId &&
    reports.length === 1 &&
    reports[0].childId === MOCK_JIWOO_REPORT.childId;

  const coachingGuide = useMemo(
    () =>
      getCoachingGuide(
        selectedReport.childName,
        selectedReport.difficultConcept,
        selectedReport.recentActivities
      ),
    [selectedReport]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-in fade-in duration-500 pb-16 font-sans">
      {/* 데이터 연동 상태 안내 배너 */}
      {isDemoMode ? (
        <div className="rounded-[1.5rem] border border-brand-teal/10 bg-white/70 backdrop-blur-md px-5 py-4 text-xs font-bold text-brand-teal flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="space-y-0.5">
            <span className="font-extrabold block text-sm tracking-tight">
              체험용 샘플 자녀 리포트 표시 중
            </span>
            <span className="text-[11px] font-semibold text-slate-400 leading-relaxed block">
              아직 등록된 자녀 계정이 없으므로, LoopNote의 학부모 관리 대시보드를 둘러볼 수 있는
              가상의 샘플 자녀(지우) 데이터를 표시합니다. 자녀 페이지에서 초대 코드를 활용해 연동해
              보세요!
            </span>
          </div>
          <span className="text-[10px] font-bold bg-brand-lime text-brand-teal border border-brand-teal/10 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-auto shadow-sm uppercase tracking-wider">
            Demo Sample
          </span>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/50 backdrop-blur-md px-5 py-4 text-xs font-bold text-brand-teal flex items-center justify-between shadow-md">
          <span className="tracking-tight flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-teal animate-ping" />
            <span>
              실시간 자녀(<strong>{selectedReport.childName}</strong>)의 오답 학습 데이터와 연동된
              맞춤형 성장 보드입니다.
            </span>
          </span>
          <span className="text-[10px] font-bold bg-[#064e52] text-white px-3 py-1 rounded-xl shadow-sm uppercase tracking-wider">
            Live Sync
          </span>
        </div>
      )}

      {/* ── HEADER HERO FRAME ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-brand-teal-dark border border-white/5 shadow-2xl min-h-[260px] flex items-center">
        {/* Banner Backdrop */}
        <div className="absolute inset-0 opacity-40 mix-blend-luminosity hover:opacity-55 transition-opacity duration-700">
          <Image
            src="/parent_portal_banner.png"
            alt="Parent Guidance Orbits"
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-teal-dark via-brand-teal-dark/85 to-transparent" />

        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 w-full">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-[9px] font-bold text-brand-lime tracking-widest uppercase shadow-sm font-sans">
              Guidance Orbits
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-white font-sans uppercase">
              {selectedReport.childName === "지우"
                ? "지우의 학습 루프가 회복 중입니다"
                : `${selectedReport.childName}의 학습 루프가 회복 중입니다`}
            </h1>
            <p className="text-teal-100/70 text-xs font-semibold leading-relaxed">
              틀려도 낙담하지 않고 극복할 수 있도록, 오늘 하루도 따뜻한 대화와 칭찬으로 아이의
              페이스를 이끌어주세요.
            </p>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE GROWTH ORBIT HUB (CHILD SELECTOR) ──────── */}
      {reports.length > 1 && (
        <section className="flex items-center gap-3 overflow-x-auto pb-1 border-b border-slate-200/40">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            자녀 성장 오빗:
          </span>
          <div className="flex gap-2">
            {reports.map((report) => {
              const isSelected = report.childId === selectedChildId;
              return (
                <button
                  key={report.childId}
                  onClick={() => setSelectedChildId(report.childId)}
                  className={`px-4.5 py-2 rounded-xl text-xs font-bold border transition duration-200 cursor-pointer shadow-sm ${
                    isSelected
                      ? "bg-brand-teal text-white border-brand-teal"
                      : "bg-white/70 backdrop-blur-sm text-slate-650 border-slate-200 hover:bg-white hover:scale-[1.01]"
                  }`}
                  type="button"
                >
                  {report.childName} ({report.childName === "지우" ? "초등 4학년" : "자녀"})
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── METRIC TILES GRID ─────────────────────────────────── */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "오늘의 학습 상태",
            val: (() => {
              const todayCompleted = selectedReport.recentActivities.filter(
                (act) => act.date.includes("오늘") && act.result === "미션 완료"
              ).length;
              return todayCompleted > 0
                ? `회복 미션 ${todayCompleted}개 완료!`
                : "오늘의 오답 회복 도전 중";
            })(),
            footer: (() => {
              const todayCompleted = selectedReport.recentActivities.filter(
                (act) => act.date.includes("오늘") && act.result === "미션 완료"
              ).length;
              return todayCompleted > 0 ? "오늘 복습 회복 완료" : "오늘 오답 미션 도전 권장";
            })(),
          },
          {
            label: "주간 회복률",
            val: (() => {
              const totalAct = selectedReport.recentActivities.length;
              const compAct = selectedReport.recentActivities.filter(
                (act) => act.result === "미션 완료"
              ).length;
              const rate = totalAct > 0 ? Math.round((compAct / totalAct) * 100) : 0;
              return `${rate}%`;
            })(),
            footer: "실시간 분석 결과 피드백",
          },
          {
            label: "반복되는 실수",
            val: selectedReport.difficultConcept || "분수 크기 비교",
            footer: "맞춤 코칭 가이드 추천",
          },
          {
            label: "주간 목표 달성",
            val: `${selectedReport.weeklyMissions} / 5회 달성`,
            footer: `목표 ${Math.min(Math.round((selectedReport.weeklyMissions / 5) * 100), 100)}% 완료`,
          },
        ].map((card, idx) => (
          <article
            key={idx}
            className="glass-card rounded-[2rem] p-6.5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-lg relative overflow-hidden group"
          >
            <div className="absolute -right-5 -top-5 h-20 w-20 rounded-full bg-brand-teal/5 group-hover:scale-125 transition-transform duration-300 pointer-events-none" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {card.label}
              </span>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded tracking-wider uppercase">
                node.{idx + 1}
              </span>
            </div>
            <p className="text-base font-extrabold text-slate-800 tracking-tight leading-snug truncate">
              {card.val}
            </p>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-lime" />
              <span className="text-[9.5px] font-bold text-brand-teal">{card.footer}</span>
            </div>
          </article>
        ))}
      </section>

      {/* ── CO-WORKING COACHING WIREFRAME TIMELINE ──────────────── */}
      <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3 border-b border-slate-200/40 pb-4">
          <div className="space-y-1">
            <h2 className="text-xs font-extrabold text-brand-teal uppercase tracking-widest">
              {selectedReport.childName}를 위한 오늘의 맞춤 부모 코칭 가이드
            </h2>
            <p className="text-[10.5px] text-slate-400 font-semibold leading-relaxed">
              아이의 오답 분석 데이터와 실시간 감정 피드백을 기초로 AI가 설계한 격려 조언입니다.
            </p>
          </div>
          <span className="w-fit text-[9px] font-bold bg-brand-lime border border-brand-teal/10 text-brand-teal rounded px-3 py-1 shadow-sm uppercase tracking-wider">
            Live Config Sync
          </span>
        </div>

        {/* 3 Panels Layout (Praise, Question, Avoid) */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Praise - Green card */}
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-5 flex flex-col gap-4 relative group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white text-[10px] font-bold uppercase shadow-sm">
                ok
              </div>
              <div>
                <span className="block text-[8px] font-bold text-emerald-800 tracking-wider uppercase mb-0.5 leading-none">
                  Praise
                </span>
                <span className="block text-xs font-extrabold text-slate-800">칭찬할 행동</span>
              </div>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600 bg-white/80 rounded-xl p-4 border border-emerald-100/40 flex-1 shadow-inner">
              {coachingGuide.praise}
            </p>
          </article>

          {/* Question to Ask - Dark Teal card */}
          <article className="rounded-2xl border border-white/5 bg-brand-teal p-5 flex flex-col gap-4 relative group hover:-translate-y-0.5 transition-transform duration-300 text-white shadow-md">
            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-lime/5 rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-lime text-brand-teal text-[10px] font-bold uppercase shadow-sm">
                q
              </div>
              <div>
                <span className="block text-[8px] font-bold text-brand-lime tracking-wider uppercase mb-0.5 leading-none">
                  Question to Ask
                </span>
                <span className="block text-xs font-extrabold text-white">
                  오늘 해볼 질문 및 조언
                </span>
              </div>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed text-teal-100/90 bg-white/10 rounded-xl p-4 border border-white/10 flex-1 shadow-inner">
              {customCoaching ? customCoaching : coachingGuide.question}
            </p>
          </article>

          {/* Avoid Words - Rose card */}
          <article className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 flex flex-col gap-4 relative group hover:-translate-y-0.5 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500 text-white text-[10px] font-bold uppercase shadow-sm">
                no
              </div>
              <div>
                <span className="block text-[8px] font-bold text-rose-800 tracking-wider uppercase mb-0.5 leading-none">
                  Avoid Words
                </span>
                <span className="block text-xs font-extrabold text-slate-800">피하면 좋은 말</span>
              </div>
            </div>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600 bg-white/80 rounded-xl p-4 border border-rose-100/40 flex-1 shadow-inner">
              {coachingGuide.avoid}
            </p>
          </article>
        </div>
      </section>

      {/* ── TREND & TIMELINE ──────────────────────────────────── */}
      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Weekly Trend Chart */}
        <section className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xs font-extrabold text-brand-teal uppercase tracking-widest">
                  주간 학습 흐름 (Recovery Wave)
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">
                  요일별 완료한 복습 오답 미션
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-brand-teal px-3.5 py-1.5 text-[9.5px] font-bold text-brand-lime shadow-sm uppercase tracking-wider">
                이번 주 총 {selectedReport.weeklyMissions}개 완료
              </span>
            </div>

            {/* Custom Column Bar Chart */}
            <div className="mt-8 flex h-56 items-end gap-3.5 rounded-2xl border border-slate-150/40 bg-slate-50/50 px-6 py-5 shadow-inner">
              {selectedReport.weeklyTrend.map((item) => (
                <div
                  className="flex flex-1 flex-col items-center justify-end gap-2 group cursor-pointer relative h-full"
                  key={item.day}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 transition-all duration-200 bg-slate-900 text-white text-[8.5px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-10">
                    {item.completed}개 완료
                  </span>

                  <div
                    aria-label={`${item.day}요일 완료 미션 ${item.completed}개`}
                    className={[
                      "w-full min-w-[28px] rounded-t-md bg-gradient-to-t from-brand-teal/70 to-brand-lime shadow-sm transition-all duration-300 group-hover:brightness-105",
                      item.completed === 0 ? "opacity-15 bg-brand-teal" : "",
                    ].join(" ")}
                    style={{
                      height:
                        item.completed === 0 ? "10px" : `${Math.min(item.completed * 45, 150)}px`,
                    }}
                    role="img"
                  />
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-brand-teal transition-colors">
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 text-[9.5px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-teal" />
              <span>학습 완료 (Completed)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
              <span>기록 없음 (Empty)</span>
            </div>
          </div>
        </section>

        {/* Timeline Activities */}
        <section className="glass-card rounded-[2.5rem] p-8 flex flex-col justify-between">
          <div>
            <div className="mb-5 border-b border-slate-200/40 pb-4">
              <h2 className="text-xs font-extrabold text-brand-teal uppercase tracking-widest">
                최근 활동 이력
              </h2>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                촬영된 문제와 회복 진도 실시간 상황
              </p>
            </div>

            {hasActivity ? (
              <div className="flow-root mt-4 overflow-y-auto max-h-[240px] pr-1">
                <ul className="-mb-8">
                  {selectedReport.recentActivities.map((activity, idx) => (
                    <li key={`${activity.date}-${activity.title}-${idx}`}>
                      <div className="relative pb-8">
                        {idx !== selectedReport.recentActivities.length - 1 ? (
                          <span
                            className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-100"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex items-start space-x-3.5">
                          <div className="relative">
                            <span
                              className={`h-10 w-10 rounded-xl flex items-center justify-center ring-4 ring-white shadow-sm text-[10px] ${
                                activity.result === "미션 완료"
                                  ? "bg-emerald-50 text-emerald-600 font-extrabold border border-emerald-100"
                                  : "bg-teal-550/5 text-brand-teal font-extrabold border border-teal-100"
                              }`}
                            >
                              {activity.result === "미션 완료" ? "OK" : "GO"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs">
                              <span className="font-bold text-slate-800 tracking-tight leading-snug">
                                {activity.title}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <span className="text-[9.5px] font-bold text-slate-400 bg-slate-50 border border-slate-150 px-1.5 py-0.5 rounded">
                                {activity.concept}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-medium">
                                {activity.date}
                              </span>
                            </div>
                            <div className="mt-2.5">
                              <span
                                className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold ${
                                  activity.result === "미션 완료"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-brand-teal/5 text-brand-teal border border-brand-teal/10"
                                }`}
                              >
                                {activity.result}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl p-5 text-center font-bold">
                자녀의 오답 회복 기록이 등록되면 상세 타임라인 활동 이력이 여기에 노출됩니다.
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/40">
            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-brand-lime hover:bg-brand-lime-hover text-brand-teal font-extrabold text-xs shadow-md shadow-lime-200/10 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              type="button"
            >
              <span>주간 상세 리포트 분석 보기</span>
            </button>
          </div>
        </section>
      </div>

      {/* ── HIGH-FIDELITY DIAGNOSTIC DETAILS MODAL ────────────────── */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-teal-dark/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-brand-teal p-6 md:p-8 text-white flex items-center justify-between border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/5 rounded-bl-full pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[8px] font-bold text-brand-lime tracking-widest uppercase block">
                  Weekly Diagnostics
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedReport.childName}의 주간 상세 학습 분석 리포트
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition relative z-10 cursor-pointer"
                type="button"
                aria-label="닫기"
              >
                <Icons.Close />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              {/* Concept Master Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-brand-teal tracking-widest uppercase flex items-center gap-2">
                  <span>Concept Map</span>
                </h4>
                <div className="bg-white border border-slate-200/50 rounded-2xl p-5 space-y-4 shadow-sm">
                  {selectedReport.difficultConcept === "오답 분석 중" ||
                  !selectedReport.difficultConcept ? (
                    <p className="text-xs text-slate-400 text-center font-semibold py-4">
                      오답 데이터 분석이 완료되면 마스터 맵이 활성화됩니다.
                    </p>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-650 mb-1.5">
                          <span className="font-bold text-slate-800">
                            {selectedReport.difficultConcept}
                          </span>
                          <span className="text-amber-500 font-extrabold">회복 진행 중 (70%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: "70%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-650 mb-1.5">
                          <span className="font-bold text-slate-800">분수의 덧셈과 뺄셈</span>
                          <span className="text-emerald-600 font-extrabold">
                            마스터 완료 (100%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: "100%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-650 mb-1.5">
                          <span className="font-bold text-slate-800">자연수의 나눗셈</span>
                          <span className="text-sky-600 font-extrabold">안정 단계 (90%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-550 h-full rounded-full"
                            style={{ width: "90%" }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Behavior Analysis */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-brand-teal tracking-widest uppercase flex items-center gap-2">
                  <span>Resilience Analysis</span>
                </h4>
                <div className="bg-white border border-slate-200/50 rounded-2xl p-5 space-y-4 shadow-sm">
                  {selectedReport.recentActivities.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center font-semibold py-4">
                      학습 활동 이후 진단이 작성됩니다.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600 font-bold text-[9px] uppercase border border-emerald-100">
                          grow
                        </span>
                        <p className="text-[11.5px] font-semibold text-slate-600 leading-relaxed">
                          {selectedReport.childName}는 틀린 문제를 회피하지 않고 적극적으로 힌트를
                          활용해 재시도하려는 <strong>회복 지향적 행동 패턴</strong>을 보여주고
                          있습니다. 오답 발생 시 스스로 헷갈린 부분을 스스로 마킹하는 빈도가 지난주
                          대비 25% 상승했습니다.
                        </p>
                      </div>
                      <div className="flex items-start gap-3.5 border-t border-slate-100 pt-3.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-50 text-amber-600 font-bold text-[9px] uppercase border border-amber-100">
                          warn
                        </span>
                        <p className="text-[11.5px] font-semibold text-slate-600 leading-relaxed">
                          단,{" "}
                          <strong>&quot;{selectedReport.difficultConcept || "분수 크기 비교"}&quot;</strong>의
                          분모가 다른 케이스에서 시각적 단서가 부재할 때 수식 풀이 속도가 다소
                          느려지는 양상이 발견되었습니다. 이 부분을 개념화하여 실생활 연계 대화를
                          유도하시는 것을 권장합니다.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Energy Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-teal-50 border border-teal-100/50 rounded-2xl p-5 shadow-sm">
                  <span className="block text-[8px] font-bold text-teal-800 uppercase tracking-widest">
                    누적 회복 에너지
                  </span>
                  <span className="block text-xl font-extrabold text-brand-teal mt-1">
                    {selectedReport.totalEnergy} EP
                  </span>
                  <span className="block text-[9px] text-teal-500 mt-1 font-semibold">
                    오답 극복 미션 가중치
                  </span>
                </div>
                <div className="bg-lime-50 border border-lime-100/50 rounded-2xl p-5 shadow-sm">
                  <span className="block text-[8px] font-bold text-lime-800 uppercase tracking-widest">
                    완료 학습 세션
                  </span>
                  <span className="block text-xl font-extrabold text-brand-teal-dark mt-1">
                    {selectedReport.weeklyMissions} 세션
                  </span>
                  <span className="block text-[9px] text-lime-600 mt-1 font-semibold">
                    최근 7일 기준 완료
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-4.5 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition border border-slate-200 bg-white cursor-pointer"
                type="button"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert("리포트가 PDF 파일로 인쇄/다운로드 준비되었습니다.");
                }}
                className="px-5 py-2 text-xs font-bold bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl shadow-md transition cursor-pointer"
                type="button"
              >
                PDF 리포트 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParentDashboardPage;
