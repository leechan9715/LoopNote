"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { createBrowserSupabaseClient } from "@/services/supabase";
import { useAuth } from "@/hooks/useAuth";

// ─── 타입 정의 ────────────────────────────────────────────────
interface StudentData {
  id: string;
  name: string;
  classGroup: string;
  todayLoops: number;
  recoveryRate: number;
  confidence: "상" | "중" | "하";
  recentAction: string;
  weakConcept: string;
  coachingFeedback: string;
  completedMissions: number;
  totalQuestions: number;
  lastActiveLabel: string;
}

interface TeacherStats {
  totalStudents: number;
  avgRecoveryRate: number;
  lowConfidenceCount: number;
  activeToday: number;
}

interface TopError {
  rank: number;
  name: string;
  students: number;
  desc: string;
}

interface ClassData {
  teacher: { id: string; name: string; className: string };
  stats: TeacherStats;
  students: StudentData[];
  topErrors: TopError[];
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

// ─── SVG 벡터 아이콘 ───────────────────────────────────────────
const Icons = {
  Refresh: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  ),
  Alert: () => (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  Lightning: () => (
    <svg className="w-4 h-4 text-brand-lime" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

export default function TeacherDashboard() {
  const { user, isAuthenticated } = useAuth();
  const isDemoTeacher = !isAuthenticated || (user && user.email === "teacher@loopnote.com");

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"chart" | "map">("chart");

  const [selectedStudentForCoaching, setSelectedStudentForCoaching] = useState<StudentData | null>(null);
  const [coachingFeedbackText, setCoachingFeedbackText] = useState<string>("");
  const [coachingOptions, setCoachingOptions] = useState({ sendToParent: true, prescribeWrongNotes: true });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sendingMission, setSendingMission] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // ── 실제 데이터 로드 ──────────────────────────────────────────
  const loadClassData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoadError("로그인이 필요합니다.");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/teacher/class", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const errBody = await res.json() as { error?: string };
        throw new Error(errBody.error ?? "데이터를 불러오지 못했습니다.");
      }

      const data = await res.json() as ClassData;
      setClassData(data);
    } catch (err: any) {
      setLoadError(err?.message ?? "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadClassData();

    const channel = supabase
      .channel("teacher-class-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        () => {
          void loadClassData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recovery_missions" },
        () => {
          void loadClassData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadClassData, supabase]);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // ── 미션 전송 ────────────────────────────────────────────────
  const handleSendMission = async (student: StudentData) => {
    if (isDemoTeacher) {
      alert("체험용 계정에서는 1:1 코칭 리포트 발행 및 오답 미션 처방이 불가능합니다. 로그인 후 실제 학급을 지도해 보세요!");
      return;
    }
    setSendingMission(student.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast("로그인이 필요합니다.", "warning"); return; }

      const res = await fetch("/api/teacher/mission-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ studentId: student.id }),
      });

      const result = await res.json() as { success?: boolean; message?: string; error?: string };
      if (!res.ok) throw new Error(result.error ?? "미션 전송 실패");

      showToast(`${student.name} 학생의 오답 미션이 활성화되었습니다!`, "success");
      void loadClassData();
    } catch (err: any) {
      showToast(`미션 전송 실패: ${err?.message}`, "warning");
    } finally {
      setSendingMission(null);
    }
  };

  const handleSendRecommendedMission = (conceptName: string, studentCount: number) => {
    if (isDemoTeacher) {
      alert("체험용 계정에서는 1:1 코칭 리포트 발행 및 오답 미션 처방이 불가능합니다. 로그인 후 실제 학급을 지도해 보세요!");
      return;
    }
    showToast(`'${conceptName}' 오답 학생 ${studentCount}명에게 맞춤형 보충 미션을 전송했습니다!`, "success");
  };

  const handleOpenCoachingModal = (student: StudentData) => {
    setSelectedStudentForCoaching(student);
    setCoachingFeedbackText(student.coachingFeedback);
    setCoachingOptions({ sendToParent: true, prescribeWrongNotes: true });
  };

