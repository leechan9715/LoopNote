"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createBrowserSupabaseClient } from "@/services/supabase";

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

// ─── 컴포넌트 ─────────────────────────────────────────────────
export default function TeacherDashboard() {
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
  }, [loadClassData]);

  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  // ── 미션 전송 ────────────────────────────────────────────────
  const handleSendMission = async (student: StudentData) => {
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

      showToast(`⚡ ${student.name} 학생의 오답 미션이 활성화되었습니다!`, "success");
      void loadClassData(); // 데이터 새로고침
    } catch (err: any) {
      showToast(`미션 전송 실패: ${err?.message}`, "warning");
    } finally {
      setSendingMission(null);
    }
  };

  const handleSendRecommendedMission = (conceptName: string, studentCount: number) => {
    showToast(`'${conceptName}' 오답 학생 ${studentCount}명에게 맞춤형 보충 미션을 전송했습니다!`, "success");
  };

  const handleOpenCoachingModal = (student: StudentData) => {
    setSelectedStudentForCoaching(student);
    setCoachingFeedbackText(student.coachingFeedback);
    setCoachingOptions({ sendToParent: true, prescribeWrongNotes: true });
  };

  const handleSendCoachingReport = async () => {
    if (!selectedStudentForCoaching) return;
    const actions = [];
    if (coachingOptions.sendToParent) actions.push("가정 통신문 연동");
    if (coachingOptions.prescribeWrongNotes) {
      actions.push("오답 회복 미션 발행");
      await handleSendMission(selectedStudentForCoaching);
    }

    // Save to localStorage under student's ID so student & parent pages can render it dynamically on the same browser origin
    if (typeof window !== "undefined") {
      localStorage.setItem(`coaching_feedback_${selectedStudentForCoaching.id}`, coachingFeedbackText);
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
      <div className="flex flex-col items-center justify-center h-80 gap-4 text-slate-500">
        <div className="w-10 h-10 rounded-full border-4 border-[#064e52] border-t-transparent animate-spin" />
        <span className="text-sm font-bold">학급 데이터를 불러오는 중...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <span className="text-4xl">⚠️</span>
        <span className="text-sm font-bold text-slate-700">{loadError}</span>
        <button
          onClick={() => void loadClassData()}
          className="bg-[#064e52] text-white text-xs font-black px-5 py-2.5 rounded-2xl hover:bg-[#0d6e73] transition"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  // 담당 학생이 없는 경우 안내 화면
  if (allStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4 text-center">
        <span className="text-5xl">🏫</span>
        <h2 className="text-lg font-black text-slate-800">아직 담당 학생이 없습니다</h2>
        <p className="text-sm text-slate-500 font-semibold max-w-sm">
          학생 계정 가입 시 <span className="font-black text-[#064e52]">teacher_id</span>에 선생님 계정 ID를 연결하거나,
          Supabase에서 직접 학생 profiles에 teacher_id를 설정해 주세요.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-600 max-w-md text-left">
          <p className="font-black text-[#064e52] mb-1">내 선생님 계정 ID:</p>
          <p className="break-all">{classData?.teacher.id ?? "로딩 중..."}</p>
        </div>
        <button onClick={() => void loadClassData()} className="bg-[#064e52] text-white text-xs font-black px-5 py-2.5 rounded-2xl hover:bg-[#0d6e73] transition">
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 select-none">
      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex items-center gap-3 bg-brand-teal text-white px-5 py-4 rounded-2xl shadow-2xl border-2 border-brand-teal-light animate-slide-in pointer-events-auto max-w-md">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand-teal-dark font-black text-xs">✓</div>
            <span className="font-extrabold text-sm leading-relaxed">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-brand-teal tracking-tight">
            클래스 오답 분석 대시보드
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">
            {classData?.teacher.className} · 총 {stats?.totalStudents ?? 0}명 · 실시간 오답 분석 기반 맞춤형 학습 처방
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black text-brand-teal-light uppercase tracking-wider">과목</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="min-h-10 px-3 bg-white border-2 border-slate-200 hover:border-brand-teal rounded-xl text-xs font-black text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            >
              <option value="all">전체 과목</option>
              <option value="math">수학</option>
              <option value="korean">국어</option>
            </select>
          </div>
          <button
            onClick={() => void loadClassData()}
            className="mt-4 min-h-10 px-4 bg-white border-2 border-slate-200 hover:border-brand-teal rounded-xl text-xs font-black text-slate-600 hover:text-brand-teal transition"
          >
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* ── SUMMARY KPI CARDS ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">전체 학생 수</span>
            <span className="p-1 rounded-lg bg-teal-50 text-brand-teal font-black text-[10px]">전체</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-teal">{stats?.totalStudents ?? 0}</span>
            <span className="text-slate-400 text-xs font-bold">명</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-bold">LoopNote 오답 피드백 진행 중</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">평균 회복률</span>
            <span className="p-1 px-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-black text-[10px]">이번 주</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-teal">{stats?.avgRecoveryRate ?? 0}%</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-bold">완료 미션 / 전체 미션 비율</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">오늘 활동 학생</span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-600 font-black text-[10px]">오늘</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-teal">{stats?.activeToday ?? 0}</span>
            <span className="text-slate-400 text-xs font-bold">명</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-bold">오늘 오답 등록 학생 수</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500">집중 케어 필요</span>
            <span className="p-1 px-1.5 rounded-lg bg-rose-50 text-rose-600 font-black text-[10px]">주의</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600">{stats?.lowConfidenceCount ?? 0}</span>
            <span className="text-slate-400 text-xs font-bold">명</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-400 font-bold">회복률 50% 미만 학생</div>
        </div>
      </div>

      {/* ── TWO COLUMN: TOP ERRORS + CHART ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 공통 오류 유형 TOP */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-teal text-brand-lime font-black text-xs">
                {topErrors.length}
              </span>
              <h2 className="text-lg font-black text-brand-teal">공통 오류 유형 TOP {topErrors.length}</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">실제 오답 텍스트 AI 분석</span>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            {topErrors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                <span className="text-3xl">📭</span>
                <span className="text-xs font-bold">학생 오답 데이터가 쌓이면 자동 분석됩니다.</span>
              </div>
            )}
            {topErrors.map((error, idx) => {
              const percentages = [85, 68, 52, 38, 20];
              const percent = percentages[idx] ?? 15;
              return (
                <div key={error.rank} className="group p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 hover:border-slate-200 rounded-xl transition flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2.5">
                      <span className={["flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-black",
                        error.rank === 1 ? "bg-rose-500 text-white" : error.rank === 2 ? "bg-amber-500 text-white" : "bg-slate-300 text-slate-700"
                      ].join(" ")}>{error.rank}</span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-sm text-slate-800 block">{error.name}</span>
                        <span className="text-[11px] font-semibold text-slate-400 block mt-0.5 leading-relaxed">{error.desc}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-rose-600 shrink-0 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 shadow-sm">
                      {error.students}건
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className={["h-full rounded-full transition-all duration-500",
                        error.rank === 1 ? "bg-rose-500" : error.rank === 2 ? "bg-amber-500" : "bg-brand-teal"
                      ].join(" ")} style={{ width: `${percent}%` }} />
                    </div>
                    <button
                      onClick={() => handleSendRecommendedMission(error.name, error.students)}
                      className="shrink-0 text-[11px] font-black bg-brand-lime hover:bg-brand-lime-hover text-brand-teal-dark px-3 py-1.5 rounded-lg border-2 border-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
                      type="button"
                    >
                      추천 미션 전송
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 취약 단원 시각화 */}
        <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-brand-teal">학급 현황 요약</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(["chart", "map"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={["px-3 py-1 rounded-lg text-xs font-black transition",
                    activeTab === tab ? "bg-white text-brand-teal shadow-sm" : "text-slate-500 hover:text-slate-700"
                  ].join(" ")} type="button">
                  {tab === "chart" ? "회복률 분포" : "활동 현황"}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "chart" ? (
            <div className="flex-1 flex flex-col gap-4 justify-center">
              {/* 회복률 분포 차트 */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="text-emerald-500 transition-all duration-1000"
                      strokeDasharray={`${stats?.avgRecoveryRate ?? 0}, 100`}
                      strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-800">{stats?.avgRecoveryRate ?? 0}%</span>
                    <span className="text-[10px] font-black text-emerald-500">평균 회복률</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-1 w-full">
                  <span className="text-xs font-black text-brand-teal-dark border-b-2 border-slate-100 pb-1.5 block">자신감 분포</span>
                  {[
                    { label: "높음 (상)", count: allStudents.filter(s => s.confidence === "상").length, color: "bg-emerald-400" },
                    { label: "보통 (중)", count: allStudents.filter(s => s.confidence === "중").length, color: "bg-amber-400" },
                    { label: "낮음 (하)", count: allStudents.filter(s => s.confidence === "하").length, color: "bg-rose-400" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${color}`} />
                      <span className="flex-1">{label}</span>
                      <span>{count}명</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                <span className="text-xs font-black text-brand-teal">회복률 구간별 학생 수</span>
                {[
                  { label: "80% 이상 (우수)", count: allStudents.filter(s => s.recoveryRate >= 80).length, color: "bg-emerald-400" },
                  { label: "50~79% (보통)", count: allStudents.filter(s => s.recoveryRate >= 50 && s.recoveryRate < 80).length, color: "bg-amber-400" },
                  { label: "50% 미만 (집중관리)", count: allStudents.filter(s => s.recoveryRate < 50).length, color: "bg-rose-400" },
                ].map(({ label, count, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span>{label}</span><span>{count}명</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`}
                        style={{ width: allStudents.length > 0 ? `${(count / allStudents.length) * 100}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3 py-1">
              <p className="text-xs font-bold text-slate-500">오늘 활동 중인 학생</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {allStudents.filter(s => s.todayLoops > 0).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">오늘 활동한 학생이 없습니다.</p>
                ) : (
                  allStudents.filter(s => s.todayLoops > 0).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white text-xs font-black shrink-0">{s.name[0]}</span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-black text-slate-800">{s.name}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">{s.recentAction}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{s.todayLoops}개 루프</span>
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs font-bold text-slate-500 mt-2">최근 미활동 학생 (집중 케어)</p>
              <div className="space-y-2">
                {allStudents.filter(s => s.todayLoops === 0 && s.confidence === "하").slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-200 text-rose-700 text-xs font-black shrink-0">{s.name[0]}</span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-slate-800">{s.name}</span>
                      <span className="block text-[10px] text-rose-500 font-semibold">{s.lastActiveLabel} 마지막 활동</span>
                    </div>
                    <button onClick={() => void handleSendMission(s)}
                      disabled={sendingMission === s.id}
                      className="text-[10px] font-black bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white px-2.5 py-1 rounded-lg transition">
                      {sendingMission === s.id ? "전송 중..." : "미션 활성화"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STUDENT TABLE ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-brand-teal">학생별 오답 루프 및 성장 현황</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">실제 데이터 기반 실시간 모니터링</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input type="text" placeholder="이름 또는 오답 검색..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="min-h-10 pl-9 pr-4 bg-slate-50 border-2 border-slate-200 hover:border-brand-teal rounded-xl text-xs font-bold text-slate-700 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal/20 w-60" />
              <svg className="absolute left-3 top-3 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {[
                { id: "all", label: "전체" },
                { id: "wrong", label: "취약 오답" },
                { id: "lowConfidence", label: "집중 케어" },
                { id: "completed", label: "미션 완료" },
              ].map((btn) => (
                <button key={btn.id} onClick={() => setStudentFilter(btn.id)}
                  className={["px-3 py-1.5 rounded-lg text-xs font-black transition",
                    studentFilter === btn.id ? "bg-white text-brand-teal shadow-sm" : "text-slate-500 hover:text-slate-700"
                  ].join(" ")} type="button">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/70 font-black text-slate-500 text-xs">
              <tr>
                <th className="px-5 py-4">이름</th>
                <th className="px-5 py-4">학급/반</th>
                <th className="px-5 py-4 text-center">오늘 활동</th>
                <th className="px-5 py-4">회복률</th>
                <th className="px-5 py-4 text-center">자신감</th>
                <th className="px-5 py-4">최근 활동</th>
                <th className="px-5 py-4 text-right">피드백 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-extrabold text-slate-700">
              {filteredStudents.map((student) => {
                const confStyles = {
                  상: "bg-emerald-50 text-emerald-600 border border-emerald-200",
                  중: "bg-sky-50 text-sky-600 border border-sky-200",
                  하: "bg-rose-50 text-rose-600 border border-rose-200",
                }[student.confidence];

                const actDot: Record<string, string> = {
                  "미션 완료": "bg-emerald-500",
                  "미션 진행 중": "bg-blue-400",
                  "오답 풀이 중": "bg-amber-400",
                  "오답 등록됨": "bg-teal-400",
                  "대기 중": "bg-slate-300",
                };
                const dot = actDot[student.recentAction] ?? "bg-slate-400";

                return (
                  <tr key={student.id} className="hover:bg-slate-50/60 transition duration-150">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-teal text-white text-xs font-black">{student.name[0]}</span>
                        <div className="flex flex-col">
                          <span className="text-slate-800 text-sm">{student.name}</span>
                          <span className="text-[10px] text-rose-500 font-semibold mt-0.5 max-w-[140px] truncate">{student.weakConcept}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{student.classGroup}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={["inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black",
                        student.todayLoops > 3 ? "bg-brand-lime text-brand-teal-dark" :
                        student.todayLoops > 0 ? "bg-teal-50 text-brand-teal" : "bg-slate-100 text-slate-400"
                      ].join(" ")}>{student.todayLoops}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                          <div className={["h-full rounded-full",
                            student.recoveryRate >= 80 ? "bg-emerald-400" :
                            student.recoveryRate >= 50 ? "bg-amber-400" : "bg-rose-400"
                          ].join(" ")} style={{ width: `${student.recoveryRate}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-800">{student.recoveryRate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${confStyles}`}>{student.confidence}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
                        <span className="text-xs text-slate-600">{student.recentAction}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleSendMission(student)}
                          disabled={sendingMission === student.id}
                          className="text-[10px] font-black bg-brand-lime hover:bg-brand-lime-hover disabled:bg-slate-200 text-brand-teal-dark px-3 py-1.5 rounded-lg transition border border-transparent"
                          type="button"
                        >
                          {sendingMission === student.id ? "⏳" : "미션 전송"}
                        </button>
                        <button
                          onClick={() => handleOpenCoachingModal(student)}
                          className="text-xs font-black text-brand-teal hover:bg-brand-lime hover:text-brand-teal-dark bg-teal-50 border border-teal-200 rounded-xl px-3.5 py-2 transition"
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
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <span className="text-3xl block">🔍</span>
                    <span className="text-xs font-bold block mt-2">일치하는 학생 데이터가 없습니다.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
          <span>검색 결과: 총 {filteredStudents.length}명 / {allStudents.length}명</span>
        </div>
      </div>

      {/* ── 1:1 COACHING MODAL ─────────────────────────────────── */}
      {selectedStudentForCoaching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="bg-brand-teal text-white p-6 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-brand-lime uppercase tracking-widest block">1:1 PERSONAL COACHING</span>
                <h3 className="text-xl font-black text-white mt-1">{selectedStudentForCoaching.name} 학생 코칭 리포트</h3>
              </div>
              <button onClick={() => setSelectedStudentForCoaching(null)}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 rounded-full flex items-center justify-center transition" type="button">
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs font-bold text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">학급</span>
                  {selectedStudentForCoaching.classGroup}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">회복률</span>
                  {selectedStudentForCoaching.recoveryRate}%
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">등록 오답</span>
                  <span className="text-[#064e52] font-extrabold">{selectedStudentForCoaching.totalQuestions}개</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-teal">선생님 피드백 메시지</label>
                <textarea
                  value={coachingFeedbackText}
                  onChange={(e) => setCoachingFeedbackText(e.target.value)}
                  className="min-h-28 p-3.5 border-2 border-slate-200 hover:border-slate-300 focus:border-brand-teal rounded-2xl text-xs font-semibold leading-relaxed focus:outline-none transition bg-slate-50/50 focus:bg-white"
                  placeholder="학생 오답 성향에 따른 격려와 보완법을 작성해주세요..."
                />
              </div>

              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-4">
                <span className="text-xs font-black text-brand-teal block">처방 옵션</span>
                {[
                  { key: "sendToParent", label: "학부모 성장 리포트 전송", desc: "학부모 앱으로 실시간 연동됩니다." },
                  { key: "prescribeWrongNotes", label: "오답 회복 미션 활성화", desc: "최신 pending 오답의 미션이 활성화됩니다." },
                ].map(({ key, label, desc }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer group text-xs font-bold text-slate-700">
                    <input type="checkbox"
                      checked={coachingOptions[key as keyof typeof coachingOptions]}
                      onChange={(e) => setCoachingOptions({ ...coachingOptions, [key]: e.target.checked })}
                      className="h-4 w-4 accent-brand-teal rounded" />
                    <div>
                      <span className="block font-black text-slate-800 group-hover:text-brand-teal transition">{label}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 font-semibold">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 p-5 bg-slate-50 flex gap-2 justify-end">
              <button onClick={() => setSelectedStudentForCoaching(null)}
                className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-200/50 rounded-xl transition border border-slate-200 bg-white" type="button">
                닫기
              </button>
              <button onClick={() => void handleSendCoachingReport()}
                className="px-5 py-2 text-xs font-black bg-brand-teal hover:bg-brand-teal-dark text-white rounded-xl shadow-md transition" type="button">
                리포트 전송 및 처방하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
