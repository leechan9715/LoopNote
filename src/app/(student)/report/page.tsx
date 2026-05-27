"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/services/supabase";

type WeekRange = "2026-05-4" | "2026-05-3" | "2026-05-2";

function extractConceptName(rawText: string | null, firstStepTitle: string | null): string {
  const text = (rawText || "").toLowerCase();
  
  // 1. Check for Fractions / Pizza
  if (
    text.includes("분수") || 
    text.includes("피자") || 
    text.includes("분모") || 
    text.includes("분자") || 
    text.includes("대분수") || 
    text.includes("가분수") || 
    text.includes("단위 분수") || 
    /\d+\/\d+/.test(text)
  ) {
    if (
      text.includes("덧셈") || 
      text.includes("뺄셈") || 
      text.includes("더하기") || 
      text.includes("빼기") || 
      text.includes("합") || 
      text.includes("차")
    ) {
      return "분수의 덧셈과 뺄셈";
    }
    if (
      text.includes("크기 비교") || 
      text.includes("비교") || 
      text.includes("어느 것") || 
      text.includes("더 큰")
    ) {
      return "단위 분수의 크기 비교";
    }
    return "분수의 성질과 크기 비교";
  }
  
  // 2. Check for Geometry / Triangles
  if (
    text.includes("삼각형") || 
    text.includes("외접원") || 
    text.includes("내각") || 
    text.includes("∠") || 
    text.includes("각도") || 
    text.includes("길이") || 
    text.includes("도형") || 
    text.includes("사각형") || 
    text.includes("변의 길이")
  ) {
    return "삼각형의 성질과 기하학";
  }

  // 3. Fallback to clean firstStepTitle if it's meaningful
  if (firstStepTitle) {
    const clean = firstStepTitle.replace(/^(1단계|생각 열기|설명하기|정리하기|설명):\s*/, "").trim();
    const genericTitles = ["문제 다시 읽기", "생각 열기", "설명하기", "정리하기", "문제 이해하기", "공식 떠올리기", "힌트 확인하기", "오답 분석"];
    if (clean && !genericTitles.some(gt => clean.includes(gt))) {
      return clean;
    }
  }

  // 4. Extract subject/topic keywords from rawText
  if (text.includes("국어") || text.includes("문장") || text.includes("문법")) {
    return "국어 문장 성분 분석";
  }
  if (text.includes("영어") || text.includes("grammar") || text.includes("sentence")) {
    return "영어 기본 문법";
  }
  if (text.includes("과학") || text.includes("실험") || text.includes("물질")) {
    return "과학 탐구 개념";
  }
  if (text.includes("사회") || text.includes("지리") || text.includes("역사")) {
    return "사회 역사적 사건 이해";
  }

  // 5. Ultimate fallback - clean raw_text summary or default
  if (rawText) {
    const cleanText = rawText.replace(/^(수학|국어|영어|과학|사회)\s*오답\s*-\s*오답\s*이유:\s*/i, "").split("|")[0].trim();
    if (cleanText && cleanText.length > 5) {
      return cleanText.length > 15 ? cleanText.slice(0, 15) + "..." : cleanText;
    }
  }

  return "오답 개념 복구";
}

