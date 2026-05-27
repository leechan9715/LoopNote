"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/services/supabase";
import { getStudentSummary, getStudentMissionList } from "@/services/data";
import type { StudentSummary, StudentMissionListItem } from "@/services/data";

function readUserName(metadata: Record<string, unknown> | undefined): string {
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }

  return "지우";
}

function InfinityLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

export default function StudentHomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [missions, setMissions] = useState<StudentMissionListItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const studentName = useMemo(
    () => readUserName(user?.user_metadata),
    [user?.user_metadata]
  );

  const [coachingFeedback, setCoachingFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !isAuthenticated) return;

    let isMounted = true;

    const fetchCoachingFeedback = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("coaching_feedback")
          .eq("id", user.id)
          .single();

        if (error) {
          console.warn("Failed to load coaching feedback:", error.message);
          return;
        }

        if (isMounted && data) {
          setCoachingFeedback(data.coaching_feedback);
        }
      } catch (err) {
        console.warn("Error fetching coaching feedback:", err);
      }
    };

    void fetchCoachingFeedback();

    // REAL-TIME WEBSOCKET SUBSCRIPTION!
    const channel = supabase
      .channel(`profile-coaching-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (isMounted && payload.new) {
            setCoachingFeedback(payload.new.coaching_feedback as string | null);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [user?.id, isAuthenticated, supabase]);

  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      return;
    }

    let isMounted = true;

    const loadDashboardData = async () => {
      setIsDataLoading(true);
      try {
        const [nextSummary, nextMissions] = await Promise.all([
          getStudentSummary(supabase, user.id),
          getStudentMissionList(supabase, user.id),
        ]);

        if (!isMounted) return;

        setSummary(nextSummary);
        setMissions(nextMissions);
      } catch (error) {
        console.error("Dashboard loading error:", error);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, supabase, user?.id, isAuthenticated]);

  // Separate active (in-progress) and completed missions
  const activeMissions = useMemo(() => {
    return missions.filter(m => !m.isCompleted);
  }, [missions]);

  const completedMissions = useMemo(() => {
    return missions.filter(m => m.isCompleted);
  }, [missions]);

  // First active mission ID for continuing
  const continueMissionId = useMemo(() => {
    return activeMissions[0]?.id || null;
  }, [activeMissions]);

  // If loading auth state, show a premium skeleton or spinner
  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-teal-200 border-t-[#064e52]" />
          <div className="text-xl">🎒</div>
        </div>
        <Typography as="p" variant="body" className="text-slate-500 font-extrabold animate-pulse">
          루프노트 준비 중...
        </Typography>
      </div>
    );
  }

  // =========================================================================
  // GUEST (UNAUTHENTICATED) ROOT LANDING PAGE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-16 py-6 max-w-4xl mx-auto">
        {/* Hero Section */}
        <section className="text-center space-y-6 pt-8 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#b5e61d]/10 rounded-full blur-3xl -z-10" />
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#064e52]/5 border border-[#064e52]/10 text-xs font-black text-[#064e52] tracking-wider mb-2 animate-bounce">
            🌱 틀린 오답이 성장하는 곳
          </div>
          
          <Typography as="h1" variant="h1" className="text-4xl md:text-5xl font-black text-[#064e52] tracking-tight leading-tight">
            틀린 순간이 <br className="sm:hidden" />
            <span className="relative inline-block">
              다음 실력
              <span className="absolute left-0 bottom-1 w-full h-3 bg-[#b5e61d]/30 -z-10" />
            </span>
            이 되는 곳
          </Typography>
          
          <Typography as="p" variant="body" className="text-slate-600 max-w-lg mx-auto leading-relaxed text-sm md:text-base font-semibold">
            틀린 문제를 찍어만 주세요. LoopNote의 AI 선생님이 아이 눈높이에 딱 맞춘 3단계 생각 회복 루프로 답을 찾도록 도와줍니다.
          </Typography>

          {/* Plant Graphic */}
          <div className="flex justify-center pt-8 relative">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Plant Pot SVG */}
              <svg className="w-40 h-40" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* STEMS */}
                <path d="M100 130C80 90 90 40 60 20" stroke="#064e52" strokeWidth="4" strokeLinecap="round" />
                <path d="M100 130C120 100 110 60 130 35" stroke="#064e52" strokeWidth="4" strokeLinecap="round" />
                <path d="M100 130C100 80 95 50 100 15" stroke="#064e52" strokeWidth="4.5" strokeLinecap="round" />
                
                {/* LEAVES */}
                {/* Leaf Left */}
                <path d="M60 20C45 20 40 35 60 45C80 55 75 25 60 20Z" fill="#b5e61d" stroke="#064e52" strokeWidth="2.5" />
                <circle cx="50" cy="27" r="2" fill="white" />
                
                {/* Leaf Right */}
                <path d="M130 35C145 35 148 50 130 60C112 70 115 45 130 35Z" fill="#b5e61d" stroke="#064e52" strokeWidth="2.5" />
                <circle cx="138" cy="45" r="2" fill="white" />
                
                {/* Leaf Middle */}
                <path d="M100 15C85 10 80 30 100 40C120 50 115 20 100 15Z" fill="#b5e61d" stroke="#064e52" strokeWidth="3" />
                <circle cx="95" cy="22" r="2.5" fill="white" />
                
                {/* Minor Leaves */}
                <path d="M85 80C75 75 70 85 85 90C100 95 95 85 85 80Z" fill="#b5e61d" stroke="#064e52" strokeWidth="2" />
                <path d="M112 90C122 85 125 95 112 100C99 105 102 95 112 90Z" fill="#b5e61d" stroke="#064e52" strokeWidth="2" />

                {/* THE POT */}
                <path d="M60 130H140L130 180H70L60 130Z" fill="url(#potGradient)" stroke="#064e52" strokeWidth="4.5" strokeLinejoin="round" />
                <rect x="50" y="120" width="100" height="12" rx="6" fill="#064e52" />
                <rect x="55" y="123" width="90" height="6" rx="3" fill="#0d6e73" />
                
                {/* Sparkles */}
                <path d="M150 20L154 28L162 29L156 35L158 43L150 38L142 43L144 35L138 29L146 28L150 20Z" fill="#b5e61d" opacity="0.8" />
                <path d="M40 70L42 74L46 74.5L43 77.5L44 81.5L40 79L36 81.5L37 77.5L34 74.5L38 74L40 70Z" fill="#b5e61d" opacity="0.6" />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="potGradient" x1="100" y1="130" x2="100" y2="180" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#064e52" />
                    <stop offset="1" stopColor="#00363a" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Subtle platform shadow */}
              <div className="absolute bottom-1 w-32 h-3 bg-black/10 rounded-full blur-sm" />
            </div>
          </div>
        </section>

        {/* 4-Step Timeline Section */}
        <section className="space-y-8 bg-white rounded-3xl p-8 border border-slate-200/60 shadow-md">
          <div className="text-center">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black">
              LoopNote 성장 4단계 루프
            </Typography>
            <Typography as="p" variant="caption" className="text-slate-500 font-bold mt-1.5">
              막힌 원인을 진단하고 딱 10분만 투자해 오답을 완전히 회복해요!
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connection Line for Desktop */}
            <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-1 bg-slate-100 -translate-y-6 -z-10" />

            {/* Timeline Steps */}
            {[
              { num: "01", title: "오답 등록", desc: "문제 사진을 찍고 내가 푼 흔적과 감정을 알려주세요.", emoji: "📸" },
              { num: "02", title: "막힘 진단", desc: "AI 선생님이 오답 원인을 정확하게 진단합니다.", emoji: "🔬" },
              { num: "03", title: "10분 미션", desc: "시각 자료와 함께 단계별 힌트로 생각을 풀어요.", emoji: "⏱️" },
              { num: "04", title: "코칭 카드", desc: "스스로 해결하는 힘을 기르는 코칭 피드백 완성!", emoji: "🌱" },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center p-4 bg-[#f8fafc] rounded-2xl border border-slate-100 hover:border-[#b5e61d] transition duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-white text-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition duration-300 border border-slate-100">
                  {step.emoji}
                </div>
                <span className="text-xs font-black text-[#b5e61d] tracking-widest uppercase mt-3">STEP {step.num}</span>
                <Typography as="h3" variant="body" className="text-[#064e52] font-extrabold mt-1 text-sm">
                  {step.title}
                </Typography>
                <Typography as="p" variant="caption" className="text-slate-500 font-semibold mt-2 leading-relaxed text-xs">
                  {step.desc}
                </Typography>
              </div>
            ))}
          </div>
        </section>

        {/* 3 Role Selection Buttons */}
        <section className="space-y-5 text-center">
          <Typography as="h3" variant="h2" className="text-[#064e52] font-black">
            로그인해서 LoopNote 시작하기
          </Typography>
          <Typography as="p" variant="caption" className="text-slate-500 font-bold -mt-2">
            사용하실 계정의 역할에 맞는 버튼을 선택해 주세요.
          </Typography>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
            {[
              { role: "student", label: "학생으로 로그인", desc: "스캔하고, 생각 열고, 미션 완료!", bg: "hover:border-[#b5e61d] bg-white", color: "text-[#064e52]", emoji: "🎒" },
              { role: "parent", label: "학부모로 로그인", desc: "자녀의 오답 회복과 성장을 한눈에!", bg: "hover:border-[#0d6e73] bg-white", color: "text-[#0d6e73]", emoji: "🏠" },
              { role: "teacher", label: "선생님으로 로그인", desc: "학습 상태 모니터링 및 맞춤 지도!", bg: "hover:border-slate-500 bg-white", color: "text-slate-700", emoji: "👩‍🏫" },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  router.push(`/login?role=${btn.role}`);
                }}
                className={`flex flex-col items-center justify-between p-6 rounded-2xl border border-slate-200 shadow-sm transition duration-300 ${btn.bg} group text-left w-full focus:outline-none focus:ring-2 focus:ring-[#064e52]/40`}
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl mb-3.5 group-hover:scale-110 transition duration-300">{btn.emoji}</span>
                  <span className={`text-base font-black ${btn.color} block mb-1`}>{btn.label}</span>
                  <span className="text-[11px] font-semibold text-slate-400 leading-normal">{btn.desc}</span>
                </div>
                <div className="mt-5 w-full bg-[#f8fafc] group-hover:bg-[#064e52]/5 py-2.5 rounded-xl border border-slate-100 text-center transition duration-200">
                  <span className="text-xs font-black text-[#064e52]">이동하기 →</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // LOGGED IN (AUTHENTICATED) STUDENT DASHBOARD
  // =========================================================================
  return (
    <div className="flex flex-col gap-8 py-2 max-w-4xl mx-auto">
      {/* Dynamic Greeting */}
      <section className="rounded-3xl border border-slate-200/60 bg-white px-6 py-6 shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <InfinityLogo className="w-48 h-48 text-[#064e52]" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex rounded-full bg-[#064e52]/5 border border-[#064e52]/10 px-3 py-1 text-xs font-black text-[#064e52]">
            ⚡ 오늘의 회복 파트너
          </div>
          <Typography as="h1" variant="h1" className="text-slate-900 font-black text-2xl md:text-3xl leading-snug">
            안녕, {studentName} 👋 <br className="sm:hidden" />
            <span className="text-[#064e52]">오늘은 10분만 다시 해보면 충분해요.</span>
          </Typography>
        </div>
      </section>

      {/* Today's Recovery Mission Banner */}
      <section className="rounded-3xl bg-[#064e52] text-white p-6 shadow-lg border border-[#00363a] relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 pointer-events-none">
          <span className="text-9xl">🎯</span>
        </div>
        
        <div className="relative z-10 space-y-1.5">
          <span className="inline-block text-[10px] font-black bg-[#b5e61d]/20 text-[#b5e61d] px-2.5 py-1 rounded-md tracking-wider uppercase">
            TODAY'S MISSION
          </span>
          <Typography as="h2" variant="h2" className="text-white font-extrabold text-xl">
            수학 - 분수의 크기 비교 (10분)
          </Typography>
          <Typography as="p" variant="caption" className="text-teal-100/80 font-bold">
            피자 조각 그림을 직접 움직이며 분수의 크기를 완벽히 이해해요.
          </Typography>
        </div>

        <div className="relative z-10 flex-shrink-0">
          <Link
            href={continueMissionId ? `/missions/${continueMissionId}` : "/wrong-notes"}
            className="inline-flex items-center justify-center min-h-12 px-6 rounded-2xl bg-[#b5e61d] hover:bg-[#a1cf15] text-[#064e52] font-black text-sm transition duration-200 shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#b5e61d]/40"
          >
            {continueMissionId ? "미션 이어하기 >" : "새 오답 등록하기 >"}
          </Link>
        </div>
      </section>

      {/* Grid of In-progress / Completed / Growth report */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 columns: Loop List */}
        <div className="md:col-span-2 space-y-6">
          {/* In-progress Loops List */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔄</span>
              <Typography as="h2" variant="h2" className="text-slate-900 font-black">
                진행 중인 회복 루프
              </Typography>
              <span className="text-xs bg-[#0d6e73]/10 text-[#0d6e73] font-black px-2 py-0.5 rounded-full">
                {activeMissions.length}
              </span>
            </div>

            {activeMissions.length > 0 ? (
              <ul className="space-y-3">
                {activeMissions.map((item) => (
                  <li key={item.id} className="group">
                    <Link
                      href={`/missions/${item.id}`}
                      className="block rounded-2xl bg-white border border-slate-200 hover:border-[#0d6e73]/30 p-4 shadow-sm hover:shadow-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d6e73]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-[10px] font-black text-[#0d6e73] bg-[#0d6e73]/5 border border-[#0d6e73]/10 px-2 py-0.5 rounded-md">
                            {item.concept}
                          </span>
                          <Typography as="h3" variant="body" className="text-slate-950 font-black text-sm mt-1.5">
                            {item.title}
                          </Typography>
                        </div>
                        <span className="text-xs font-black text-[#064e52]">
                          {item.progressPercent}% 진행
                        </span>
                      </div>
                      
                      {/* Progress Bar indicator */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#0d6e73] to-[#064e52] h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold mt-2">
                        <span>생각 설명 단계</span>
                        <span>{item.currentStep} / {item.totalSteps} 힌트</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-3">
                <p className="text-slate-500 font-semibold text-xs leading-relaxed">
                  진행 중인 회복 루프가 없습니다. <br />
                  오답을 스캔하여 첫 번째 미션을 시작해 보세요!
                </p>
                <Button
                  onClick={() => router.push("/wrong-notes")}
                  size="sm"
                  variant="outline"
                  className="border-[#0d6e73] text-[#0d6e73] hover:bg-[#0d6e73]/5 font-black rounded-xl"
                >
                  오답 스캔하러 가기
                </Button>
              </div>
            )}
          </section>

          {/* Completed History List */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <Typography as="h2" variant="h2" className="text-slate-900 font-black">
                회복 완료 히스토리
              </Typography>
              <span className="text-xs bg-[#b5e61d]/20 text-[#064e52] font-black px-2 py-0.5 rounded-full">
                {completedMissions.length}
              </span>
            </div>

            {completedMissions.length > 0 ? (
              <ul className="space-y-2">
                {completedMissions.map((item) => (
                  <li 
                    key={item.id} 
                    className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b5e61d]/15 text-[#064e52] text-xs font-black">
                        ✓
                      </span>
                      <div>
                        <Typography as="h3" variant="body" className="font-extrabold text-slate-800 text-xs">
                          {item.title}
                        </Typography>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                          {item.concept} · 완료
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      +12 EP 회복
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-slate-400 font-medium text-[11px]">
                  회복을 끝마친 미션이 아직 없어요. 차근차근 해결해봐요!
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right column: Growth rate Card */}
        <div className="space-y-6">
          {/* Weekly Growth Rate Progress Circle Card */}
          <section className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-sm text-center flex flex-col items-center">
            <Typography as="h3" variant="body" className="text-slate-900 font-black text-sm mb-4">
              주간 성장률
            </Typography>

            {/* Circular Progress Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#f1f5f9" 
                  strokeWidth="10" 
                  fill="transparent" 
                />
                {/* Active value */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#growthGradient)" 
                  strokeWidth="10" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 * (1 - 0.8)} 
                  strokeLinecap="round"
                  fill="transparent" 
                  className="transition-all duration-1000 ease-out"
                />
                
                <defs>
                  <linearGradient id="growthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d6e73" />
                    <stop offset="100%" stopColor="#b5e61d" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Inner Circle Details */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#064e52]">80%</span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">목표 도달</span>
              </div>
            </div>

            <div className="mt-4 bg-[#f8fafc] border border-slate-100 rounded-2xl p-3 w-full text-left">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                COACHING CARD FEEDBACK
              </span>
              <p className="text-xs font-bold text-[#064e52] leading-relaxed">
                {coachingFeedback ? (
                  coachingFeedback
                ) : (
                  <>
                    {studentName} 학생은 이번 주에 분수의 기초 개념을 <strong>80%</strong> 마스터했어요! 다음 단계인 동분모 덧셈을 시도해봐도 좋아요. 🌱
                  </>
                )}
              </p>
            </div>
          </section>

          {/* Quick Info card */}
          <section className="rounded-3xl bg-[#b5e61d]/10 border border-[#b5e61d]/30 p-5">
            <Typography as="h3" variant="body" className="text-[#064e52] font-black text-xs mb-1.5">
              루프학습 팁 🌱
            </Typography>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              문제를 찍을 때는 풀이 과정을 포함해 주세요. AI 선생님이 어느 지점에서 막혔는지 정확히 짚어내어 맞춤형 회복 지도를 그릴 수 있답니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
