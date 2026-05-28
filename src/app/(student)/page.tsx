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
    <svg className={`${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

  // If loading auth state, show a premium layout placeholder
  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-14 w-14 animate-spin rounded-full border-2 border-slate-200 border-t-[#064e52]" />
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Loading student loop console...
        </span>
      </div>
    );
  }

  // =========================================================================
  // GUEST (UNAUTHENTICATED) ROOT LANDING PAGE - AWWRARDS EXPERIMENTAL SWISS GRID
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-16 py-8 max-w-5xl mx-auto px-4 relative overflow-hidden bg-transparent">
        
        {/* Dynamic backing design lights */}
        <div className="absolute top-1/4 left-[-10%] w-80 h-80 bg-[#ccff00]/5 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-10 right-[-10%] w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Hero Section */}
        <section className="text-left space-y-8 pt-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#064e52]/5 border border-[#064e52]/10 text-[9px] font-black text-[#064e52] tracking-widest uppercase mb-1 shadow-sm">
            ACTIVE COGNITIVE HYPOTHESIS
          </div>
          
          <h1 className="text-4xl md:text-[3.75rem] font-black text-[#021e21] tracking-tight leading-[1.05] uppercase font-sans">
            Wrecking Errors <br />
            Reclaiming <span className="font-serif italic font-normal text-[#064e52] underline decoration-[#ccff00]/40 decoration-wavy underline-offset-8">Cognitive</span> Growth.
          </h1>
          
          <Typography as="p" variant="body" className="text-slate-400 max-w-2xl leading-relaxed text-xs md:text-sm font-bold">
            틀린 문제를 찍어만 주세요. 루프노트의 독창적인 AI 소크라테스 힌트 알고리즘이 학생이 막힌 수학 오개념 오류를 진단하고 단계별 10분 학습 미션으로 생각을 능동적으로 확장시킵니다.
          </Typography>

          {/* Generated Awwwards Artwork Widescreen Plate - Wiped pot illustrations */}
          <div className="pt-6 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden border border-[#064e52]/15 shadow-[0_30px_70px_rgba(6,78,82,0.12)]">
              <img 
                src="/student_study_banner.png" 
                alt="Student growth curves backdrop" 
                className="w-full h-auto min-h-[220px] max-h-[380px] object-cover transition duration-700 hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#00282b]/80 via-transparent to-transparent flex items-end p-6 md:p-10">
                <div className="text-left">
                  <span className="text-[8px] font-black tracking-widest text-[#ccff00] bg-white/10 border border-white/10 px-3 py-1 rounded uppercase">System Active</span>
                  <p className="text-white text-base md:text-lg font-black tracking-tight mt-2 uppercase">Awwwards 1st Place Digital Canvas</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Asymmetric Swiss Grid 4-Step Cycle */}
        <section className="space-y-8 glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/60 shadow-[0_20px_50px_rgba(6,78,82,0.02)] transition-all duration-300">
          <div className="text-left space-y-1.5 border-b border-[#064e52]/5 pb-4">
            <span className="inline-block text-[8px] font-black tracking-widest text-[#064e52] bg-[#ccff00] px-3.5 py-1 rounded-md uppercase">
              LEARNING ARCHITECTURE
            </span>
            <h2 className="text-[#021e21] font-black text-xl tracking-tight uppercase">
              The 4-Step Recovery Loop
            </h2>
            <p className="text-slate-400 font-extrabold text-[9.5px] uppercase tracking-widest">
              How LoopNote transforms wrong answers into clarity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
            {[
              { num: "01", title: "오답 찰칵 스캔", desc: "틀린 오답 사진을 촬영하고, 풀이 시점의 마음 상태를 입력합니다." },
              { num: "02", title: "생각 막힘 진단", desc: "AI 소크라테스 알고리즘이 개념 연결망 내에서 오류 좌표를 산출합니다." },
              { num: "03", title: "10분 회복 미션", desc: "시각적 디스크 피자 조각을 마우스로 조작하며 원리를 유추해 냅니다." },
              { num: "04", title: "1:1 코칭 리포트", desc: "극복이 완료되면 부모 포털과 교사 대시보드로 실시간 전달됩니다." },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col justify-between p-6 bg-white/50 rounded-2xl border border-slate-150/40 hover:border-[#ccff00] hover:scale-[1.01] transition-all duration-200 min-h-[160px] text-left">
                <span className="text-lg font-black text-[#064e52]/30 font-serif italic">{step.num}</span>
                <div className="space-y-1">
                  <h3 className="text-[#021e21] font-black text-xs uppercase tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 font-bold leading-relaxed text-[10px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roles Portals Selector - Completely Emoji-Free */}
        <section className="space-y-6 text-left border-t border-[#064e52]/5 pt-8">
          <div className="space-y-1">
            <h2 className="text-[#021e21] font-black text-xl tracking-tight uppercase">
              Dashboard Entry Console
            </h2>
            <p className="text-slate-400 font-extrabold text-[9.5px] uppercase tracking-widest">
              Please choose your workspace to continue
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {[
              { role: "student", label: "학생 대시보드", desc: "오답 스캔 & 10분 생각 회복 루프 풀이", border: "hover:border-[#ccff00]" },
              { role: "parent", label: "학부모 대시보드", desc: "자녀의 실시간 종합 리포트 및 코칭 가이드", border: "hover:border-[#ccff00]" },
              { role: "teacher", label: "교사 대시보드", desc: "학급 취약 패턴 분석 및 오답 처방 제어", border: "hover:border-[#ccff00]" },
            ].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  router.push(`/login?role=${btn.role}`);
                }}
                className={`glass-card flex flex-col justify-between p-6 md:p-7 rounded-[2rem] border border-white/60 shadow-sm transition-all duration-300 ${btn.border} group text-left w-full focus:outline-none hover:scale-[1.01] active:scale-[0.99] cursor-pointer min-h-[170px]`}
              >
                <div className="space-y-2">
                  <span className="inline-block text-[8px] font-black tracking-widest text-[#064e52]/60 uppercase">{btn.role} workspace</span>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">{btn.label}</h3>
                  <p className="text-[10px] font-bold text-slate-400 leading-normal">{btn.desc}</p>
                </div>
                <div className="mt-4 w-full bg-slate-100/60 group-hover:bg-[#ccff00] py-2.5 rounded-xl text-center transition-all duration-200">
                  <span className="text-[10px] font-black text-[#064e52] uppercase tracking-widest">Connect console</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // LOGGED IN (AUTHENTICATED) STUDENT DASHBOARD - AWWRARDS SWISS GRID
  // =========================================================================
  return (
    <div className="flex flex-col gap-6 py-6 max-w-5xl mx-auto px-4 relative overflow-hidden bg-transparent">
      
      {/* Background lights */}
      <div className="absolute top-10 right-[-10%] w-72 h-72 bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-[-10%] w-60 h-60 bg-[#ccff00]/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Greeting Banner */}
      <section className="glass-card rounded-[2rem] border border-white/60 px-6 py-8 shadow-[0_20px_50px_rgba(6,78,82,0.02)] relative overflow-hidden flex items-center justify-between transition-all duration-300 hover:scale-[1.005]">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <InfinityLogo className="w-48 h-48 text-[#064e52]" />
        </div>
        <div className="relative z-10 space-y-2 text-left">
          <div className="inline-flex rounded-full bg-[#064e52]/5 border border-[#064e52]/10 px-3.5 py-1.5 text-[9.5px] font-black text-[#064e52] tracking-widest uppercase">
            ACTIVE STUDY MEMBER
          </div>
          <h1 className="text-[#021e21] font-black text-2xl md:text-3xl tracking-tight leading-snug">
            안녕, {studentName} <br className="sm:hidden" />
            <span className="text-[#064e52] font-serif italic font-normal">오늘은 10분만 복습해 볼까요?</span>
          </h1>
        </div>
      </section>

      {/* Today's Recovery Mission Banner - Emoji-free, sleek editorial */}
      <section className="rounded-[2.5rem] bg-gradient-to-r from-[#00282b] via-[#064e52] to-[#011417] text-white p-7 shadow-lg border border-[#00282b]/50 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5 transition-all duration-300 hover:shadow-xl group">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#ccff00]/10 rounded-full blur-[70px] pointer-events-none" />
        
        <div className="relative z-10 space-y-2 text-left">
          <span className="inline-block text-[8.5px] font-black bg-[#ccff00]/10 text-[#ccff00] px-3 py-1 rounded border border-[#ccff00]/25 tracking-widest uppercase">
            ACTIVE LOOP
          </span>
          <h2 className="text-white font-black text-xl md:text-2xl tracking-tight leading-none">
            수학 - 분수의 크기 비교
          </h2>
          <Typography as="p" variant="caption" className="text-teal-200/70 font-bold leading-relaxed text-[11px] max-w-lg">
            시각적 디스크 모델을 드래그해 움직이며 분모 분자의 개념을 직관적으로 이해해 보세요.
          </Typography>
        </div>

        <div className="relative z-10 flex-shrink-0">
          <Link
            href={continueMissionId ? `/missions/${continueMissionId}` : "/wrong-notes"}
            className="inline-flex items-center justify-center min-h-12 px-6 rounded-2xl bg-[#ccff00] hover:bg-[#e1ff66] text-[#00282b] font-black text-xs transition duration-200 shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer animate-pulse-glow"
          >
            {continueMissionId ? "오답 미션 이어하기 ➔" : "새로운 오답 찰칵 찍기 ➔"}
          </Link>
        </div>
      </section>

      {/* Grid of Loops List & Growth Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Active & Completed Loop Lists */}
        <div className="md:col-span-2 space-y-6 text-left">
          
          {/* In-progress Loops List */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
              <div className="flex items-center gap-2">
                <Typography as="h2" variant="h2" className="text-[#021e21] font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 진행 중인 회복 루프
                </Typography>
                <span className="text-[10px] bg-[#0d6e73]/5 text-[#0d6e73] font-black px-2 py-0.5 rounded shadow-sm border border-[#0d6e73]/10">
                  {activeMissions.length}
                </span>
              </div>
            </div>

            {activeMissions.length > 0 ? (
              <ul className="space-y-3.5">
                {activeMissions.map((item) => (
                  <li key={item.id} className="group">
                    <Link
                      href={`/missions/${item.id}`}
                      className="block rounded-3xl bg-white border border-slate-200/80 hover:border-[#ccff00] p-5.5 shadow-[0_8px_32px_rgba(6,78,82,0.015)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start mb-3.5">
                        <div>
                          <span className="text-[9px] font-black text-[#0d6e73] bg-[#0d6e73]/5 border border-[#0d6e73]/10 px-2.5 py-1 rounded uppercase tracking-wider">
                            {item.concept}
                          </span>
                          <Typography as="h3" variant="body" className="text-[#021e21] font-black text-sm mt-2.5">
                            {item.title}
                          </Typography>
                        </div>
                        <span className="text-[10px] font-black text-[#064e52] bg-teal-50 px-2.5 py-1 rounded shadow-sm border border-[#064e52]/10">
                          {item.progressPercent}% 진행
                        </span>
                      </div>
                      
                      {/* Premium Progress Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                        <div 
                          className="bg-gradient-to-r from-[#064e52] to-[#ccff00] h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase mt-2.5 tracking-widest">
                        <span>Socratic Step Progress</span>
                        <span>{item.currentStep} / {item.totalSteps} 힌트</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="glass-card rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center space-y-4 transition-all duration-300">
                <p className="text-slate-400 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                  현재 해결 중인 오답 회복 루프가 없네요. 첫 오답 스캔 후 맞춤형 처방 미션을 발급받아보세요!
                </p>
                <button
                  onClick={() => router.push("/wrong-notes")}
                  className="bg-[#064e52] hover:bg-[#00363a] text-white font-black text-xs py-3 px-6 rounded-2xl shadow-sm transition duration-200 cursor-pointer"
                >
                  오답 카메라 열기
                </button>
              </div>
            )}
          </section>

          {/* Completed History List */}
          <section className="space-y-3.5 pt-4">
            <div className="flex items-center justify-between border-b border-slate-100/60 pb-3">
              <div className="flex items-center gap-2">
                <Typography as="h2" variant="h2" className="text-[#021e21] font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 극복 마스터 내역
                </Typography>
                <span className="text-[10px] bg-[#ccff00] text-[#064e52] font-black px-2 py-0.5 rounded shadow-sm border border-[#064e52]/10">
                  {completedMissions.length}
                </span>
              </div>
            </div>

            {completedMissions.length > 0 ? (
              <ul className="space-y-2.5">
                {completedMissions.map((item) => (
                  <li 
                    key={item.id} 
                    className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-150/40 shadow-[0_4px_16px_rgba(6,78,82,0.01)] transition-all hover:scale-[1.005]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7.5 w-7.5 items-center justify-center rounded-xl bg-white border border-[#ccff00]/40 text-emerald-600 text-xs font-black shadow-sm">
                        ✓
                      </span>
                      <div>
                        <Typography as="h3" variant="body" className="font-black text-slate-800 text-xs">
                          {item.title}
                        </Typography>
                        <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                          {item.concept} · 마스터 완료
                        </span>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 shadow-sm flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c0-4-2-7-6-8 4-1 6-4 6-8 0 4 2 7 6 8-4 1-6 4-6 8z" /></svg>
                      <span>+12 EP 회복 완료</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/40 p-4.5 text-center">
                <p className="text-slate-400 font-bold text-[10px]">
                  성공적으로 마스터 완료한 미션 히스토리가 아직 비어 있습니다.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right column: Weekly Growth Progress Gauge & Visual Tips */}
        <div className="space-y-6 text-left">
          
          {/* Premium Weekly Growth Gauge Card */}
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] text-center flex flex-col items-center transition-all duration-300 hover:scale-[1.01]">
            <Typography as="h3" variant="body" className="text-[#021e21] font-black text-[11px] uppercase tracking-widest mb-4 border-b border-[#064e52]/5 pb-2.5 w-full">
              Weekly Recovery Stats
            </Typography>

            {/* Circular Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center animate-float">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="rgba(6,78,82,0.04)" 
                  strokeWidth="11" 
                  fill="transparent" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#growthGradDashboard)" 
                  strokeWidth="11" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 * (1 - 0.8)} 
                  strokeLinecap="round"
                  fill="transparent" 
                  className="transition-all duration-1000 ease-out"
                />
                
                <defs>
                  <linearGradient id="growthGradDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#064e52" />
                    <stop offset="100%" stopColor="#ccff00" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-[#064e52] tracking-tighter">80%</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Index</span>
              </div>
            </div>

            {/* Live DB Coaching Card Feed */}
            <div className="mt-5 bg-white/60 border border-slate-150/40 rounded-2xl p-4.5 w-full text-left relative overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-[#ccff00]" />
              <span className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Teacher's Live Coaching
              </span>
              <p className="text-[11.5px] font-bold text-[#064e52] leading-relaxed">
                {coachingFeedback ? (
                  coachingFeedback
                ) : (
                  <>
                    {studentName} 학생은 이번 주에 분수의 기초 개념을 <strong>80%</strong> 마스터했어요! 다음 단계인 대분수와 가분수 덧셈을 시도해봐도 좋습니다.
                  </>
                )}
              </p>
            </div>
          </section>

          {/* Quick Guidance Card */}
          <section className="rounded-[2rem] bg-[#ccff00]/10 border border-[#ccff00]/25 p-5 relative overflow-hidden">
            <h3 className="text-[#064e52] font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#064e52]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <span>루프학습 가이드</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
              문제를 찍을 때는 풀이 과정이나 고민을 최대한 함께 담아주세요. AI 선생님이 여러분이 막힌 오류 지점을 정확하게 찾아내 한층 정교한 3단계 회복 힌트를 제작해 줍니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
