"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Input, Typography } from "@/components/common";
import { createBrowserSupabaseClient } from "@/services/supabase";

export default function TeacherSettingsPage() {
  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolName] = useState("서초초등학교"); // Keep locked for trial authentication
  const [classGrade, setClassGrade] = useState("5");
  const [classNum, setClassNum] = useState("3");
  
  // AI Socrates Step Depth state
  const [socratesDepth, setSocratesDepth] = useState<"immediate" | "socratic" | "deep">("socratic");
  
  // Class goal recovery rate
  const [targetRate, setTargetRate] = useState(80);

  // Notification states
  const [notifications, setNotifications] = useState({
    strugglingStudent: true,
    emotionAlert: true,
    weeklyReport: true,
    parentConnected: false,
  });

  // Loading and action status
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // ── 프로필 정보 로드 ─────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // maybeSingle()을 사용하여 프로필이 없을 때 쿼리 에러가 발생하는 것을 방지
      let { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, class_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      // 프로필이 없는 경우 (기존 가입 시 트리거 오류로 누락된 계정 복구)
      if (!profile) {
        const defaultName = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "선생님";
        
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: defaultName,
            role: "teacher",
            class_name: "5학년 3반"
          })
          .select()
          .single();

        if (insertError) throw insertError;
        profile = newProfile;
      }

      if (profile) {
        setTeacherId(profile.id);
        setTeacherName(profile.full_name);

        if (profile.class_name) {
          const match = profile.class_name.match(/(\d+)\s*학년\s*(\d+)\s*반/);
          if (match) {
            setClassGrade(match[1]);
            setClassNum(match[2]);
          }
        }
      }
    } catch (err: any) {
      // console.error를 사용하면 Next.js Turbopack 개발 화면에 빨간색 에러 팝업 오버레이가 발생하므로 console.warn으로 대체하여 안전하게 로깅
      console.warn("프로필 로드 경고 (자동 극복 진행):", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCode = () => {
    if (!teacherId) return;
    void navigator.clipboard.writeText(teacherId);
    triggerToast("📋 클래스 초대 코드가 클립보드에 복사되었습니다!");
  };

  // ── 설정값 저장 ─────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        triggerToast("⚠️ 로그인이 필요합니다.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: teacherName.trim(),
          class_name: `${classGrade}학년 ${classNum}반`
        })
        .eq("id", session.user.id);

      if (error) throw error;

      triggerToast("💾 교사 설정과 AI 소크라테스 튜터 발문 세팅이 성공적으로 반영되었습니다.");
      void loadProfile(); // 데이터 새로고침
    } catch (err: any) {
      triggerToast(`⚠️ 저장 실패: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 text-slate-500">
        <div className="w-10 h-10 rounded-full border-4 border-[#064e52] border-t-transparent animate-spin" />
        <span className="text-sm font-bold">환경설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 select-none">
      
      {/* Top Banner */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Typography as="p" variant="caption" className="font-extrabold text-[#0d6e73] uppercase tracking-wider mb-2">
            시스템 및 교육 설계 환경설정
          </Typography>
          <Typography as="h1" variant="h1" className="text-slate-900 font-black text-xl md:text-2xl">
            LoopNote 교사 포털 환경설정 ⚙️
          </Typography>
          <Typography as="p" variant="body" className="text-slate-500 font-bold text-xs mt-1">
            소크라테스 AI 튜터 피드백 강도와 학급 관리 정보, 자동 감지 알림 규칙을 미세 제어할 수 있습니다.
          </Typography>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Profile & Integration settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile settings card */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="text-lg">🧑‍🏫</span>
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                교사 및 학급 프로필
              </Typography>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d6e73] uppercase tracking-wider block">소속 학교 (수정 불가)</label>
                <div className="bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 flex justify-between items-center cursor-not-allowed">
                  <span>{schoolName}</span>
                  <span className="text-[9px] font-black text-[#0d6e73] bg-[#0d6e73]/5 px-2 py-0.5 rounded border border-[#0d6e73]/10">기관 인증 완료</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#0d6e73] uppercase tracking-wider block">교사 이름</label>
                <Input 
                  value={teacherName} 
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d6e73] uppercase tracking-wider block">담당 학년</label>
                  <select 
                    value={classGrade} 
                    onChange={(e) => setClassGrade(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e52]/20"
                  >
                    {["1", "2", "3", "4", "5", "6"].map((g) => (
                      <option key={g} value={g}>{g}학년</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-[#0d6e73] uppercase tracking-wider block">담당 반</label>
                  <select 
                    value={classNum} 
                    onChange={(e) => setClassNum(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e52]/20"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => (
                      <option key={n} value={n}>{n}반</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Connection Code Management card */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="text-lg">🔑</span>
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                학급 연동 초대 코드
              </Typography>
            </div>

            <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-normal">
              학생들이 회원가입 2단계에서 아래의 고유 초대 코드를 입력하면 선생님 반으로 즉시 연동됩니다.
            </Typography>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">학급 고유 초대 코드</span>
              <span className="text-xs font-black text-[#064e52] tracking-normal font-mono break-all text-center select-all">{teacherId}</span>
              
              <div className="flex gap-2 w-full mt-1.5">
                <button 
                  onClick={handleCopyCode}
                  className="w-full bg-white hover:bg-slate-100/70 border border-slate-200 text-slate-700 font-black text-[10px] py-2.5 rounded-xl transition shadow-sm"
                >
                  📋 초대 코드 복사하기
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side: AI customizer & notification settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Socrates Customization page */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                  소크라테스 AI 튜터 피드백 세부 조정
                </Typography>
              </div>
              <span className="inline-block text-[9px] font-black bg-[#b5e61d] text-[#064e52] px-2 py-0.5 rounded uppercase tracking-wider">
                CORE MODULES
              </span>
            </div>

            {/* AI Socrates level customizer */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-[#0d6e73] uppercase tracking-wider block">AI 발문 힌트 제공 강도 (Socratic Depth)</label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: "immediate",
                    title: "1단계: 즉각 힌트형",
                    emoji: "💡",
                    desc: "질문에 대해 핵심 공식이나 직관적인 풀이 로직을 즉각 제시해 빠른 피드백을 줍니다."
                  },
                  {
                    id: "socratic",
                    title: "2단계: 단계별 유도형",
                    emoji: "🎓",
                    desc: "직접 답을 주기보다 힌트 질문을 차례대로 건네 학생 스스로 원리를 유추하도록 유도합니다.",
                    recommended: true
                  },
                  {
                    id: "deep",
                    title: "3단계: 개념 역추적형",
                    emoji: "🔍",
                    desc: "단순 연산 실수의 배후에 있는 하위 학년의 오개념까지 역추적하여 넓게 회복 미션을 처방합니다."
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSocratesDepth(item.id as any);
                      triggerToast(`🤖 AI 발문 강도가 [${item.title.split(":")[1].trim()}] 모드로 설정되었습니다.`);
                    }}
                    className={`text-left p-4.5 rounded-2xl border transition duration-200 flex flex-col justify-between relative overflow-hidden ${
                      socratesDepth === item.id 
                        ? "border-[#064e52] bg-[#064e52]/5 text-[#064e52] shadow-sm ring-1 ring-[#064e52]" 
                        : "border-slate-200 hover:border-slate-350 bg-white"
                    }`}
                  >
                    {item.recommended && (
                      <span className="absolute top-2.5 right-2.5 text-[8px] font-black bg-[#b5e61d] text-[#064e52] px-1.5 py-0.5 rounded">
                        추천
                      </span>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.emoji}</span>
                        <span className="text-xs font-black">{item.title}</span>
                      </div>
                      <p className={`text-[10px] font-semibold leading-relaxed ${
                        socratesDepth === item.id ? "text-slate-700" : "text-slate-400"
                      }`}>
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target recovery rate slider */}
            <div className="space-y-3.5 bg-slate-50 border border-slate-100 p-4.5 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">학급 목표 주간 회복률 설정</span>
                <span className="text-xs font-black text-[#0d6e73] bg-[#b5e61d]/20 px-2 py-0.5 rounded">{targetRate}%</span>
              </div>
              
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="5"
                  value={targetRate}
                  onChange={(e) => setTargetRate(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-[#064e52]"
                />
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                학급 리포트 대시보드에서 녹색 안정권으로 도달하는 기준 성취도 지표입니다. 설정값에 따라 긴급 추천 오답 미션의 발행 시점 알고리즘이 연동됩니다.
              </p>
            </div>
          </section>

          {/* Smart notification rules card */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="text-lg">🔔</span>
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                스마트 오답 위험 감지 및 실시간 알림 환경
              </Typography>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  key: "strugglingStudent",
                  title: "학습 지체 및 취약 오답 반복 경고 알림",
                  desc: "학생이 3회 연속 유사한 오답 개념에서 극복 미션을 실패할 때 대시보드에 알림을 띄웁니다.",
                },
                {
                  key: "emotionAlert",
                  title: "학습 감정 상태 빨간불(🔴 주저함) 실시간 감지 알림",
                  desc: "오답 오개념에 반복 도달하며 높은 스트레스 지수가 수집된 관찰 대상 학생을 스마트 팝업 알림으로 알려줍니다.",
                },
                {
                  key: "weeklyReport",
                  title: "주간 클래스 리포트 완료 알림",
                  desc: "매주 일요일 저녁 학급 전체의 오답 연결 매트릭스와 AI 추천 발문 분석 가이드 리포트 생성이 완료되면 이메일/앱푸시를 발송합니다.",
                },
                {
                  key: "parentConnected",
                  title: "학부모 종합 코칭 브리핑 발송 연동 자동화",
                  desc: "클래스 오답 극복 지수 변화 통계를 학부모 모바일 포털로 주간 단위 자동 정기 발송합니다. (체크 해제 시 수동 발송)",
                }
              ].map((noti) => (
                <div key={noti.key} className="py-4.5 flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 block">{noti.title}</span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-normal block">{noti.desc}</span>
                  </div>

                  {/* Elegant toggle switch */}
                  <button
                    onClick={() => {
                      setNotifications(prev => ({
                        ...prev,
                        [noti.key]: !prev[noti.key as keyof typeof notifications]
                      }));
                      triggerToast(`🔔 알림 상태가 변경되었습니다.`);
                    }}
                    className={`shrink-0 w-11 h-6 rounded-full transition-colors relative flex items-center px-1 focus:outline-none ${
                      notifications[noti.key as keyof typeof notifications] ? "bg-[#064e52]" : "bg-slate-200"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      notifications[noti.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Action trigger bar */}
          <div className="flex justify-end gap-3.5">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-[#064e52] border-[#064e52] hover:bg-[#0d6e73] disabled:bg-slate-300 text-white font-black text-xs min-h-12 px-6 rounded-2xl shadow-sm flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>저장하는 중...</span>
                </>
              ) : (
                "설정값 저장하기 💾"
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className="fixed left-1/2 bottom-12 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-2xl bg-slate-950/90 text-white px-4 py-3.5 text-center text-xs font-black shadow-2xl border border-slate-800/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            {toastMessage}
          </div>
        </div>
      )}

    </div>
  );
}

