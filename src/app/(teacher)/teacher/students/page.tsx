"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button, Input, Typography } from "@/components/common";
import { createBrowserSupabaseClient } from "@/services/supabase";

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

interface ClassData {
  teacher: { id: string; name: string; className: string };
  stats: TeacherStats;
  students: StudentData[];
}

export default function StudentManagementPage() {
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "stable" | "confused" | "stressed">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sendingMission, setSendingMission] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── 미션 전송 ────────────────────────────────────────────────
  const handleSendMission = async (student: StudentData) => {
    setSendingMission(student.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        triggerToast("⚠️ 로그인이 필요합니다.");
        return;
      }

      const res = await fetch("/api/teacher/mission-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ studentId: student.id }),
      });

      const result = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(result.error ?? "미션 전송 실패");

      triggerToast(`⚡ [${student.name}] 학생에게 오답 극복 맞춤 미션이 전송되었습니다!`);
      void loadClassData(); // 데이터 새로고침
    } catch (err: any) {
      triggerToast(`⚠️ 미션 전송 실패: ${err?.message}`);
    } finally {
      setSendingMission(null);
    }
  };

  // 자신감 상태 매핑 ("상" -> stable, "중" -> confused, "하" -> stressed)
  const filteredStudents = useMemo(() => {
    const students = classData?.students ?? [];
    return students.filter((s) => {
      const matchesSearch = s.name.includes(searchTerm) || s.weakConcept.includes(searchTerm);
      
      const mappedStatus = s.confidence === "상" ? "stable" : s.confidence === "중" ? "confused" : "stressed";
      const matchesFilter = statusFilter === "all" || mappedStatus === statusFilter;
      
      return matchesSearch && matchesFilter;
    });
  }, [classData, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    if (!classData) return { total: 0, averageRecovery: 0, needAttention: 0 };
    return {
      total: classData.stats.totalStudents,
      averageRecovery: classData.stats.avgRecoveryRate,
      needAttention: classData.stats.lowConfidenceCount,
    };
  }, [classData]);

  const getStatusBadge = (confidence: "상" | "중" | "하") => {
    switch (confidence) {
      case "상":
        return <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">🟢 안심</span>;
      case "중":
        return <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">🟡 헷갈림</span>;
      case "하":
        return <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">🔴 주저함</span>;
    }
  };

  const copyInviteCode = () => {
    if (!classData?.teacher.id) return;
    void navigator.clipboard.writeText(classData.teacher.id);
    triggerToast("📋 초청 코드가 클립보드에 복사되었습니다!");
  };

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Typography as="p" variant="caption" className="font-extrabold text-[#0d6e73] uppercase tracking-wider mb-2">
            교사 서포트 데스크
          </Typography>
          <Typography as="h1" variant="h1" className="text-slate-900 font-black text-xl md:text-2xl">
            학급 학생 관리 🎒
          </Typography>
          <Typography as="p" variant="body" className="text-slate-500 font-bold text-xs mt-1">
            {classData?.teacher.className} 학급의 학생 정보와 오답 극복 상황을 한곳에서 모니터링합니다.
          </Typography>
        </div>
        
        <Button 
          onClick={() => setShowInviteModal(true)}
          className="bg-[#064e52] border-[#064e52] hover:bg-[#0d6e73] text-white font-black text-xs min-h-11 px-5 rounded-2xl shadow-sm"
        >
          ➕ 신규 학생 초대
        </Button>
      </section>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4 hover:border-[#b5e61d]/50 transition">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-2xl text-[#064e52]">🧑‍🎓</div>
          <div>
            <Typography as="p" variant="caption" className="text-slate-400 font-extrabold leading-none mb-1.5">관리 중인 학생 수</Typography>
            <Typography as="h2" variant="h2" className="font-black text-lg text-[#064e52] leading-none">{stats.total}명</Typography>
            <span className="block text-[9px] font-bold text-slate-400 mt-1">{classData?.teacher.className} 학급</span>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4 hover:border-[#b5e61d]/50 transition">
          <div className="w-12 h-12 rounded-2xl bg-lime-50/50 flex items-center justify-center text-2xl text-lime-600">📈</div>
          <div>
            <Typography as="p" variant="caption" className="text-slate-400 font-extrabold leading-none mb-1.5">학급 평균 오답 회복률</Typography>
            <Typography as="h2" variant="h2" className="font-black text-lg text-[#0d6e73] leading-none">{stats.averageRecovery}%</Typography>
            <span className="block text-[9px] font-bold text-[#0d6e73] mt-1">목표 달성 지점: 80%</span>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex items-center gap-4 hover:border-[#b5e61d]/50 transition">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-2xl text-rose-500">🚨</div>
          <div>
            <Typography as="p" variant="caption" className="text-slate-400 font-extrabold leading-none mb-1.5">집중 관찰 필요 대상</Typography>
            <Typography as="h2" variant="h2" className="font-black text-lg text-rose-600 leading-none">{stats.needAttention}명</Typography>
            <span className="block text-[9px] font-bold text-rose-500 mt-1">자신감 빨간불(🔴) 학생</span>
          </div>
        </section>
      </div>

      {/* Filters and Search Bar */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:max-w-sm">
          <Input 
            placeholder="학생 이름 또는 취약 단원 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Emotion status tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl self-start md:self-auto">
          {[
            { filter: "all", label: "전체 학생" },
            { filter: "stable", label: "🟢 안심 (상)" },
            { filter: "confused", label: "🟡 헷갈림 (중)" },
            { filter: "stressed", label: "🔴 주저함 (하)" },
          ].map((btn) => (
            <button
              key={btn.filter}
              onClick={() => setStatusFilter(btn.filter as any)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition duration-150 ${
                statusFilter === btn.filter 
                  ? "bg-white text-[#064e52] shadow-sm border border-slate-200/60" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Student List Table */}
      <section className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 tracking-wider uppercase">
                <th className="py-4 px-6">학생 이름</th>
                <th className="py-4 px-6">학년/학급</th>
                <th className="py-4 px-6">등록 오답</th>
                <th className="py-4 px-6">완료한 회복 루프</th>
                <th className="py-4 px-6">평균 오답 회복률</th>
                <th className="py-4 px-6">이번 주 취약 단원</th>
                <th className="py-4 px-6">학습 감정 진단</th>
                <th className="py-4 px-6">최근 활동</th>
                <th className="py-4 px-6 text-right">지도 도구</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4.5 px-6 font-black text-slate-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#064e52] flex items-center justify-center text-xs text-white font-extrabold shadow-sm border border-[#064e52]/10">
                        {student.name[0]}
                      </span>
                      {student.name}
                    </td>
                    <td className="py-4.5 px-6 font-bold text-slate-500">{student.classGroup}</td>
                    <td className="py-4.5 px-6 font-black text-slate-900">{student.totalQuestions}개</td>
                    <td className="py-4.5 px-6 font-black text-slate-900">{student.completedMissions}개 미션</td>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#0d6e73]">{student.recoveryRate}%</span>
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${student.recoveryRate >= 80 ? 'bg-[#0d6e73]' : student.recoveryRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${student.recoveryRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="inline-block text-[10px] font-black text-[#064e52] bg-[#064e52]/5 px-2 py-0.5 rounded border border-[#064e52]/10 max-w-[150px] truncate">
                        {student.weakConcept}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">{getStatusBadge(student.confidence)}</td>
                    <td className="py-4.5 px-6 font-bold text-slate-400">{student.recentAction} ({student.lastActiveLabel})</td>
                    <td className="py-4.5 px-6 text-right">
                      <button 
                        onClick={() => void handleSendMission(student)}
                        disabled={sendingMission === student.id}
                        className="bg-[#b5e61d] hover:bg-[#a1cf15] disabled:bg-slate-200 text-[#064e52] font-black text-[10px] px-3.5 py-1.5 rounded-xl transition shadow-sm border border-[#b5e61d]"
                      >
                        {sendingMission === student.id ? "전송 중..." : "미션 전송 🚀"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    학급에 등록된 학생이 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── COHRT CODE MODAL ─────────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Typography as="h3" className="text-lg font-black text-[#064e52]">
                🏫 신규 학생 등록 초대 코드
              </Typography>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm"
              >
                ✕
              </button>
            </div>
            
            <Typography as="p" className="text-xs text-slate-500 font-semibold leading-relaxed">
              학생들이 회원가입 시 아래의 <strong>초대 코드(선생님 ID)</strong>를 입력하면 선생님 학급으로 자동으로 배정되어 오답 데이터 모니터링 및 미션 전송 기능이 연동됩니다.
            </Typography>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-3">
              <div className="text-center w-full">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">내 학급 연결 초대 코드</span>
                <span className="text-sm font-black text-slate-800 break-all select-all font-mono">
                  {classData?.teacher.id ?? "코드를 가져오는 중..."}
                </span>
              </div>
              
              <Button 
                onClick={copyInviteCode}
                className="bg-[#064e52] hover:bg-[#0d6e73] text-white font-black text-xs min-h-10 px-4 rounded-xl w-full"
              >
                📋 초대 코드 복사하기
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-[11px] font-bold text-amber-800 leading-relaxed">
              💡 <strong>학생 가입 안내:</strong><br />
              학생 계정 회원가입의 2단계 정보 입력에서 <strong>"부모님 이메일 또는 연결 코드"</strong> 입력창에 위 초대 코드를 붙여넣고 가입하면 즉시 연동됩니다!
            </div>
            
            <Button 
              onClick={() => setShowInviteModal(false)}
              variant="outline"
              className="w-full min-h-11 rounded-2xl text-xs font-black shadow-none border-slate-200"
            >
              닫기
            </Button>
          </div>
        </div>
      )}

      {/* Quick Action Toast */}
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

