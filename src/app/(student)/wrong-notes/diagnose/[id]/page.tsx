"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/services/supabase";

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

export default function DiagnosisResultsPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { isAuthenticated, user } = useAuth();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [concept, setConcept] = useState("오답 분석 및 개념 진단");
  const [confidence, setConfidence] = useState(86);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);

  // Detect if concept relates to fractions to render pizza visual comparisons
  const isFractionConcept = useMemo(() => {
    const conceptName = concept.toLowerCase();
    const promptText = (rawText || "").toLowerCase();
    return conceptName.includes("분수") || conceptName.includes("fraction") || promptText.includes("분수") || promptText.includes("피자");
  }, [concept, rawText]);

  // Dynamic polling or creation of recovery mission
  useEffect(() => {
    let isMounted = true;
    let pollCount = 0;
    let intervalId: NodeJS.Timeout;

    const checkOrCreateMission = async () => {
      if (!id) return;

      try {
        // Query the database for the question and its mission
        const { data: question, error } = await supabase
          .from("questions")
          .select("id, status, image_url, raw_text, recovery_missions(id, steps)")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching question for diagnosis:", error);
        }

        if (question && isMounted) {
          setImageUrl(question.image_url);
          setRawText(question.raw_text);
        }

        const missions = question?.recovery_missions as { id: string; steps: any }[] | undefined;
        if (missions && missions.length > 0) {
          const firstMission = missions[0];
          if (isMounted) {
            setMissionId(firstMission.id);
            
            // Extract concept name from first step title or raw text using intelligent parser
            const steps = firstMission.steps;
            const firstStepTitle = (Array.isArray(steps) && steps.length > 0)
              ? steps[0].title
              : null;
              
            const conceptName = extractConceptName(question?.raw_text || null, firstStepTitle);
            setConcept(conceptName);
            setIsLoading(false);
          }
          return;
        }

        // If guest mode or we checked but auth is unauthenticated
        if (!isAuthenticated) {
          setTimeout(() => {
            if (isMounted) {
              setMissionId("sample-mission-id");
              setConcept("분수의 크기 비교");
              setIsLoading(false);
            }
          }, 1500);
          return;
        }

        // If we polled enough and still no mission, create a default mission in database
        pollCount++;
        if (pollCount < 4) {
          return; // Let next interval poll
        }

        // Fallback default recovery mission steps generator
        const mockSteps = [
          {
            title: "1단계: 생각 열기",
            hint: question?.raw_text 
              ? `오답 문제 "${question.raw_text.slice(0, 30)}..."를 다시 풀어보며, 어느 단계에서 처음 막혔는지 되짚어 봐요.`
              : "문제를 천천히 읽고 내가 맨 처음 적용하려 했던 수학 공식이나 문장 성분을 떠올려보세요.",
            encouragement: "첫 단계부터 차근차근 생각을 열면 충분히 풀 수 있어요!"
          },
          {
            title: "2단계: 설명하기",
            hint: "이번 개념의 핵심 성질이나 규칙을 소리내어 다시 한 번 정리하고, 무엇을 혼동했는지 스스로 설명해 봐요.",
            encouragement: "핵심 원리를 한 번 더 소리내어 정리하는 것이 마스터의 열쇠예요!"
          },
          {
            title: "3단계: 정리하기",
            hint: "배운 지식을 바탕으로 최종 정답을 도출하고, 다음번 유사 문제가 나왔을 때 적용할 나만의 해결 규칙을 기록하세요.",
            encouragement: "완료 단계입니다. 끝까지 힘을 내어 저장을 완료하세요!"
          }
        ];

        const { data: newMission } = await supabase
          .from("recovery_missions")
          .insert({
            question_id: id,
            current_step: 0,
            is_completed: false,
            steps: mockSteps
          })
          .select("id")
          .single();

        if (newMission && isMounted) {
          setMissionId(newMission.id);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed in diagnosis verification:", err);
        if (isMounted) setIsLoading(false);
      }
    };

    void checkOrCreateMission();
    intervalId = setInterval(checkOrCreateMission, 2500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [id, isAuthenticated, user?.id, supabase, concept]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-5 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-teal-200 border-t-[#064e52]" />
          <div className="text-2xl">🤖</div>
        </div>
        <div>
          <Typography as="h2" variant="h2" className="text-[#064e52] font-black">
            AI 진단 분석 중
          </Typography>
          <Typography as="p" variant="body" className="mt-2 text-slate-500 font-bold max-w-xs mx-auto text-xs leading-relaxed animate-pulse">
            문제를 정밀하게 스캔하여 막힌 원인과 오답 감정을 분석하고 있습니다. 잠시만 기다려 주세요!
          </Typography>
        </div>
      </div>
    );
  }

  // Tailored Diagnosis Cards based on Concept
  const diagnosisItems = isFractionConcept
    ? [
        { tag: "분모 크기 착각", desc: "분수 크기 판별 시 분모 숫자가 크면 더 큰 분수라고 인지하는 고정 관념 발견." },
        { tag: "나눗셈 결손", desc: "단위 분수의 원리인 '1 전체를 N등분한다'는 개념적 나눗셈 메커니즘을 제대로 숙지하지 못함." },
        { tag: "감정적 불안정", desc: "문제 풀이 도중 '헷갈림 😕' 상태에 도달해, 논리적 증명 없이 임의의 찍기 성향이 관측됨." },
      ]
    : [
        { tag: "막힘 지점 감지", desc: `핵심 개념인 "${concept}" 문제를 전개하는 도중 핵심 공식을 오적용하거나 논리를 비약한 지점 관측.` },
        { tag: "개념 결손 분석", desc: "문제 해결 과정에서 세부적인 중간 변환 단계를 생략하거나 직관적으로 넘어가며 오류가 누적됨." },
        { tag: "감정적 불안정", desc: "오답 원인을 돌아볼 때 복잡한 계산식이나 질문에 직면하여 심리적으로 주저한 성향이 발견됨." },
      ];

  return (
    <div className="max-w-2xl mx-auto py-2 flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Teal Hero Banner */}
      <section className="bg-gradient-to-br from-[#064e52] to-[#00363a] rounded-3xl p-6 md:p-8 text-white shadow-lg border border-[#002d30] relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
          <span className="text-9xl">🔬</span>
        </div>
        <div className="space-y-2 relative z-10">
          <span className="inline-block text-[10px] font-black bg-[#b5e61d] text-[#064e52] px-2.5 py-1 rounded-md tracking-wider">
            AI DIAGNOSIS RESULTS
          </span>
          <Typography as="h1" variant="h1" className="text-white font-black text-2xl md:text-3xl leading-snug">
            진단 결과: <span className="text-[#b5e61d]">{isFractionConcept ? "개념 혼동" : "논리 구조 막힘"}</span>
          </Typography>
          <Typography as="p" variant="body" className="text-teal-100/90 text-xs md:text-sm font-semibold leading-relaxed max-w-md">
            {isFractionConcept ? (
              <>
                지우 학생은 분모가 클수록 전체 크기가 크다고 착각하여 <strong>1/3 &lt; 1/5</strong>로 대답한 것으로 분석되었습니다. 단위 분수의 크기를 피자 모델로 재진단합니다.
              </>
            ) : (
              <>
                지우 학생은 <strong>{concept}</strong> 오답 분석에서 핵심 해결 원리나 논리 단계를 놓친 것으로 분석되었습니다. AI의 소크라테스식 힌트로 개념을 완벽 재진단합니다.
              </>
            )}
          </Typography>
        </div>
      </section>

      {/* Concept Visualizer & Confidence Gauge Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Concept Visualizer: Pizza Fractions OR Snapped Image Analysis */}
        {isFractionConcept ? (
          <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                비주얼 오답 분석: 피자 모델 🍕
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold">
                분모의 숫자가 커질수록 나누는 조각이 늘어나 1조각의 크기가 작아집니다!
              </Typography>
            </div>

            {/* Pizza SVG Comparison */}
            <div className="flex items-center justify-around py-4 bg-slate-50 rounded-2xl border border-slate-100/50">
              {/* Pizza 1/3 */}
              <div className="flex flex-col items-center gap-2">
                <svg className="w-24 h-24 drop-shadow-md" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  <path d="M50 50 L50 6 A44 44 0 0 1 88.1 72Z" fill="#ffedd5" stroke="#f97316" strokeWidth="1.5" />
                  <path d="M50 50 L50 6 A44 44 0 0 1 88.1 72Z" fill="url(#crust1_3)" opacity="0.9" />
                  <circle cx="62" cy="30" r="4" fill="#ef4444" />
                  <circle cx="70" cy="45" r="4" fill="#ef4444" />
                  <path d="M54 20 Q56 22 58 20" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                  <path d="M50 50 L88.1 72 A44 44 0 0 1 11.9 72Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M50 50 L11.9 72 A44 44 0 0 1 50 6Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <defs>
                    <linearGradient id="crust1_3" x1="50" y1="50" x2="88" y2="72">
                      <stop stopColor="#ffb923" stopOpacity="0.3" />
                      <stop offset="1" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-xs font-black text-[#064e52] bg-[#b5e61d]/20 px-2 py-0.5 rounded-full">
                  1/3 조각 (크다!)
                </span>
              </div>

              <div className="text-slate-300 font-black text-xl">&gt;</div>

              {/* Pizza 1/5 */}
              <div className="flex flex-col items-center gap-2">
                <svg className="w-24 h-24 drop-shadow-md" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  <path d="M50 50 L50 6 A44 44 0 0 1 91.8 36.4Z" fill="#ffedd5" stroke="#f97316" strokeWidth="1.5" />
                  <path d="M50 50 L50 6 A44 44 0 0 1 91.8 36.4Z" fill="url(#crust1_5)" opacity="0.9" />
                  <circle cx="68" cy="18" r="3" fill="#ef4444" />
                  <path d="M58 12 Q60 14 62 12" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" />
                  <path d="M50 50 L91.8 36.4 A44 44 0 0 1 75.9 85.6Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M50 50 L75.9 85.6 A44 44 0 0 1 24.1 85.6Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M50 50 L24.1 85.6 A44 44 0 0 1 8.2 36.4Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M50 50 L8.2 36.4 A44 44 0 0 1 50 6Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <defs>
                    <linearGradient id="crust1_5" x1="50" y1="50" x2="91.8" y2="36.4">
                      <stop stopColor="#ffb923" stopOpacity="0.3" />
                      <stop offset="1" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  1/5 조각 (작다!)
                </span>
              </div>
            </div>
          </section>
        ) : (
          <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                비주얼 오답 분석: 문제 분석 📸
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold">
                업로드한 오답 사진 원본입니다. 나의 풀이 흔적을 시각적으로 다시 복원합니다.
              </Typography>
            </div>

            {/* Image render */}
            <div className="flex items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100/50 min-h-[135px] overflow-hidden">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Wrong Note Original"
                  className="max-h-[120px] object-contain rounded-lg shadow"
                />
              ) : (
                <div className="text-xs font-black text-slate-400">오답 이미지를 가져오지 못했습니다.</div>
              )}
            </div>
          </section>
        )}

        {/* Confidence Gauge (1 col) */}
        <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col items-center justify-between text-center">
          <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
            분석 신뢰도
          </Typography>

          {/* Semicircle Gauge */}
          <div className="relative w-28 h-28 flex items-center justify-center mt-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="transparent" />
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                stroke="#0d6e73" 
                strokeWidth="10" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 * (1 - confidence / 100)} 
                strokeLinecap="round"
                fill="transparent" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#064e52]">{confidence}%</span>
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">High</span>
            </div>
          </div>

          <Typography as="p" variant="caption" className="text-slate-400 font-bold mt-2">
            AI 모델 정합도 진단
          </Typography>
        </section>
      </div>

      {/* Secondary Error Lists */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
        <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
          상세 오답 진단 요약
        </Typography>
        <ul className="space-y-3">
          {diagnosisItems.map((item, idx) => (
            <li key={idx} className="flex gap-3 items-start p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="flex-shrink-0 text-[10px] font-black text-[#064e52] bg-[#b5e61d] px-2.5 py-1 rounded-lg min-w-[90px] text-center">
                {item.tag}
              </span>
              <span className="text-xs font-semibold text-slate-600 leading-relaxed">
                {item.desc}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Recovery Mission Card */}
      <section className="bg-[#064e52]/5 border-2 border-[#b5e61d]/50 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <span className="inline-block text-[9px] font-black bg-[#064e52] text-white px-2 py-0.5 rounded">RECOMMENDED LOOP</span>
          <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-base mt-1.5">
            {isFractionConcept ? "피자 조각으로 분수 비교하기" : `"${concept}" 회복 미션`}
          </Typography>
          <Typography as="p" variant="caption" className="text-slate-500 font-bold leading-relaxed">
            AI 선생님의 3단계 맞춤 힌트와 시각 캔버스로 개념을 10분 만에 완벽 회복하세요!
          </Typography>
        </div>

        <Link
          href={missionId ? `/missions/${missionId}` : "/wrong-notes"}
          className="inline-flex min-h-12 items-center justify-center px-6 rounded-2xl bg-[#b5e61d] hover:bg-[#a1cf15] text-[#064e52] font-black text-sm transition duration-200 shadow-sm border border-[#b5e61d] flex-shrink-0"
        >
          미션 시작하기 →
        </Link>
      </section>

      {/* Back Button */}
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