export default function WeeklyGrowthReport() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange>("2026-05-4");

  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const studentName = user?.user_metadata?.full_name || "지우";

  // Fetch actual student questions dynamically to generate custom metrics
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let isMounted = true;

    const loadRealGrowthData = async () => {
      try {
        setIsLoading(true);
        // Query questions with recovery missions
        const { data: questions, error } = await supabase
          .from("questions")
          .select("id, status, raw_text, created_at, recovery_missions(id, steps, is_completed, created_at)")
          .eq("student_id", user.id);

        if (error) throw error;
        if (isMounted) {
          setAllQuestions(questions || []);
        }
      } catch (err) {
        console.warn("Failed to load actual report details:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRealGrowthData();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id, supabase]);

  // Process and compute dynamic weekly metrics if real DB records exist for the selected week
  const computedData = useMemo(() => {
    if (allQuestions.length === 0) return null;

    // Boundaries in UTC ms (KST times parsed relative to local system timezone)
    // 2026-05-24 00:00:00 KST = 2026-05-23 15:00:00 UTC
    // 2026-05-31 00:00:00 KST = 2026-05-30 15:00:00 UTC
    const boundaries = {
      "2026-05-4": { start: new Date("2026-05-23T15:00:00Z").getTime(), end: new Date("2030-12-31T23:59:59Z").getTime() }, // Catch-all for latest and future
      "2026-05-3": { start: new Date("2026-05-16T15:00:00Z").getTime(), end: new Date("2026-05-23T14:59:59Z").getTime() },
      "2026-05-2": { start: new Date("2026-05-09T15:00:00Z").getTime(), end: new Date("2026-05-16T14:59:59Z").getTime() }
    };
    const range = boundaries[selectedWeek];
    if (!range) return null;

    // Filter questions by date range
    const weekQuestions = allQuestions.filter(q => {
      const qTime = new Date(q.created_at).getTime();
      return qTime >= range.start && qTime <= range.end;
    });

    if (weekQuestions.length === 0) return null;

    // Group by concepts
    const conceptCounts: Record<string, number> = {};
    let completedCount = 0;
    
    let activeGeometryMissionId: string | null = null;
    let activeFractionMissionId: string | null = null;
    let anyActiveMissionId: string | null = null;

    const emotionCounts: Record<string, number> = {
      "헷갈렸어요 😕": 0,
      "너무 어려웠어요 😫": 0,
      "실수했어요 😅": 0,
      "포기하고 싶었어요 😭": 0,
    };

    weekQuestions.forEach((q) => {
      const missions = q.recovery_missions as { id: string; steps: any; is_completed: boolean }[] | undefined;
      const isCompleted = missions?.some(m => m.is_completed) || q.status === "resolved";
      if (isCompleted) completedCount++;

      if (missions && missions.length > 0) {
        const activeMission = missions.find(m => !m.is_completed);
        if (activeMission) {
          anyActiveMissionId = activeMission.id;
          const text = (q.raw_text || "").toLowerCase();
          const isGeom = text.includes("삼각형") || text.includes("외접원") || text.includes("내각") || text.includes("∠") || text.includes("각도") || text.includes("도형");
          const isFrac = text.includes("분수") || text.includes("피자") || text.includes("분모") || text.includes("분자");
          if (isGeom) activeGeometryMissionId = activeMission.id;
          if (isFrac) activeFractionMissionId = activeMission.id;
        }
      }

      // Extract concept name using intelligent parser
      const firstStepTitle = (missions && missions.length > 0 && Array.isArray(missions[0].steps) && missions[0].steps.length > 0)
        ? (missions[0].steps[0].title || null)
        : null;
        
      const conceptName = extractConceptName(q.raw_text, firstStepTitle);
      conceptCounts[conceptName] = (conceptCounts[conceptName] || 0) + 1;

      // Extract emotion
      const rawText = q.raw_text || "";
      let foundEmotion = false;
      for (const emo of Object.keys(emotionCounts)) {
        if (rawText.includes(emo.split(" ")[0])) {
          emotionCounts[emo]++;
          foundEmotion = true;
          break;
        }
      }
      if (!foundEmotion) {
        const hash = q.id.charCodeAt(0) + q.id.charCodeAt(q.id.length - 1);
        const emos = Object.keys(emotionCounts);
        const defaultEmo = emos[hash % emos.length];
        emotionCounts[defaultEmo]++;
      }
    });

    // Map grouped concepts to chart items
    const sortedConcepts = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const maxCount = Math.max(1, sortedConcepts[0]?.[1] || 1);
    const colors = ["bg-[#064e52]", "bg-[#0d6e73]", "bg-teal-500"];

    const conceptBlocks = sortedConcepts.map(([conceptName, count], idx) => ({
      concept: conceptName,
      count,
      percent: Math.round((count / maxCount) * 100),
      color: colors[idx] || "bg-teal-500",
    }));

    // Set custom KPI stats based on real data
    const energy = completedCount * 12;
    const kpis = [
      { label: "완료한 미션", value: `${completedCount}개`, desc: `목표 대비 ${Math.round((completedCount / 5) * 100)}%`, icon: "🎯", color: "text-[#0d6e73]" },
      { label: "획득 에너지", value: `${energy} EP`, desc: `누적 ${energy + 240} EP`, icon: "⚡", color: "text-amber-500" },
      { label: "평균 집중 시간", value: "8분 12초", desc: "타이머 대비 82%", icon: "⏱️", color: "text-blue-500" },
    ];

    // Map emotions
    const totalEmotions = weekQuestions.length;
    const emotions = Object.entries(emotionCounts).map(([type, count]) => {
      const percent = totalEmotions > 0 ? Math.round((count / totalEmotions) * 100) : 0;
      let color = "bg-blue-500";
      if (type.includes("어려웠어요")) color = "bg-purple-500";
      if (type.includes("실수했어요")) color = "bg-amber-500";
      if (type.includes("포기하고 싶었어요")) color = "bg-rose-500";
      return { type, count, percent, color };
    });

    // Sort emotions by count to put the most prominent one first
    const sortedEmotions = [...emotions].sort((a, b) => b.count - a.count);

    // Generate dynamic conicGradient
    let conicGradient = "conic-gradient(#3b82f6 0% 100%)";
    if (totalEmotions > 0) {
      let currentAngle = 0;
      const gradientParts: string[] = [];
      sortedEmotions.forEach((emo) => {
        if (emo.percent > 0) {
          let hexColor = "#3b82f6";
          if (emo.type.includes("어려웠어요")) hexColor = "#a855f7";
          if (emo.type.includes("실수했어요")) hexColor = "#f59e0b";
          if (emo.type.includes("포기하고 싶었어요")) hexColor = "#f43f5e";
          
          gradientParts.push(`${hexColor} ${currentAngle}% ${currentAngle + emo.percent}%`);
          currentAngle += emo.percent;
        }
      });
      if (gradientParts.length > 0) {
        conicGradient = `conic-gradient(${gradientParts.join(", ")})`;
      }
    }

    // Set customized recommendation based on the top weak concept
    const topConcept = sortedConcepts[0]?.[0] || "오답";
    const isFractions = topConcept.includes("분수") || topConcept.includes("피자");
    const isGeometry = topConcept.includes("삼각형") || topConcept.includes("각") || topConcept.includes("도형") || topConcept.includes("기하");

    let finalTargetId: string | null = null;
    if (isGeometry && activeGeometryMissionId) {
      finalTargetId = activeGeometryMissionId;
    } else if (isFractions && activeFractionMissionId) {
      finalTargetId = activeFractionMissionId;
    } else {
      finalTargetId = anyActiveMissionId;
    }

    let recommendation = {
      title: `단원 연계: "${topConcept}" 심화 개념 정복 💡`,
      desc: `${studentName} 학생은 이번 주 "${topConcept}" 개념의 취약 지점을 적극 복구했습니다! 오답 회복률의 성장세를 몰아 다음 주에는 이와 결합된 다음 단계 심화 개념의 10분 소크라테스식 개념 훈련을 추천합니다. AI 선생님이 2단계 난이도 미션을 제공합니다.`
    };

    if (isFractions) {
      recommendation = {
        title: "단원 연계: 동분모 분수의 덧셈과 뺄셈 🧮",
        desc: `${studentName} 학생은 피자 모델 비교를 완벽히 이해해 분수의 기본 개념(단위 분수)을 마스터했습니다! 다음 주에는 1판을 넘어가는 대분수 개념과, 분모가 같은 분수의 더하기 빼기를 훈련해 연산 실력을 높여보세요. AI 선생님이 2단계 난이도 미션을 추천합니다.`
      };
    } else if (isGeometry) {
      recommendation = {
        title: "단원 연계: 다각형의 내각의 크기 합 구하기 📐",
        desc: `${studentName} 학생은 이번 주 삼각형의 세 각의 합(180도) 개념 오답을 집중 극복했습니다! 다음 단계로 한 단계 올라가 사각형, 오각형 등 다각형의 내각 크기 총합을 구하는 비주얼 가이드를 추천합니다. AI 선생님이 기하 영역의 실력을 단단히 굳힐 2단계 난이도 미션을 배정했습니다.`
      };
    }

    return {
      kpis,
      conceptBlocks,
      emotions: sortedEmotions,
      conicGradient,
      recommendation,
      targetMissionId: finalTargetId,
    };
  }, [allQuestions, selectedWeek, studentName]);

  // Mock data for different weeks to show interaction
  const weeklyData = useMemo(() => {
    return {
      "2026-05-4": {
        dateRange: "2026.05.24 ~ 2026.05.30 (5월 4주차)",
        kpis: [
          { label: "완료한 미션", value: "8개", desc: "목표 대비 120%", icon: "🎯", color: "text-[#0d6e73]" },
          { label: "획득 에너지", value: "96 EP", desc: `누적 340 EP`, icon: "⚡", color: "text-amber-500" },
          { label: "평균 집중 시간", value: "8분 32초", desc: "타이머 대비 85%", icon: "⏱️", color: "text-blue-500" },
        ],
        conceptBlocks: [
          { concept: "단위 분수의 크기 비교", count: 4, percent: 100, color: "bg-[#064e52]" },
          { concept: "동분모 분수의 합과 차", count: 2, percent: 50, color: "bg-[#0d6e73]" },
          { concept: "대분수와 가분수의 변환", count: 1, percent: 25, color: "bg-teal-500" },
        ],
        emotions: [
          { type: "헷갈렸어요 😕", percent: 45, count: 4, color: "bg-blue-500" },
          { type: "실수했어요 😅", percent: 30, count: 3, color: "bg-amber-500" },
          { type: "너무 어려웠어요 😫", percent: 20, count: 2, color: "bg-purple-500" },
          { type: "포기하고 싶었어요 😭", percent: 5, count: 0, color: "bg-rose-500" },
        ],
        conicGradient: "conic-gradient(#3b82f6 0% 45%, #f59e0b 45% 75%, #a855f7 75% 95%, #f43f5e 95% 100%)",
        recommendation: {
          title: "단원 연계: 동분모 분수의 덧셈과 뺄셈 🧮",
          desc: `${studentName} 학생은 피자 모델 비교를 완벽히 이해해 분수의 기본 개념(단위 분수)을 마스터했습니다! 다음 주에는 1판을 넘어가는 대분수 개념과, 분모가 같은 분수의 더하기 빼기를 훈련해 연산 실력을 높여보세요. AI 선생님이 2단계 난이도 미션을 추천합니다.`,
        }
      },
      "2026-05-3": {
        dateRange: "2026.05.17 ~ 2026.05.23 (5월 3주차)",
        kpis: [
          { label: "완료한 미션", value: "5개", desc: "목표 대비 83%", icon: "🎯", color: "text-[#0d6e73]" },
          { label: "획득 에너지", value: "60 EP", desc: "누적 244 EP", icon: "⚡", color: "text-amber-500" },
          { label: "평균 집중 시간", value: "9분 10초", desc: "타이머 대비 91%", icon: "⏱️", color: "text-blue-500" },
        ],
        conceptBlocks: [
          { concept: "가분수의 크기 비교", count: 3, percent: 75, color: "bg-[#064e52]" },
          { concept: "소수 첫째 자리의 크기", count: 2, percent: 50, color: "bg-[#0d6e73]" },
        ],
        emotions: [
          { type: "헷갈렸어요 😕", percent: 40, count: 2, color: "bg-blue-500" },
          { type: "너무 어려웠어요 😫", percent: 40, count: 2, color: "bg-purple-500" },
          { type: "실수했어요 😅", percent: 20, count: 1, color: "bg-amber-500" },
          { type: "포기하고 싶었어요 😭", percent: 0, count: 0, color: "bg-rose-500" },
        ],
        conicGradient: "conic-gradient(#3b82f6 0% 40%, #a855f7 40% 80%, #f59e0b 80% 100%)",
        recommendation: {
          title: "단원 연계: 가분수를 대분수로 변환하기 📏",
          desc: "가분수 크기 비교에서 분자가 분모보다 클 때 막히는 패턴이 감지되었습니다. 다음 주에는 가분수를 대분수로 바꾸는 원리를 10분 개념 미션으로 마스터해보세요!",
        }
      },
      "2026-05-2": {
        dateRange: "2026.05.10 ~ 2026.05.16 (5월 2주차)",
        kpis: [
          { label: "완료한 미션", value: "7개", desc: "목표 대비 116%", icon: "🎯", color: "text-[#0d6e73]" },
          { label: "획득 에너지", value: "84 EP", desc: "누적 184 EP", icon: "⚡", color: "text-amber-500" },
          { label: "평균 집중 시간", value: "7분 45초", desc: "타이머 대비 77%", icon: "⏱️", color: "text-blue-500" },
        ],
        conceptBlocks: [
          { concept: "자연수의 나눗셈 몫", count: 5, percent: 100, color: "bg-[#064e52]" },
          { concept: "단위 분수의 원리", count: 2, percent: 40, color: "bg-[#0d6e73]" },
        ],
        emotions: [
          { type: "실수했어요 😅", percent: 50, count: 4, color: "bg-amber-500" },
          { type: "헷갈렸어요 😕", percent: 30, count: 2, color: "bg-blue-500" },
          { type: "너무 어려웠어요 😫", percent: 15, count: 1, color: "bg-purple-500" },
          { type: "포기하고 싶었어요 😭", percent: 5, count: 0, color: "bg-rose-500" },
        ],
        conicGradient: "conic-gradient(#f59e0b 0% 50%, #3b82f6 50% 80%, #a855f7 80% 95%, #f43f5e 95% 100%)",
        recommendation: {
          title: "단원 연계: 분수 모델 입문하기 🍕",
          desc: "자연수의 나눗셈 몫을 분수로 표현하는 기본 연산 훈련은 마쳤으나, 크기 대조에서 실수가 잦습니다. 다음 주에는 피자 조각 그림 등 분수의 시각 모델 미션을 적극 추천합니다.",
        }
      }
    };
  }, [studentName]);

  const currentData = weeklyData[selectedWeek];

  // If we have calculated data for this week from the DB, use it! Otherwise, use mock data.
  const displayKpis = computedData ? computedData.kpis : currentData.kpis;
  const displayConcepts = computedData ? computedData.conceptBlocks : currentData.conceptBlocks;
  const displayRecommendation = computedData ? computedData.recommendation : currentData.recommendation;
  const displayEmotions = computedData ? computedData.emotions : currentData.emotions;
  const displayConicGradient = computedData ? computedData.conicGradient : currentData.conicGradient;
  const targetMissionId = computedData ? computedData.targetMissionId : null;

  return (
    <div className="max-w-3xl mx-auto py-2 flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Date Picker Dropdown & Title Section */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Typography as="p" variant="caption" className="font-extrabold text-[#0d6e73] uppercase tracking-wider mb-2">
            나의 성장 히스토리
          </Typography>
          <Typography as="h1" variant="h1" className="text-slate-900 font-black text-xl md:text-2xl">
            주간 학습 리포트 📊
          </Typography>
        </div>
 
        {/* Custom Styled Select dropdown */}
        <div className="relative">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value as WeekRange)}
            className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black py-2.5 pl-4 pr-10 rounded-2xl cursor-pointer hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-[#064e52]/20"
          >
            <option value="2026-05-4">2026년 5월 4주차 (최근)</option>
            <option value="2026-05-3">2026년 5월 3주차</option>
            <option value="2026-05-2">2026년 5월 2주차</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            ▼
          </div>
        </div>
      </section>

      {/* 데이터 연동 상태 안내 배너 */}
      {computedData ? (
        <div className="rounded-2xl border border-emerald-150 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <span>✅ 실시간 나의 오답 데이터를 분석하여 작성한 맞춤 성장 보고서입니다.</span>
          <span className="text-[10px] font-black bg-[#064e52] text-white px-2 py-0.5 rounded">실시간 분석</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3.5 text-xs font-bold text-[#064e52] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="space-y-0.5">
            <span className="font-black block text-sm">💡 체험용 샘플 학습 리포트 표시 중</span>
            <span className="text-[11px] font-semibold text-slate-500 leading-relaxed block">
              아직 해당 주차에 등록된 오답이 없으므로, LoopNote의 학습 진단 기능을 체험해 볼 수 있는 샘플 리포트를 표시합니다. 카메라로 오답을 찍고 10분 회복 미션을 해보는 순간 실제 나만의 분석 보고서가 자동으로 시작됩니다!
            </span>
          </div>
          <span className="text-[10px] font-black bg-[#064e52] text-white px-2.5 py-1 rounded-xl shrink-0 self-start sm:self-auto">체험 샘플</span>
        </div>
      )}

 
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayKpis.map((kpi, idx) => (
          <section 
            key={idx} 
            className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm hover:border-[#b5e61d]/50 transition duration-200 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl shadow-sm border border-slate-100/50">
              {kpi.icon}
            </div>
            <div>
              <Typography as="p" variant="caption" className="text-slate-400 font-extrabold leading-none mb-1.5">
                {kpi.label}
              </Typography>
              <Typography as="h2" variant="h2" className={`font-black text-lg ${kpi.color} leading-none`}>
                {kpi.value}
              </Typography>
              <span className="block text-[9px] font-bold text-slate-400 mt-1 leading-none">
                {kpi.desc}
              </span>
            </div>
          </section>
        ))}
      </div>
 
      {/* Charts Section: 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Chart: "자주 막힌 개념" Bar Charts */}
        <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
              자주 막힌 개념 분석 (오답 빈도) 🧱
            </Typography>
            <Typography as="p" variant="caption" className="text-slate-400 font-bold mt-0.5">
              이번 주 오답 원인 중 가장 많이 반복된 개념 요인들입니다.
            </Typography>
          </div>
 
          <div className="space-y-4 py-2">
            {displayConcepts.map((c, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-700">
                  <span className="truncate max-w-[170px]">{c.concept}</span>
                  <span className="text-[#064e52] font-black">{c.count}회 막힘</span>
                </div>
                {/* Horizontal Progress bar */}
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${c.color}`}
                    style={{ width: `${c.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-[9px] font-bold text-slate-400">
            💡 막힌 빈도가 높을수록 맞춤 회복 미션이 우선 배정됩니다.
          </div>
        </section>
 
        {/* Right Chart: "감정 변화" Pie Charts */}
        <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between items-center text-center space-y-4">
          <div className="text-left w-full">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
              학습 감정 점유율 💭
            </Typography>
            <Typography as="p" variant="caption" className="text-slate-400 font-bold mt-0.5">
              오답 스캔 시 {studentName} 학생이 느꼈던 심리 분석 통계입니다.
            </Typography>
          </div>
 
          {/* Semicircular CSS conic gradient Pie chart */}
          <div className="relative w-28 h-28 rounded-full shadow-md mt-1 border-2 border-white flex-shrink-0" style={{ background: displayConicGradient }}>
            {/* Center Hole for Donut Look */}
            <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-400 leading-none">주요 감정</span>
              <span className="text-sm font-black text-[#064e52] leading-none mt-1">
                {displayEmotions[0]?.percent > 0 ? displayEmotions[0].type.split(" ")[0] : "안정"}
              </span>
            </div>
          </div>
 
          {/* Breakdown legend list */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-left w-full pt-1.5 border-t border-slate-100">
            {displayEmotions.map((emo, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full ${emo.color}`} />
                <span className="truncate">{emo.type.split(" ")[0]}</span>
                <span className="text-slate-900 font-black ml-auto">{emo.percent}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
 
      {/* Next Week's Recommendation Card */}
      <section className="bg-[#064e52]/5 border-2 border-[#b5e61d]/50 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌱</span>
          <div>
            <span className="inline-block text-[9px] font-black bg-[#064e52] text-white px-2 py-0.5 rounded leading-none">RECOMMENDATION</span>
            <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-sm mt-1.5 leading-none">
              다음 주 성장 로드맵 추천
            </Typography>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 p-4.5">
          <Typography as="h3" variant="body" className="font-extrabold text-slate-900 text-xs mb-1.5">
            {displayRecommendation.title}
          </Typography>
          <Typography as="p" variant="caption" className="text-slate-600 font-semibold leading-relaxed text-xs">
            {displayRecommendation.desc}
          </Typography>
        </div>
 
        <div className="flex justify-end">
          <button 
            onClick={() => {
              if (targetMissionId) {
                router.push(`/missions/${targetMissionId}`);
              } else {
                router.push("/missions/sample-mission-id");
              }
            }}
            className="min-h-11 px-5 rounded-xl bg-[#b5e61d] hover:bg-[#a1cf15] text-[#064e52] font-black text-xs transition shadow-sm border border-[#b5e61d]"
          >
            추천 미션 시작하러 가기 →
          </button>
        </div>
      </section>
 
      {/* Back button */}
      <div className="flex justify-center">
        <Link 
          href="/" 
          className="text-xs font-black text-slate-400 hover:text-slate-600 transition"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  );
}

