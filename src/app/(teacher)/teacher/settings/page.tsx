"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button, Input, Typography } from "@/components/common";
import { createBrowserSupabaseClient } from "@/services/supabase";
import { useAuth } from "@/hooks/useAuth";

// ─── SVG 벡터 아이콘 ───────────────────────────────────────────
const Icons = {
  Alert: () => (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  Key: () => (
    <svg className="w-4 h-4 mr-2 text-brand-teal-light" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4 mr-2 text-brand-teal-light" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.645-.869L9.594 3.94z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4 text-brand-lime" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.187-.813L9 9l.813 5.187L15 15l-5.187.813zM18 10.5l-.5-3.5-3.5-.5 3.5-.5.5-3.5.5 3.5 3.5.5-3.5.5-.5 3.5z" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4 text-brand-teal-light mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

export default function TeacherSettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const isDemoTeacher = !isAuthenticated || (user && user.email === "teacher@loopnote.com");

  const [teacherId, setTeacherId] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [schoolName] = useState("서초초등학교"); 
  const [classGrade, setClassGrade] = useState("5");
  const [classNum, setClassNum] = useState("3");
  
  const [socratesDepth, setSocratesDepth] = useState<"immediate" | "socratic" | "deep">("socratic");
  const [targetRate, setTargetRate] = useState(80);

  const [notifications, setNotifications] = useState({
    strugglingStudent: true,
    emotionAlert: true,
    weeklyReport: true,
    parentConnected: false,
  });

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

      let { data: profile, error } = await supabase
        .from("profiles")
        .select("id, full_name, class_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) throw error;

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

        if (typeof window !== "undefined") {
          const stored = localStorage.getItem(`teacher_settings_${profile.id}`);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.socratesDepth) setSocratesDepth(parsed.socratesDepth);
              if (parsed.targetRate) setTargetRate(parsed.targetRate);
              if (parsed.notifications) setNotifications(parsed.notifications);
            } catch (e) {
              console.warn("로컬 설정 로드 실패:", e);
            }
          }
        }
      }
    } catch (err: any) {
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
    triggerToast("클래스 초대 코드가 클립보드에 복사되었습니다!");
  };

  // ── 설정값 저장 ─────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (isDemoTeacher) {
      alert("체험용 계정에서는 환경설정 저장이 제한됩니다. 로그인 후 내 학급에 맞게 세팅해 보세요!");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        triggerToast("로그인이 필요합니다.");
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

      if (typeof window !== "undefined") {
        localStorage.setItem(
          `teacher_settings_${session.user.id}`,
          JSON.stringify({
            socratesDepth,
            targetRate,
            notifications
          })
        );
      }

      triggerToast("교사 설정과 AI 소크라테스 튜터 발문 세팅이 성공적으로 반영되었습니다.");
      void loadProfile(); 
    } catch (err: any) {
      triggerToast(`저장 실패: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-brand-teal">
        <div className="w-12 h-12 rounded-full border-2 border-brand-teal border-t-brand-lime animate-spin" />
        <span className="text-sm font-medium tracking-widest font-sans uppercase">Loading Settings Panel</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 select-none pb-16 font-sans">
      
      {/* Top Banner */}
      <section className="glass-card rounded-[2.5rem] p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-lime/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="space-y-2.5">
          <Typography as="p" variant="caption" className="font-bold text-brand-teal/75 uppercase tracking-widest mb-1">
            System Config
          </Typography>
          <Typography as="h1" variant="h1" className="text-brand-teal font-extrabold text-2xl tracking-tight uppercase flex items-center gap-3">
            교사 포털 환경설정
          </Typography>
          <Typography as="p" variant="body" className="text-slate-400 font-semibold text-[11px] leading-relaxed max-w-xl">
            소크라테스 AI 튜터 피드백 세부 조정, 학급 연동 고유 키 관리, 실시간 알림 조건을 미세 제어합니다.
          </Typography>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Profile & Invite Code */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Profile form */}
          <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
            <div className="border-b border-slate-200/40 pb-4 flex items-center">
              <Icons.User />
              <Typography as="h2" variant="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest">
                교사 및 학급 프로필
              </Typography>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-brand-teal/80 uppercase tracking-widest block">소속 학교 (수정 불가)</label>
                <div className="bg-slate-50 border border-slate-150 rounded-2xl px-4.5 py-3.5 text-xs font-semibold text-slate-500 flex justify-between items-center cursor-not-allowed">
                  <span>{schoolName}</span>
                  <span className="text-[8.5px] font-bold text-brand-teal bg-brand-lime px-2 py-0.5 rounded border border-brand-teal/10 shadow-sm">기관 인증 완료</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-brand-teal/80 uppercase tracking-widest block">교사 이름</label>
                <Input 
                  value={teacherName} 
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 rounded-2xl border-slate-200 bg-white/50 focus:bg-white focus:border-brand-teal/50 shadow-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-brand-teal/80 uppercase tracking-widest block">담당 학년</label>
                  <select 
                    value={classGrade} 
                    onChange={(e) => setClassGrade(e.target.value)}
                    className="w-full min-h-[46px] px-4 bg-white/60 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all cursor-pointer"
                  >
                    {["1", "2", "3", "4", "5", "6"].map((g) => (
                      <option key={g} value={g}>{g}학년</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-brand-teal/80 uppercase tracking-widest block">담당 반</label>
                  <select 
                    value={classNum} 
                    onChange={(e) => setClassNum(e.target.value)}
                    className="w-full min-h-[46px] px-4 bg-white/60 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal focus:border-brand-teal transition-all cursor-pointer"
                  >
                    {["1", "2", "3", "4", "5", "6", "7", "8"].map((n) => (
                      <option key={n} value={n}>{n}반</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Connection Code */}
          <section className="glass-card rounded-[2.5rem] p-8 space-y-5">
            <div className="border-b border-slate-200/40 pb-4 flex items-center">
              <Icons.Key />
              <Typography as="h2" variant="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest">
                학급 연동 초대 코드
              </Typography>
            </div>

            <Typography as="p" variant="caption" className="text-slate-400 font-semibold leading-relaxed text-[11px]">
              학생이 회원가입 시 아래의 초대 코드를 입력하면 선생님 학급으로 실시간 연결됩니다.
            </Typography>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col items-center justify-center gap-3.5 relative overflow-hidden">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Unique Invite Code</span>
              <span className="text-[10.5px] font-bold text-brand-teal tracking-wider font-mono bg-white border border-slate-200/40 px-3.5 py-3 rounded-xl break-all text-center select-all shadow-sm w-full block">
                {teacherId || "연동 코드가 누락되었습니다."}
              </span>
              
              <button 
                onClick={handleCopyCode}
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white font-bold text-xs py-3.5 rounded-xl transition duration-200 cursor-pointer shadow-sm"
              >
                초대 코드 복사하기
              </button>
            </div>
          </section>
        </div>

        {/* Right column: AI details & Notification condition settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Socrates depth */}
          <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
            <div className="border-b border-slate-200/40 pb-4 flex justify-between items-center">
              <div className="flex items-center">
                <Icons.Settings />
                <Typography as="h2" variant="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest ml-2">
                  소크라테스 AI 튜터 피드백 강도
                </Typography>
              </div>
              <span className="inline-block text-[9px] font-bold bg-brand-lime text-brand-teal px-2.5 py-1 rounded uppercase tracking-widest shadow-sm">
                AI Core Config
              </span>
            </div>

            <div className="space-y-4">
              <label className="text-[9.5px] font-bold text-brand-teal/85 uppercase tracking-widest block">AI 발문 힌트 제공 강도 (Socratic Depth)</label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: "immediate",
                    title: "1단계: 즉각 힌트형",
                    desc: "질문에 대해 핵심 공식이나 직관적인 풀이 로직을 즉각 제시해 빠른 피드백을 줍니다."
                  },
                  {
                    id: "socratic",
                    title: "2단계: 단계별 유도형",
                    desc: "직접 답을 주기보다 힌트 질문을 차례대로 건네 학생 스스로 원리를 유추하도록 유도합니다.",
                    recommended: true
                  },
                  {
                    id: "deep",
                    title: "3단계: 개념 역추적형",
                    desc: "단순 연산 실수의 배후에 있는 하위 학년의 오개념까지 역추적하여 넓게 회복 미션을 처방합니다."
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSocratesDepth(item.id as any);
                      triggerToast(`AI 발문 강도가 [${item.title.split(":")[1].trim()}] 모드로 설정되었습니다.`);
                    }}
                    className={`text-left p-5 rounded-2xl border transition duration-200 flex flex-col justify-between relative overflow-hidden cursor-pointer ${
                      socratesDepth === item.id 
                        ? "border-brand-teal bg-brand-teal/5 text-brand-teal shadow-sm ring-1 ring-brand-teal/65" 
                        : "border-slate-200/80 hover:border-slate-300 bg-white/40"
                    }`}
                    type="button"
                  >
                    {item.recommended && (
                      <span className="absolute top-2.5 right-2.5 text-[7.5px] font-bold bg-brand-lime text-brand-teal px-2 py-0.5 rounded shadow-sm border border-brand-teal/10 uppercase tracking-wider">
                        추천
                      </span>
                    )}
                    
                    <div className="space-y-2.5">
                      <span className="text-xs font-extrabold tracking-tight block">{item.title}</span>
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

            {/* Target recovery Rate */}
            <div className="space-y-4 bg-slate-50 border border-slate-150 p-6 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 tracking-tight">학급 목표 주간 회복률 설정</span>
                <span className="text-[11.5px] font-bold text-brand-teal bg-brand-lime px-3 py-1 rounded-full shadow-sm border border-brand-teal/10">{targetRate}%</span>
              </div>
              
              <div className="flex items-center gap-4 py-2">
                <input
                  type="range"
                  min="60"
                  max="100"
                  step="5"
                  value={targetRate}
                  onChange={(e) => setTargetRate(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                />
              </div>
              
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                학급 리포트 대시보드에서 녹색 안정권으로 도달하는 기준 성취도 지표입니다. 설정값에 따라 긴급 추천 오답 미션의 발행 시점 알고리즘이 연동됩니다.
              </p>
            </div>
          </section>

          {/* Notifications config */}
          <section className="glass-card rounded-[2.5rem] p-8 space-y-6">
            <div className="border-b border-slate-200/40 pb-4 flex items-center">
              <Icons.Bell />
              <Typography as="h2" variant="h2" className="text-brand-teal font-extrabold text-xs uppercase tracking-widest">
                스마트 오답 위험 감지 및 실시간 알림 환경
              </Typography>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  key: "strugglingStudent",
                  title: "학습 지체 및 취약 오답 반복 경고 알림",
                  desc: "학생이 3회 연속 유사한 오답 개념에서 극복 미션을 실패할 때 대시보드에 알림을 노출합니다.",
                },
                {
                  key: "emotionAlert",
                  title: "학습 감정 상태 실시간 감지 알림",
                  desc: "오답 오개념에 반복 도달하며 높은 스트레스 지수가 수집된 관찰 대상 학생을 스마트 팝업 알림으로 알려줍니다.",
                },
                {
                  key: "weeklyReport",
                  title: "주간 클래스 리포트 완료 알림",
                  desc: "매주 일요일 저녁 학급 전체의 오답 연결 매트릭스와 AI 추천 발문 가이드 리포트 생성이 완료되면 이메일/앱푸시를 발송합니다.",
                },
                {
                  key: "parentConnected",
                  title: "학부모 종합 코칭 브리핑 발송 연동 자동화",
                  desc: "클래스 오답 극복 지수 변화 통계를 학부모 모바일 포털로 주간 단위 자동 정기 발송합니다.",
                }
              ].map((noti) => (
                <div key={noti.key} className="py-4.5 flex justify-between items-start gap-4 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-800 block tracking-tight">{noti.title}</span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-relaxed block">{noti.desc}</span>
                  </div>

                  {/* Switch */}
                  <button
                    onClick={() => {
                      setNotifications(prev => ({
                        ...prev,
                        [noti.key]: !prev[noti.key as keyof typeof notifications]
                      }));
                      triggerToast(`알림 설정 상태가 변경되었습니다.`);
                    }}
                    className={`shrink-0 w-11 h-6 rounded-full transition-all duration-200 relative flex items-center px-1 focus:outline-none cursor-pointer ${
                      notifications[noti.key as keyof typeof notifications] ? "bg-brand-teal" : "bg-slate-200"
                    }`}
                    type="button"
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-250 ${
                      notifications[noti.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Action trigger bar */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-brand-teal hover:bg-brand-teal-dark border-none text-white font-extrabold text-xs min-h-[48px] px-8 rounded-2xl shadow-md transition duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:bg-slate-350 cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>저장 진행 중</span>
                </>
              ) : (
                "설정값 저장하기"
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className="fixed left-1/2 bottom-12 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-2xl bg-brand-teal-dark text-white px-5 py-4 text-center text-xs font-semibold shadow-2xl border border-white/10 backdrop-blur-md">
            <span className="inline-block mr-1 text-brand-lime"><Icons.Sparkles /></span> {toastMessage}
          </div>
        </div>
      )}

    </div>
  );
}
