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

// ─── SVG 벡터 아이콘 ───────────────────────────────────────────
const Icons = {
  Alert: () => (
    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
  Close: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5M6.75 7.5V16.5" />
    </svg>
  ),
};

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
        triggerToast("로그인이 필요합니다.");
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

      triggerToast(`[${student.name}] 학생에게 오답 극복 맞춤 미션이 전송되었습니다!`);
      void loadClassData(); 
    } catch (err: any) {
      triggerToast(`미션 전송 실패: ${err?.message}`);
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
        return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-150">안심</span>;
      case "중":
        return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-150">헷갈림</span>;
      case "하":
        return <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-150">주저함</span>;
    }
  };

  const copyInviteCode = () => {
    if (!classData?.teacher.id) return;
    void navigator.clipboard.writeText(classData.teacher.id);
    triggerToast("초청 코드가 클립보드에 복사되었습니다!");
  };

  // ── 로딩 / 에러 상태 ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-brand-teal">
        <div className="w-12 h-12 rounded-full border-2 border-brand-teal border-t-brand-lime animate-spin" />
        <span className="text-sm font-medium tracking-widest font-sans uppercase">Loading Roster Registry</span>
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16 font-sans select-none">
      
      {/* Top Banner */}
      <section className="glass-card rounded-[2.5rem] p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-lime/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="space-y-2.5">
          <Typography as="p" variant="caption" className="font-bold text-brand-teal/75 uppercase tracking-widest mb-1">
            Student Registry
          </Typography>
          <Typography as="h1" variant="h1" className="text-brand-teal font-extrabold text-2xl tracking-tight uppercase">
            학급 학생 관리
          </Typography>
          <Typography as="p" variant="body" className="text-slate-400 font-semibold text-[11px] leading-relaxed max-w-xl">
            {classData?.teacher.className} 학급의 소속 학생 리스트와 상세 오답 진척도를 실시간 모니터링합니다.
          </Typography>
        </div>
        
        <Button 
          onClick={() => setShowInviteModal(true)}
          className="bg-brand-teal border-brand-teal hover:bg-brand-teal-dark text-white font-bold text-xs min-h-11 px-5 rounded-xl shadow-md transition duration-200 cursor-pointer flex items-center shrink-0"
        >
          <Icons.Plus />
          <span>신규 학생 초대</span>
        </Button>
      </section>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: "관리 중인 학생 수", val: `${stats.total}명`, desc: `${classData?.teacher.className} 소속`, iconType: "growth" },
          { label: "학급 평균 오답 회복률", val: `${stats.averageRecovery}%`, desc: "목표 도달 지점: 80%", iconType: "growth" },
          { label: "집중 관찰 필요 대상", val: `${stats.needAttention}명`, desc: "자신감 지표 주저함(하) 분류", iconType: "lightbulb" }
        ].map((card, idx) => (
          <section key={idx} className="glass-card rounded-[2rem] p-6.5 shadow-sm flex items-center gap-4 hover:scale-[1.01] transition duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center relative overflow-hidden shadow-inner shrink-0">
              {card.iconType === "growth" ? (
                <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c0-4-2-7-6-8 4-1 6-4 6-8 0 4 2 7 6 8-4 1-6 4-6 8z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11" /></svg>
              ) : (
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              )}
            </div>
            <div>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-none mb-1.5 uppercase tracking-wider text-[9px]">{card.label}</Typography>
              <Typography as="h2" variant="h2" className="font-extrabold text-lg text-[#064e52] leading-none">{card.val}</Typography>
              <span className="block text-[9.5px] font-semibold text-slate-400 mt-1">{card.desc}</span>
            </div>
          </section>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <section className="glass-card rounded-[2rem] p-5.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:max-w-sm relative">
          <Input 
            placeholder="학생 이름 또는 취약 단원 검색..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 text-xs font-bold rounded-xl border-slate-200 bg-white focus:border-brand-teal"
          />
          <div className="absolute left-3 top-3">
            <Icons.Search />
          </div>
        </div>

        {/* Emotion status tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/50 shadow-inner">
          {[
            { filter: "all", label: "전체 학생" },
            { filter: "stable", label: "안심 (상)" },
            { filter: "confused", label: "헷갈림 (중)" },
            { filter: "stressed", label: "주저함 (하)" },
          ].map((btn) => (
            <button
              key={btn.filter}
              onClick={() => setStatusFilter(btn.filter as any)}
              className={`px-3.5 py-1.5 text-[10.5px] font-bold rounded-lg transition duration-150 cursor-pointer ${
                statusFilter === btn.filter 
                  ? "bg-white text-[#064e52] shadow-sm border border-slate-200/40" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
              type="button"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </section>

      {/* Main Student List Table */}
      <section className="glass-card rounded-[2.5rem] shadow-sm overflow-hidden p-3.5">
        <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white/50">
          <table className="w-full border-collapse text-left text-xs font-semibold text-slate-655">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10.5px] font-bold text-[#064e52] tracking-wider uppercase">
                <th className="py-4 px-6 rounded-tl-xl">학생 이름</th>
                <th className="py-4 px-6">학년/학급</th>
                <th className="py-4 px-6">등록 오답</th>
                <th className="py-4 px-6">완료한 회복 루프</th>
                <th className="py-4 px-6">평균 오답 회복률</th>
                <th className="py-4 px-6">이번 주 취약 단원</th>
                <th className="py-4 px-6">학습 감정 진단</th>
                <th className="py-4 px-6">최근 활동</th>
                <th className="py-4 px-6 text-right rounded-tr-xl">지도 도구</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-white transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                      <span className="w-7.5 h-7.5 rounded-full bg-brand-teal flex items-center justify-center text-xs text-white font-bold shadow-sm">
                        {student.name[0]}
                      </span>
                      {student.name}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-450">{student.classGroup}</td>
                    <td className="py-4 px-6 font-bold text-slate-800">{student.totalQuestions}개</td>
                    <td className="py-4 px-6 font-bold text-slate-800">{student.completedMissions}개 미션</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-teal">{student.recoveryRate}%</span>
                        <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full rounded-full ${student.recoveryRate >= 80 ? 'bg-brand-teal' : student.recoveryRate >= 50 ? 'bg-amber-400' : 'bg-rose-455'}`}
                            style={{ width: `${student.recoveryRate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block text-[9.5px] font-bold text-[#064e52] bg-[#064e52]/5 px-2 py-0.5 rounded border border-[#064e52]/10 max-w-[150px] truncate">
                        {student.weakConcept}
                      </span>
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(student.confidence)}</td>
                    <td className="py-4 px-6 font-medium text-slate-400">{student.recentAction} ({student.lastActiveLabel})</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => void handleSendMission(student)}
                        disabled={sendingMission === student.id}
                        className="bg-brand-lime hover:bg-[#b8e600] disabled:bg-slate-200 text-[#064e52] font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                      >
                        {sendingMission === student.id ? "전송 중" : "미션 전송"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    학급에 등록된 학생이 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-teal-dark/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] border border-slate-150/40 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <Typography as="h3" className="text-base font-bold text-brand-teal tracking-tight">
                신규 학생 등록 초대 코드
              </Typography>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
                type="button"
              >
                <Icons.Close />
              </button>
            </div>
            
            <Typography as="p" className="text-xs text-slate-450 font-semibold leading-relaxed">
              학생들이 회원가입 시 아래의 초대 코드를 입력하면 선생님 학급으로 자동으로 배정되어 모니터링이 활성화됩니다.
            </Typography>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 flex flex-col items-center gap-3">
              <div className="text-center w-full">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">내 학급 연결 초대 코드</span>
                <span className="text-xs font-bold text-slate-800 break-all select-all font-mono">
                  {classData?.teacher.id ?? "코드를 가져오는 중..."}
                </span>
              </div>
              
              <button 
                onClick={copyInviteCode}
                className="bg-brand-teal hover:bg-brand-teal-dark text-white font-bold text-xs py-2.5 rounded-lg w-full transition cursor-pointer flex items-center justify-center"
              >
                <Icons.Copy />
                <span>초대 코드 복사하기</span>
              </button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-[10px] font-semibold text-slate-500 leading-relaxed">
              <strong>학생 가입 안내:</strong><br />
              학생 계정 회원가입의 2단계 정보 입력에서 연결 코드 입력창에 위 초대 코드를 붙여넣고 가입하면 연동 완료됩니다!
            </div>
            
            <Button 
              onClick={() => setShowInviteModal(false)}
              variant="outline"
              className="w-full min-h-11 rounded-2xl text-xs font-bold shadow-none border-slate-200 cursor-pointer"
            >
              닫기
            </Button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed left-1/2 bottom-12 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-2xl bg-brand-teal-dark text-white px-5 py-4 text-center text-xs font-semibold shadow-2xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
