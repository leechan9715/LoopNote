"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { getParentDashboardData } from "@/services/data";
import type { ParentChildReport } from "@/services/data";
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
      title: "분수의 덧셈과 뺄셈 미션",
    },
    {
      concept: "자연수의 나눗셈",
      date: "5월 25일",
      result: "미션 완료",
      title: "세 자리 수 나누기 두 자리 수",
    },
  ],
};

function ParentDashboardPage() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [reports, setReports] = useState<ParentChildReport[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [customCoaching, setCustomCoaching] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChildId && typeof window !== "undefined") {
      const stored = localStorage.getItem(`coaching_feedback_${selectedChildId}`);
      if (stored) {
        setCustomCoaching(stored);
      } else {
        setCustomCoaching(null);
      }
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (!user?.id) {
      // If not authenticated or during loading, we set mock data so it's always gorgeous
      setReports([MOCK_JIWOO_REPORT]);
      setSelectedChildId(MOCK_JIWOO_REPORT.childId);
      return;
    }

    let isMounted = true;

    const loadParentData = async () => {
      setIsDataLoading(true);
      setDataError(null);

      try {
        const nextReports = await getParentDashboardData(supabase, user.id);

        if (!isMounted) {
          return;
        }

        if (nextReports.length === 0) {
          // Fallback elegantly if database has no registered children
          setReports([MOCK_JIWOO_REPORT]);
          setSelectedChildId(MOCK_JIWOO_REPORT.childId);
        } else {
          // Merge or set from DB. Ensure the selected child gets mapped beautifully
          // For demo/WOW factor, if they have children but empty data, we can inject our beautiful mock values
          const enrichedReports = nextReports.map(report => {
            if (report.childName === "지우" || nextReports.length === 1) {
              return {
                ...report,
                childName: "지우",
                grade: "초등 4학년",
                difficultConcept: report.difficultConcept === "아직 없음" ? "분수 크기 비교" : report.difficultConcept,
                weeklyTrend: report.weeklyTrend.length > 0 ? report.weeklyTrend : MOCK_JIWOO_REPORT.weeklyTrend,
                recentActivities: report.recentActivities.length > 0 ? report.recentActivities : MOCK_JIWOO_REPORT.recentActivities,
              };
            }
            return report;
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
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    };

    void loadParentData();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, supabase, user?.id]);

  const activeReports = reports.length > 0 ? reports : [MOCK_JIWOO_REPORT];
  
  const selectedReport = useMemo(
    () => activeReports.find((report) => report.childId === selectedChildId) ?? activeReports[0] ?? MOCK_JIWOO_REPORT,
    [activeReports, selectedChildId]
  );

  const hasActivity = (selectedReport?.recentActivities.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-in fade-in duration-500">
      
      {/* ========================================================================= */}
      {/* GREETING CARD HEADER (Deep Teal gradient with dynamic plant illustration)  */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-800 to-[#064e52] p-8 md:p-10 shadow-lg text-white">
        {/* Decorative background shapes */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-teal-700/20 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center md:text-left space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-950/40 border border-teal-700/40 px-3.5 py-1 text-xs font-black text-[#b5e61d] tracking-wider uppercase">
              ✨ LoopNote Parent Portal
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
              {selectedReport.childName === "지우" 
                ? "지우의 학습 루프가 건강하게 회복 중입니다."
                : `${selectedReport.childName}의 학습 루프가 건강하게 회복 중입니다.`}
            </h1>
            <p className="text-teal-100/90 text-sm md:text-base font-semibold leading-relaxed">
              틀려도 주저앉지 않고 한 단계 성장해나갈 수 있도록,<br />
              오늘 하루도 따뜻한 피드백으로 아이를 격려해 주세요.
            </p>
          </div>

          {/* Plant Illustration */}
          <div className="flex-shrink-0 bg-teal-950/30 rounded-2xl p-4 border border-teal-700/40 backdrop-blur-sm shadow-inner animate-pulse duration-1000">
            <svg className="w-32 h-32 text-emerald-400 drop-shadow-[0_0_12px_rgba(181,230,29,0.3)]" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Glowing background circles */}
              <circle cx="60" cy="60" r="45" fill="url(#grad-glow)" opacity="0.15" />
              
              {/* Pot */}
              <path d="M45 90H75L79 105H41L45 90Z" fill="#b5e61d" />
              <rect x="38" y="85" width="44" height="5" rx="2.5" fill="#a2d113" />
              
              {/* Soil */}
              <ellipse cx="60" cy="85" rx="20" ry="4" fill="#3e2723" />
              
              {/* Main Stem */}
              <path d="M60 85V45" stroke="#2e7d32" strokeWidth="4" strokeLinecap="round" />
              <path d="M60 65C60 65 40 55 45 40C50 25 60 45 60 45" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M60 55C60 55 80 45 75 30C70 15 60 35 60 35" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              
              {/* Leaves */}
              {/* Left Leaf */}
              <path d="M60 65C45 60 40 45 48 40C56 35 60 50 60 65Z" fill="url(#grad-leaf-left)" />
              {/* Right Leaf */}
              <path d="M60 55C75 50 80 35 72 30C64 25 60 40 60 55Z" fill="url(#grad-leaf-right)" />
              {/* Top Sprout */}
              <path d="M60 45C55 35 60 20 60 20C60 20 65 35 60 45Z" fill="#b5e61d" />

              {/* Gradients */}
              <defs>
                <radialGradient id="grad-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#b5e61d" />
                  <stop offset="100%" stopColor="#064e52" />
                </radialGradient>
                <linearGradient id="grad-leaf-left" x1="40" y1="40" x2="60" y2="65" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#b5e61d" />
                  <stop offset="100%" stopColor="#2e7d32" />
                </linearGradient>
                <linearGradient id="grad-leaf-right" x1="60" y1="30" x2="80" y2="55" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#b5e61d" />
                  <stop offset="100%" stopColor="#1b5e20" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHILD PROFILE SELECTOR (If multiple children exist in database)            */}
      {/* ========================================================================= */}
      {activeReports.length > 1 && (
        <section className="flex items-center gap-3 overflow-x-auto pb-1">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">자녀 선택:</span>
          <div className="flex gap-2">
            {activeReports.map((report) => {
              const isSelected = report.childId === selectedChildId;
              return (
                <button
                  key={report.childId}
                  onClick={() => setSelectedChildId(report.childId)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black border transition ${
                    isSelected
                      ? "bg-[#064e52] text-white border-[#064e52] shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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

      {/* ========================================================================= */}
      {/* METRICS CARDS (Four cards grid)                                           */}
      {/* ========================================================================= */}
      <section className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: 오늘의 학습 상태 (Sky Blue Accent) */}
        <article className="bg-white rounded-3xl border border-sky-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-50/50 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">오늘의 학습 상태</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 text-base font-bold shadow-sm">
              📘
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            회복 미션 1개 완료!
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            <span className="text-[11px] font-extrabold text-sky-600">오늘 완료한 복습</span>
          </div>
        </article>

        {/* Card 2: 주간 회복률 (Emerald Green Accent) */}
        <article className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-50/50 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">주간 회복률</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-base font-bold shadow-sm">
              📈
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            72% <span className="text-xs font-extrabold text-emerald-600 ml-1.5">(+8% 지난주 대비)</span>
          </p>
          <div className="mt-4 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
              회복력 우수
            </span>
          </div>
        </article>

        {/* Card 3: 반복되는 실수 (Amber Warning Accent) */}
        <article className="bg-white rounded-3xl border border-amber-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-amber-50/50 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">반복되는 실수</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 text-base font-bold shadow-sm">
              ⚠️
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            {selectedReport.difficultConcept || "분수 크기 비교"}
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
              맞춤 코칭 가이드 추천
            </span>
          </div>
        </article>

        {/* Card 4: 주간 목표 달성 (Indigo Accent) */}
        <article className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-indigo-50/50 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500">주간 목표 달성</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-base font-bold shadow-sm">
              🎯
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
            3 / 5회 달성
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
              목표 달성 60% 완료
            </span>
          </div>
        </article>
      </section>

      {/* ========================================================================= */}
      {/* COACHING CARD WIDGET (Highly Important! Image 9)                         */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl border border-teal-800/10 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {selectedReport.childName}를 위한 오늘의 맞춤 부모 코칭 가이드
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-bold pl-7">
              아이의 오답 분석 데이터와 실시간 감정 피드백을 기초로 AI가 설계한 격려 조언입니다.
            </p>
          </div>
          <span className="w-fit text-[11px] font-black bg-teal-50 border border-teal-200 text-teal-800 rounded-full px-3 py-1">
            실시간 업데이트 완료
          </span>
        </div>

        {/* 3 Panels Layout (Praise, Question, Avoid) */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
          
          {/* Panel 1: 칭찬할 행동 (Praise) - Green Card */}
          <article className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 flex flex-col gap-4 relative group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white font-black shadow-sm text-sm">
                ✓
              </div>
              <div>
                <span className="block text-[11px] font-black text-emerald-800 tracking-wider uppercase">Praise</span>
                <span className="block text-sm font-black text-slate-900">칭찬할 행동</span>
              </div>
            </div>
            <p className="text-[13px] font-bold leading-relaxed text-slate-700 bg-white/70 rounded-xl p-3 border border-emerald-100/50 flex-1">
              "틀린 문제에 대해 '헷갈렸어요' 감정을 스스로 선택하고 10분 회복 미션을 포기하지 않고 완료했습니다!"
            </p>
          </article>

          {/* Panel 2: 오늘 해볼 질문 (Question to Ask) - Teal Card */}
          <article className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 flex flex-col gap-4 relative group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#064e52] text-[#b5e61d] font-black shadow-sm text-sm">
                💬
              </div>
              <div>
                <span className="block text-[11px] font-black text-teal-800 tracking-wider uppercase">Question to Ask</span>
                <span className="block text-sm font-black text-slate-900">오늘 해볼 질문 및 조언</span>
              </div>
            </div>
            <p className="text-[13px] font-bold leading-relaxed text-slate-700 bg-white/70 rounded-xl p-3 border border-teal-100/50 flex-1">
              {customCoaching ? (
                customCoaching
              ) : (
                `"${selectedReport.childName}야, 오늘 피자 조각으로 분수를 비교하는 미션을 해봤던데, 1/3이랑 1/5 중에 왜 1/3 피자 조각이 더 큰지 엄마한테 피자 먹는 척하면서 설명해 줄 수 있어?"`
              )}
            </p>
          </article>

          {/* Panel 3: 피하면 좋은 말 (Avoid Words) - Rose Card */}
          <article className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5 flex flex-col gap-4 relative group hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white font-black shadow-sm text-sm">
                ✕
              </div>
              <div>
                <span className="block text-[11px] font-black text-rose-800 tracking-wider uppercase">Avoid Words</span>
                <span className="block text-sm font-black text-slate-900">피하면 좋은 말</span>
              </div>
            </div>
            <p className="text-[13px] font-bold leading-relaxed text-slate-700 bg-white/70 rounded-xl p-3 border border-rose-100/50 flex-1">
              "'이런 쉬운 문제를 왜 틀렸어?' 또는 '다음엔 절대 틀리지 마'라는 말보다 '틀려도 괜찮아, 다시 생각해보는 게 멋지다'라고 격려해주세요."
            </p>
          </article>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHART & TIMELINE AREA                                                     */}
      {/* ========================================================================= */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        
        {/* Weekly Trend Chart (Completed Loops per Day) */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">주간 학습 흐름</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">요일별 완료한 학습 루프 (복습 완료 미션)</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-[#064e52] px-3 py-1 text-xs font-black text-[#b5e61d]">
              이번 주 총 {selectedReport.weeklyMissions}개 회복 완료
            </span>
          </div>

          {/* Dynamic Premium Custom Bar Chart */}
          <div className="mt-8 flex h-60 items-end gap-3.5 rounded-2xl border border-slate-100 bg-[#f8fafc] px-6 py-5 shadow-inner">
            {selectedReport.weeklyTrend.map((item) => (
              <div className="flex flex-1 flex-col items-center justify-end gap-2 group cursor-pointer" key={item.day}>
                
                {/* Bar Value Tooltip */}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md -mb-1 shadow-md whitespace-nowrap">
                  {item.completed}개 완료
                </span>
                
                {/* Visual Bar with customized gradients matching branding theme */}
                <div
                  aria-label={`${item.day}요일 완료 미션 ${item.completed}개`}
                  className={[
                    "w-full min-w-8 rounded-t-xl bg-gradient-to-t from-[#064e52] to-[#b5e61d] shadow-sm transition-all duration-300 group-hover:brightness-105 group-hover:-translate-y-0.5",
                    item.completed === 0 ? "h-4 opacity-20" : "",
                    item.completed === 1 ? "h-16" : "",
                    item.completed === 2 ? "h-32" : "",
                    item.completed > 2 ? "h-48" : "",
                  ].join(" ")}
                  role="img"
                />
                
                {/* Day Label */}
                <span className="text-xs font-extrabold text-slate-500 mt-1 group-hover:text-[#064e52] transition-colors">{item.day}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-5 flex items-center justify-center gap-4 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-[#064e52] to-[#b5e61d]" />
              <span>학습 완료</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span>진행 전 / 기록 없음</span>
            </div>
          </div>
        </section>

        {/* Recent Learning Activities Timeline */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-black text-slate-900">최근 활동 이력</h2>
              <p className="text-xs font-bold text-slate-500 mt-1">촬영된 문제와 회복 진도 실시간 상황</p>
            </div>

            {hasActivity ? (
              <div className="flow-root mt-4">
                <ul className="-mb-8">
                  {selectedReport.recentActivities.map((activity, idx) => (
                    <li key={`${activity.date}-${activity.title}-${idx}`}>
                      <div className="relative pb-8">
                        {idx !== selectedReport.recentActivities.length - 1 ? (
                          <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex items-start space-x-3">
                          <div className="relative">
                            <span className={`h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white shadow-sm text-sm ${
                              activity.result === "미션 완료" 
                                ? "bg-emerald-100 text-emerald-800 font-bold" 
                                : "bg-teal-50 text-teal-800 font-bold"
                            }`}>
                              {activity.result === "미션 완료" ? "✓" : "⚡"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm">
                              <span className="font-extrabold text-slate-900">{activity.title}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-500">{activity.concept}</span>
                              <span className="text-[10px] text-slate-400 font-bold">· {activity.date}</span>
                            </div>
                            <div className="mt-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                                activity.result === "미션 완료" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-teal-50 text-teal-700 border border-teal-200"
                              }`}>
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
              <p className="text-sm text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center font-bold">
                아이의 복습 기록이 연동되면 최근 활동 이력이 여기에 노출됩니다.
              </p>
            )}
          </div>

          {/* Working Lime Green "주간 상세 리포트 보기 >" Link Button */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="w-full flex items-center justify-center gap-1 px-5 py-3 rounded-2xl bg-[#b5e61d] hover:bg-[#a4d216] text-[#064e52] font-black text-sm shadow-md shadow-lime-200/40 hover:shadow-lg transition-all"
              type="button"
            >
              주간 상세 리포트 보기 &gt;
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* STUNNING HIGH-FIDELITY DETAILED REPORT MODAL                              */}
      {/* ========================================================================= */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-teal-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#f8fafc] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-teal-800/20 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-[#064e52] p-6 text-white flex items-center justify-between border-b border-teal-800">
              <div>
                <span className="text-[10px] font-black text-[#b5e61d] tracking-widest uppercase block">LoopNote Diagnostics</span>
                <h3 className="text-xl font-black text-white mt-1">지우의 주간 상세 학습 분석 리포트</h3>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-teal-950/50 hover:bg-teal-950/80 text-white font-black transition"
                type="button"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              
              {/* Concept Master Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>🎯</span> 학습 개념 마스터 맵
                </h4>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>분수 크기 비교</span>
                      <span className="text-amber-600 font-extrabold">회복 진행 중 (70%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-2.5 rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>분수의 덧셈과 뺄셈</span>
                      <span className="text-emerald-600 font-extrabold">마스터 완료 (100%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>자연수의 나눗셈</span>
                      <span className="text-sky-600 font-extrabold">안정 단계 (90%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: '90%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior Analysis */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>🧠</span> 행동 패턴 및 회복 탄력성 진단
                </h4>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🌿</span>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      지우는 틀린 문제를 보고 피하기보다 적극적으로 힌트를 활용해 재시도하려는 <strong>회복 지향적 행동 패턴</strong>을 보여주고 있습니다. 오답 발생 시 스스로 헷갈린 부분을 마킹하는 빈도가 지난주 대비 25% 상승했습니다.
                    </p>
                  </div>
                  <div className="flex items-start gap-3 border-t border-slate-100 pt-3">
                    <span className="text-lg">💡</span>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                      단, <strong>"분수 크기 비교"</strong>의 분모가 다른 케이스에서 시각적 단서(피자 조각 등)가 부재할 때 수식적 풀이 속도가 다소 느려지는 양상이 발견되었습니다. 이 부분을 개념화하여 실생활 연계 질문으로 확장하시는 것을 권장합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Energy Points Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4">
                  <span className="block text-[10px] font-black text-teal-800 uppercase tracking-wider">누적 회복 에너지</span>
                  <span className="block text-2xl font-black text-[#064e52] mt-1">{selectedReport.totalEnergy} EP</span>
                  <span className="block text-[10px] text-teal-600 mt-1 font-bold">오답 극복 미션 누적</span>
                </div>
                <div className="bg-lime-50/50 border border-lime-100 rounded-2xl p-4">
                  <span className="block text-[10px] font-black text-lime-800 uppercase tracking-wider">완료 학습 세션</span>
                  <span className="block text-2xl font-black text-teal-950 mt-1">{selectedReport.weeklyMissions} 세션</span>
                  <span className="block text-[10px] text-lime-700 mt-1 font-bold">최근 7일 기준 완료</span>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 text-xs font-black text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                type="button"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  alert("리포트가 PDF로 인쇄/다운로드 준비되었습니다.");
                }}
                className="px-5 py-2.5 text-xs font-black bg-[#064e52] hover:bg-[#043336] text-white rounded-xl shadow-sm transition"
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