  const handleSendCoachingReport = async () => {
    if (isDemoTeacher) {
      alert("체험용 계정에서는 1:1 코칭 리포트 발행 및 오답 미션 처방이 불가능합니다. 로그인 후 실제 학급을 지도해 보세요!");
      setSelectedStudentForCoaching(null);
      return;
    }
    if (!selectedStudentForCoaching) return;
    const actions = [];
    if (coachingOptions.sendToParent) actions.push("가정 통신문 연동");
    if (coachingOptions.prescribeWrongNotes) {
      actions.push("오답 회복 미션 발행");
      await handleSendMission(selectedStudentForCoaching);
    }

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ coaching_feedback: coachingFeedbackText })
        .eq("id", selectedStudentForCoaching.id);

      if (updateError) {
        throw updateError;
      }
    } catch (dbErr) {
      console.warn("DB update failed, using localStorage fallback:", dbErr);
      if (typeof window !== "undefined") {
        localStorage.setItem(`coaching_feedback_${selectedStudentForCoaching.id}`, coachingFeedbackText);
      }
    }

    showToast(`${selectedStudentForCoaching.name} 학생 1:1 코칭 리포트가 전송되었습니다! (${actions.join(", ")})`, "success");
    setSelectedStudentForCoaching(null);
  };

  // ── 필터 로직 ────────────────────────────────────────────────
  const allStudents = classData?.students ?? [];
  const stats = classData?.stats;
  const topErrors = useMemo(() => {
    const base = classData?.topErrors ?? [];
    return base.filter((e) => {
      if (selectedSubject === "math") return !e.name.includes("낱말") && !e.name.includes("문장");
      if (selectedSubject === "korean") return e.name.includes("낱말") || e.name.includes("문장");
      return true;
    });
  }, [classData, selectedSubject]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(q) && !student.weakConcept.toLowerCase().includes(q)) return false;
      }
      if (studentFilter === "wrong") return student.recoveryRate < 80;
      if (studentFilter === "lowConfidence") return student.confidence === "하";
      if (studentFilter === "completed") return student.recentAction.includes("완료");
      return true;
    });
  }, [allStudents, searchQuery, studentFilter]);

  // ── 로딩 / 에러 상태 ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-brand-teal">
        <div className="w-12 h-12 rounded-full border-2 border-brand-teal border-t-brand-lime animate-spin" />
        <span className="text-sm font-medium tracking-widest font-sans uppercase">Loading Analytics Console</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 border border-rose-500/10 rounded-[2.5rem] bg-rose-500/5 max-w-xl mx-auto p-8 text-center">
        <Icons.Alert />
        <span className="text-sm font-semibold text-rose-500/95 font-sans leading-relaxed">{loadError}</span>
        <button
          onClick={() => void loadClassData()}
          className="bg-brand-teal text-white text-xs font-bold px-6 py-3 rounded-full hover:bg-brand-teal-light transition duration-300 font-sans tracking-wider uppercase active:scale-95 shadow-lg shadow-brand-teal/20"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // 담당 학생이 없는 경우 안내 화면
  if (allStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 text-center max-w-xl mx-auto p-12 border border-slate-200/50 rounded-[3rem] bg-white/40 backdrop-blur-md">
        <div className="w-16 h-16 rounded-full bg-brand-teal/5 flex items-center justify-center text-brand-teal font-serif text-2xl border border-brand-teal/10">C</div>
        <h2 className="text-xl font-bold tracking-tight text-brand-teal font-sans">No Students Associated</h2>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Students must enter your Teacher ID during registration, or profiles can be updated manually in Supabase.
        </p>
        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 text-[10px] font-mono text-slate-500 w-full text-left">
          <p className="font-bold text-brand-teal mb-1.5 uppercase tracking-wider">Your Unique Teacher ID:</p>
          <p className="break-all select-all font-semibold bg-white p-2.5 rounded border border-slate-250/20">{classData?.teacher.id ?? "Loading..."}</p>
        </div>
        <button onClick={() => void loadClassData()} className="bg-brand-teal text-white text-xs font-bold px-6 py-3 rounded-full hover:bg-brand-teal-light transition duration-300 font-sans tracking-wider uppercase active:scale-95 shadow-lg shadow-brand-teal/20">
          Refresh Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 select-none animate-in fade-in duration-500 font-sans pb-20">
      
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex items-center gap-3.5 bg-brand-teal-dark/95 text-white px-5 py-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto max-w-sm">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-teal font-bold">
              <Icons.Check />
            </div>
            <span className="font-semibold text-xs leading-relaxed font-sans">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ── HEADER HERO FRAME ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-brand-teal-dark border border-white/5 shadow-2xl min-h-[220px] flex items-center">
        {/* Banner Backdrop */}
        <div className="absolute inset-0 opacity-40 mix-blend-luminosity hover:opacity-55 transition-opacity duration-700">
          <Image 
            src="/teacher_dashboard_banner.png" 
            alt="Teacher Analytics Waves" 
            fill 
            priority
            className="object-cover" 
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-teal-dark via-brand-teal-dark/80 to-transparent" />
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-block text-[9px] font-bold bg-brand-lime text-brand-teal px-3 py-1 rounded-md uppercase tracking-widest font-sans">
              Analytical Matrix
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight font-sans uppercase">
              학급 오답 분석 콘솔
            </h1>
            <p className="text-teal-100/70 text-xs font-semibold leading-relaxed max-w-xl">
              {classData?.teacher.className} · 실시간 코호트 오답 유형 분류 및 1:1 보충 학습 설계용 스마트 텔레메트리 보드입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-bold text-teal-350 uppercase tracking-widest leading-none">Subject Sector</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="min-h-10 px-4 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-brand-lime/30 rounded-xl text-xs font-bold text-white transition focus:outline-none focus:ring-1 focus:ring-brand-lime cursor-pointer"
              >
                <option value="all" className="bg-brand-teal-dark text-white">전체 과목 (All)</option>
                <option value="math" className="bg-brand-teal-dark text-white">수학 (Mathematics)</option>
                <option value="korean" className="bg-brand-teal-dark text-white">국어 (Language Arts)</option>
              </select>
            </div>
            <button
              onClick={() => void loadClassData()}
              className="mt-3.5 min-h-10 px-4.5 bg-brand-lime hover:bg-brand-lime-hover text-brand-teal rounded-xl text-xs font-bold transition duration-300 active:scale-95 flex items-center gap-2 shadow-md shadow-brand-lime/10 cursor-pointer"
            >
              <Icons.Refresh />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI METRIC PANELS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: "전체 학생", val: stats?.totalStudents ?? 0, suffix: "명", desc: "분석 활성 학습 그룹", type: "standard" },
          { label: "학급 평균 회복률", val: `${stats?.avgRecoveryRate ?? 0}%`, suffix: "", desc: "오답 미션 달성 성공 지수", type: "lime" },
          { label: "오늘 활동 학생", val: stats?.activeToday ?? 0, suffix: "명", desc: "실시간 학습 루프 동기화", type: "standard" },
          { label: "집중 케어 필요", val: stats?.lowConfidenceCount ?? 0, suffix: "명", valColor: "text-rose-500", desc: "자신감 지표 하위 집중군", type: "rose" }
        ].map((card, idx) => (
          <div key={idx} className="glass-card p-6 rounded-[2rem] flex flex-col justify-between transition-all duration-300 hover:scale-[1.01] hover:shadow-lg relative overflow-hidden group">
            {card.type === "lime" && <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-brand-lime/10 to-transparent rounded-bl-full pointer-events-none" />}
            {card.type === "rose" && <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-rose-500/10 to-transparent rounded-bl-full pointer-events-none" />}
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded uppercase tracking-wider">kpi.{idx + 1}</span>
            </div>
            <div className="mt-6 flex items-baseline gap-1">
              <span className={`text-4xl font-extrabold tracking-tight ${card.valColor || "text-brand-teal"} font-sans`}>{card.val}</span>
              {card.suffix && <span className="text-slate-400 text-xs font-semibold">{card.suffix}</span>}
            </div>
            <div className="mt-2 text-[10px] text-slate-450 font-semibold">{card.desc}</div>
          </div>
        ))}
      </div>

      {/* ── TWO COLUMN: COHORT TOP ERRORS + VISUAL HEATMAP ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 공통 오류 유형 TOP */}
        <div className="glass-card rounded-[2rem] p-8 flex flex-col gap-6 relative">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-teal text-white font-extrabold text-[10.5px] font-sans shadow-sm">
                {topErrors.length}
              </span>
              <h2 className="text-sm font-extrabold text-brand-teal uppercase tracking-widest">공통 취약점 TOP {topErrors.length}</h2>
            </div>
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Patterns Classify</span>
          </div>

          <div className="flex flex-col gap-4 flex-grow">
            {topErrors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-450 gap-3 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
                <span className="text-xs font-semibold">데이터 분석을 대기하고 있습니다.</span>
              </div>
            )}
            {topErrors.map((error, idx) => {
              const percentages = [85, 68, 52, 38, 20];
              const percent = percentages[idx] ?? 15;
              
              const rankColor = error.rank === 1 
                ? "bg-rose-550 text-white shadow-rose-300" 
                : error.rank === 2 
                  ? "bg-amber-550 text-white shadow-amber-300" 
                  : "bg-slate-200 text-slate-700";

              return (
                <div key={error.rank} className="group p-4 bg-white/60 border border-slate-100 hover:border-slate-200 rounded-2xl transition-all duration-300 flex flex-col gap-4 hover:shadow-sm hover:scale-[1.005]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase ${rankColor}`}>
                        r.{error.rank}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block tracking-tight">{error.name}</span>
                        <span className="text-[10px] font-semibold text-slate-400 block mt-1 leading-relaxed">{error.desc}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-rose-500 shrink-0 bg-rose-50 border border-rose-100/50 rounded px-2 py-0.5 shadow-sm">
                      {error.students}건 검출
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${
                        error.rank === 1 ? "bg-rose-500" : error.rank === 2 ? "bg-amber-400" : "bg-brand-teal"
                      }`} style={{ width: `${percent}%` }} />
                    </div>
                    <button
                      onClick={() => handleSendRecommendedMission(error.name, error.students)}
                      className="shrink-0 text-[10px] font-bold bg-brand-lime hover:bg-brand-lime-hover text-brand-teal px-3.5 py-1.5 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                      type="button"
                    >
                      AI 보충미션 활성화
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 취약 단원 시각화 */}
        <div className="glass-card rounded-[2rem] p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-200/40 pb-4">
            <h2 className="text-sm font-extrabold text-brand-teal uppercase tracking-widest">학급 성장 코호트 분석</h2>
            <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/30">
              {(["chart", "map"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === tab ? "bg-white text-brand-teal shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`} type="button">
                  {tab === "chart" ? "자신감 분포" : "오늘 활동 현황"}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "chart" ? (
            <div className="flex-grow flex flex-col gap-6 justify-center">
              {/* 회복률 분포 차트 */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
                <div className="relative flex items-center justify-center animate-float">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(6,78,82,0.03)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="url(#teacherGaugeGrad)" strokeWidth="3" strokeDasharray={`${stats?.avgRecoveryRate ?? 0}, 100`} strokeLinecap="round" className="transition-all duration-1000" />
                    <defs>
                      <linearGradient id="teacherGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#064e52" />
                        <stop offset="100%" stopColor="#ccff00" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold text-brand-teal tracking-tighter font-sans">{stats?.avgRecoveryRate ?? 0}%</span>
                    <span className="text-[7.5px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Recovery Avg</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 flex-grow w-full">
                  <span className="text-[10px] font-bold text-brand-teal border-b border-slate-100 pb-1.5 block tracking-wider uppercase">Confidence Levels</span>
                  {[
                    { label: "완벽 복구 (상)", count: allStudents.filter(s => s.confidence === "상").length, color: "bg-emerald-450" },
                    { label: "복구 중 (중)", count: allStudents.filter(s => s.confidence === "중").length, color: "bg-amber-450" },
                    { label: "복구 정체 (하)", count: allStudents.filter(s => s.confidence === "하").length, color: "bg-rose-450" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="flex-1 font-semibold">{label}</span>
                      <span className="font-extrabold text-slate-800">{count}명</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5 bg-slate-50/50 border border-slate-150/40 p-5 rounded-2xl">
                <span className="text-[9px] font-bold text-brand-teal uppercase tracking-widest">회복률 분포 통계</span>
                {[
                  { label: "80% 이상 (우수)", count: allStudents.filter(s => s.recoveryRate >= 80).length, color: "bg-emerald-400" },
                  { label: "50~79% (보통)", count: allStudents.filter(s => s.recoveryRate >= 50 && s.recoveryRate < 80).length, color: "bg-amber-400" },
                  { label: "50% 미만 (집중관리)", count: allStudents.filter(s => s.recoveryRate < 50).length, color: "bg-rose-450" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{label}</span><span className="font-extrabold">{count}명</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: allStudents.length > 0 ? `${(count / allStudents.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col gap-4 py-1">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">오늘 활동 중인 학생 (Active Today)</p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {allStudents.filter(s => s.todayLoops > 0).length === 0 ? (
                  <p className="text-xs text-slate-450 py-8 text-center font-semibold">오늘 활동한 학생이 없습니다.</p>
                ) : (
                  allStudents.filter(s => s.todayLoops > 0).map(s => (
                    <div key={s.id} className="flex items-center gap-3.5 p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm transition hover:scale-[1.005]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white text-xs font-bold shrink-0">{s.name[0]}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-slate-800">{s.name}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold truncate mt-0.5">{s.recentAction}</span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">{s.todayLoops}개 루프</span>
                    </div>
                  ))
                )}
              </div>

              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-4">최근 미활동 학생 (Inactive / Care Required)</p>
              <div className="space-y-2">
                {allStudents.filter(s => s.todayLoops === 0 && s.confidence === "하").slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center gap-3.5 p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-bold shrink-0">{s.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800">{s.name}</span>
                      <span className="block text-[10px] text-rose-500 font-semibold mt-0.5">{s.lastActiveLabel} 마지막 활동</span>
                    </div>
                    <button onClick={() => void handleSendMission(s)}
                      disabled={sendingMission === s.id}
                      className="text-[9.5px] font-bold bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer">
                      {sendingMission === s.id ? "전송 중" : "보충처방 활성"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STUDENT TELEMETRY TABLE ───────────────────────────── */}
      <div className="glass-card rounded-[2rem] p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-brand-teal uppercase tracking-widest">학생별 실시간 오답 성적표</h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">클래스 학생들의 데이터 실시간 모니터링 보드</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input type="text" placeholder="학생 이름 또는 취약오답 검색..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-10 pl-9 pr-4 bg-slate-50 border border-slate-200 focus:border-brand-teal rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none transition w-60" />
              <div className="absolute left-3 top-3.5 text-slate-405">
                <Icons.Search />
              </div>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
              {[
                { id: "all", label: "전체" },
                { id: "wrong", label: "취약 오답" },
                { id: "lowConfidence", label: "집중 관리" },
                { id: "completed", label: "마스터 완료" },
              ].map((btn) => (
                <button key={btn.id} onClick={() => setStudentFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                    studentFilter === btn.id ? "bg-white text-brand-teal shadow-sm" : "text-slate-500 hover:text-slate-750"
                  }`} type="button">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white/50">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-brand-teal/5 font-bold text-brand-teal text-[10.5px]">
              <tr>
                <th className="px-5 py-4 rounded-tl-2xl">이름</th>
                <th className="px-5 py-4">학급/반</th>
                <th className="px-5 py-4 text-center">오늘 루프</th>
                <th className="px-5 py-4">회복지수</th>
                <th className="px-5 py-4 text-center">자신감</th>
                <th className="px-5 py-4">최근 활동</th>
                <th className="px-5 py-4 text-right rounded-tr-2xl">피드백 처방</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70 font-semibold text-slate-650">
              {filteredStudents.map((student) => {
                const confStyles = {
                  상: "bg-emerald-50 text-emerald-600 border border-emerald-150",
                  중: "bg-sky-50 text-sky-600 border border-sky-150",
                  하: "bg-rose-50 text-rose-600 border border-rose-150",
                }[student.confidence];

                const actDot: Record<string, string> = {
                  "미션 완료": "bg-emerald-500",
                  "미션 진행 중": "bg-blue-500",
                  "오답 풀이 중": "bg-amber-400",
                  "오답 등록됨": "bg-teal-400",
                  "대기 중": "bg-slate-300",
                };
                const dot = actDot[student.recentAction] ?? "bg-slate-400";

                return (
                  <tr key={student.id} className="hover:bg-white transition-colors duration-150">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white text-xs font-bold">{student.name[0]}</span>
                        <div className="flex flex-col">
                          <span className="text-slate-800 text-xs font-bold">{student.name}</span>
                          <span className="text-[9px] text-rose-500 font-semibold mt-0.5 max-w-[140px] truncate">{student.weakConcept}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs font-medium">{student.classGroup}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        student.todayLoops > 3 ? "bg-brand-lime text-brand-teal" :
                        student.todayLoops > 0 ? "bg-teal-50 text-brand-teal" : "bg-slate-100 text-slate-400"
                      }`}>{student.todayLoops}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full rounded-full ${
                            student.recoveryRate >= 80 ? "bg-emerald-400" :
                            student.recoveryRate >= 50 ? "bg-amber-400" : "bg-rose-455"
                          }`} style={{ width: `${student.recoveryRate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-800">{student.recoveryRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${confStyles}`}>{student.confidence}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
                        <span className="text-[11px] text-slate-500 font-medium">{student.recentAction}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleSendMission(student)}
                          disabled={sendingMission === student.id}
                          className="text-[9.5px] font-bold bg-[#ccff00] hover:bg-[#b8e600] disabled:bg-slate-100 text-brand-teal px-3 py-1.5 rounded-lg transition border border-transparent hover:scale-[1.01] cursor-pointer"
                          type="button"
                        >
                          {sendingMission === student.id ? "처방중" : "미션 처방"}
                        </button>
                        <button
                          onClick={() => handleOpenCoachingModal(student)}
                          className="text-[9.5px] font-bold text-brand-teal bg-teal-50 hover:bg-teal-50/80 border border-teal-200/50 rounded-lg px-3 py-1.5 transition active:scale-95 cursor-pointer"
                          type="button"
                        >
                          1:1 코칭
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-medium">
                    일치하는 학생 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-400 border-t border-slate-100 pt-4">
          <span>검색 결과: 총 {filteredStudents.length}명 / {allStudents.length}명</span>
        </div>
      </div>

      {/* ── 1:1 COACHING MODAL ─────────────────────────────────── */}
      {selectedStudentForCoaching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-teal-dark/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-150/40">
            <div className="bg-brand-teal p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <span className="text-[8px] font-bold text-brand-lime uppercase tracking-widest block">1:1 Personal Coaching</span>
                <h3 className="text-lg font-bold text-white mt-1 tracking-tight">{selectedStudentForCoaching.name} 학생 코칭 리포트</h3>
              </div>
              <button onClick={() => setSelectedStudentForCoaching(null)}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer" type="button">
                <Icons.Close />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-xs font-semibold text-slate-550">
                <div>
                  <span className="text-[8px] text-slate-400 block mb-0.5 uppercase tracking-wider font-bold">Class</span>
                  {selectedStudentForCoaching.classGroup}
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 block mb-0.5 uppercase tracking-wider font-bold">Recovery</span>
                  {selectedStudentForCoaching.recoveryRate}%
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 block mb-0.5 uppercase tracking-wider font-bold">Total Errors</span>
                  <span className="text-brand-teal font-extrabold">{selectedStudentForCoaching.totalQuestions}개</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-brand-teal uppercase tracking-widest">선생님 1:1 맞춤 피드백 메시지</label>
                <textarea
                  value={coachingFeedbackText}
                  onChange={(e) => setCoachingFeedbackText(e.target.value)}
                  className="min-h-[110px] p-4 border border-slate-200 hover:border-brand-teal focus:border-brand-teal rounded-xl text-xs font-semibold leading-relaxed focus:outline-none transition bg-slate-50/50 focus:bg-white"
                  placeholder="학생 오답 성향에 따른 따뜻한 격려와 학습 보완법을 작성해주세요..."
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-brand-teal block uppercase tracking-widest">처방 옵션</span>
                {[
                  { key: "sendToParent", label: "학부모 종합 성장 리포트 전송", desc: "학부모 스마트폰 앱으로 피드백이 실시간 알림 전송됩니다." },
                  { key: "prescribeWrongNotes", label: "오답 회복 보충 미션 자동 활성화", desc: "가장 최근 등록된 취약 오답 개념에 대한 3단계 미션을 즉시 처방합니다." },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group text-xs font-semibold text-slate-650">
                    <input type="checkbox"
                      checked={coachingOptions[key as keyof typeof coachingOptions]}
                      onChange={(e) => setCoachingOptions({ ...coachingOptions, [key]: e.target.checked })}
                      className="h-4 w-4 accent-brand-teal rounded cursor-pointer mt-0.5" />
                    <div>
                      <span className="block font-bold text-slate-800 group-hover:text-brand-teal transition">{label}</span>
                      <span className="block text-[9.5px] text-slate-400 mt-0.5 font-bold leading-relaxed">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 p-5 bg-slate-50 flex gap-2 justify-end">
              <button onClick={() => setSelectedStudentForCoaching(null)}
                className="px-4.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition border border-slate-200 bg-white cursor-pointer" type="button">
                Close
              </button>
              <button onClick={() => void handleSendCoachingReport()}
                className="px-5 py-2.5 text-xs font-bold bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl shadow-md transition cursor-pointer" type="button">
                리포트 전송 및 처방하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
