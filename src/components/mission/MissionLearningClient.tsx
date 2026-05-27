"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, Typography } from "@/components/common";
import { useTimer } from "@/hooks/useTimer";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserSupabaseClient } from "@/services/supabase";

const MISSION_SECONDS = 10 * 60;

interface MissionHint {
  encouragement: string;
  hint: string;
  id: string;
  title: string;
}

interface Mission {
  concept: string;
  energyReward: number;
  hints: MissionHint[];
  id: string;
  prompt: string;
  title: string;
  currentStep: number;
  isCompleted: boolean;
  questionId: string;
}

interface MissionLearningClientProps {
  mission: Mission;
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function MissionLearningClient({ mission }: MissionLearningClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { user, isAuthenticated } = useAuth();
  const isDemoStudent = !isAuthenticated || (user && user.email === "student@loopnote.com");
  const studentName = user?.user_metadata?.full_name || "지우";
  
  // Timer Hook
  const { progress, remainingSeconds, reset } = useTimer({
    autoStart: true,
    initialSeconds: MISSION_SECONDS,
  });

  const timerLabel = useMemo(() => formatTime(remainingSeconds), [remainingSeconds]);

  // Step state (1: 생각 열기, 2: 설명하기, 3: 정리하기)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [step1Answer, setStep1Answer] = useState("");
  const [step2Answer, setStep2Answer] = useState("");
  const [step3Answer, setStep3Answer] = useState("");
  
  // Real-time AI Step Evaluation States
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState<string | null>(null);
  const [isFeedbackError, setIsFeedbackError] = useState(false);

  // Pizza Slices controls on the left canvas (used for fractions)
  const [pizza1Slices, setPizza1Slices] = useState(3);
  const [pizza2Slices, setPizza2Slices] = useState(5);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Detect if concept is fraction-related to render pizza visualization
  const isFractionConcept = useMemo(() => {
    const conceptName = (mission.concept || "").toLowerCase();
    const promptText = (mission.prompt || "").toLowerCase();
    return conceptName.includes("분수") || conceptName.includes("fraction") || promptText.includes("분수") || promptText.includes("피자");
  }, [mission.concept, mission.prompt]);

  // Fetch the question image URL dynamically
  useEffect(() => {
    if (!mission.questionId) return;
    let isMounted = true;

    const fetchQuestionImage = async () => {
      try {
        const { data, error } = await supabase
          .from("questions")
          .select("image_url")
          .eq("id", mission.questionId)
          .single();

        if (error) throw error;
        if (data && isMounted) {
          setImageUrl(data.image_url);
        }
      } catch (err) {
        console.error("Failed to fetch mission question image:", err);
      }
    };

    void fetchQuestionImage();
    return () => {
      isMounted = false;
    };
  }, [mission.questionId, supabase]);

  // Auto-scroll questions list when step changes
  useEffect(() => {
    const el = document.getElementById(`step-card-${currentStep}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentStep]);

  // Render SVG Pizza slices (fraction visualizer helper)
  const renderPizzaSlices = (slices: number, highlightIndex: number = 0, colorTheme: "teal" | "lime") => {
    const r = 40;
    const cx = 50;
    const cy = 50;
    const paths = [];

    const highlightFill = colorTheme === "teal" ? "#ffedd5" : "#f7fee7";
    const highlightStroke = colorTheme === "teal" ? "#f97316" : "#84cc16";
    const standardFill = "#ffffff";
    const standardStroke = "#e2e8f0";

    for (let i = 0; i < slices; i++) {
      const startAngle = i * (360 / slices) - 90;
      const endAngle = (i + 1) * (360 / slices) - 90;

      const radStart = (startAngle * Math.PI) / 180;
      const radEnd = (endAngle * Math.PI) / 180;

      const x1 = cx + r * Math.cos(radStart);
      const y1 = cy + r * Math.sin(radStart);
      const x2 = cx + r * Math.cos(radEnd);
      const y2 = cy + r * Math.sin(radEnd);

      const largeArcFlag = 360 / slices > 180 ? 1 : 0;
      const isHighlighted = i === highlightIndex;

      const d = `
        M ${cx} ${cy}
        L ${x1} ${y1}
        A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `;

      paths.push(
        <path
          key={i}
          d={d}
          fill={isHighlighted ? highlightFill : standardFill}
          stroke={isHighlighted ? highlightStroke : standardStroke}
          strokeWidth={isHighlighted ? "2" : "1"}
          className="transition-all duration-300"
        />
      );
      
      // Draw a small topping on highlighted slice
      if (isHighlighted && slices <= 12) {
        const midAngle = startAngle + (360 / slices) / 2;
        const radMid = (midAngle * Math.PI) / 180;
        const tx = cx + (r * 0.6) * Math.cos(radMid);
        const ty = cy + (r * 0.6) * Math.sin(radMid);
        paths.push(
          <circle
            key={`topping-${i}`}
            cx={tx}
            cy={ty}
            r="3"
            fill="#ef4444"
          />
        );
      }
    }

    return paths;
  };

  const handleNextStep = async () => {
    let answer = "";
    let stepTitle = "";
    let stepHint = "";

    if (currentStep === 1) {
      if (!step1Answer.trim()) return;
      answer = step1Answer;
      stepTitle = mission.hints[0]?.title || "생각 열기";
      stepHint = mission.hints[0]?.hint || "";
    } else if (currentStep === 2) {
      if (!step2Answer.trim()) return;
      answer = step2Answer;
      stepTitle = mission.hints[1]?.title || "설명하기";
      stepHint = mission.hints[1]?.hint || "";
    } else {
      return;
    }

    setIsEvaluating(true);
    setEvaluationFeedback(null);
    setIsFeedbackError(false);

    if (isDemoStudent) {
      alert("체험용 계정에서는 미션 풀이 상태가 저장되지 않으며 AI 평가 요청이 제한됩니다. 로그인 후 나의 오답 미션을 직접 완료해 보세요! 🌱");
      setEvaluationFeedback("참 멋진 생각이에요! 다음 단계로 넘어가 볼까요? (체험 모드 로컬 자동 통과) 🚀");
      setTimeout(() => {
        setEvaluationFeedback(null);
        setCurrentStep((prev) => (prev + 1));
      }, 1200);
      setIsEvaluating(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      // Fallback for guest mode or offline: check if answer length > 3
      if (!token) {
        if (answer.trim().length < 4) {
          setIsFeedbackError(true);
          setEvaluationFeedback("답변이 너무 짧아요! 나의 멋진 생각을 조금 더 구체적으로 적어주세요. 🌱");
          setIsEvaluating(false);
          return;
        }
        setEvaluationFeedback("참 멋진 생각이에요! 다음 단계로 넘어가 볼까요? 🚀");
        setTimeout(() => {
          setEvaluationFeedback(null);
          setCurrentStep((prev) => (prev + 1));
        }, 1200);
        setIsEvaluating(false);
        return;
      }

      // Call the AI evaluation endpoint
      const response = await fetch("/api/missions/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemText: mission.prompt,
          stepTitle,
          stepHint,
          studentAnswer: answer,
        }),
      });

      if (!response.ok) {
        throw new Error("평가 요청 실패");
      }

      const resData = (await response.json()) as { isCorrect: boolean; feedback: string };

      if (resData.isCorrect) {
        setIsFeedbackError(false);
        setEvaluationFeedback(resData.feedback || "정말 훌륭한 시도입니다! 잘 이해하셨네요! ✨");
        
        // Sync intermediate step progress to DB
        try {
          await fetch("/api/missions/progress", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              missionId: mission.id,
              step: currentStep,
              isCompleted: false,
            }),
          });
        } catch (dbErr) {
          console.warn("Failed to sync intermediate progress to DB:", dbErr);
        }

        // Proceed after a brief display
        setTimeout(() => {
          setEvaluationFeedback(null);
          setCurrentStep((prev) => (prev + 1));
        }, 2200);
      } else {
        setIsFeedbackError(true);
        setEvaluationFeedback(resData.feedback || "음, 조금 빗나간 것 같아요. 힌트를 다시 읽고 다시 한 번 도전해 볼까요? 😕");
      }
    } catch (err) {
      console.error("Evaluation failed, using offline fallback:", err);
      if (answer.trim().length < 4) {
        setIsFeedbackError(true);
        setEvaluationFeedback("답변이 너무 짧거나 아쉬워요! 조금만 더 길고 자세하게 내 생각을 적어 볼까요? 🌱");
      } else {
        setEvaluationFeedback("성공적으로 분석되었습니다! 다음 단계로 전개합니다.");
        setTimeout(() => {
          setEvaluationFeedback(null);
          setCurrentStep((prev) => (prev + 1));
        }, 1200);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveAndComplete = async () => {
    if (!step3Answer.trim()) return;
    setIsSaving(true);
    setEvaluationFeedback(null);
    setIsFeedbackError(false);

    if (isDemoStudent) {
      alert("체험용 계정에서는 미션 완료 저장이 제한됩니다. 로그인 후 나의 오답 미션을 직접 완료해 보세요! 🌱");
      setIsSuccessModalOpen(true);
      setIsSaving(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        const response = await fetch("/api/missions/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            problemText: mission.prompt,
            stepTitle: mission.hints[2]?.title || "정리하기",
            stepHint: mission.hints[2]?.hint || "",
            studentAnswer: step3Answer,
          }),
        });

        if (response.ok) {
          const resData = (await response.json()) as { isCorrect: boolean; feedback: string };
          if (!resData.isCorrect) {
            setIsFeedbackError(true);
            setEvaluationFeedback(resData.feedback || "음, 개념 요약이나 퀴즈가 조금 아쉬워요. 다시 적어볼까요? 😕");
            setIsSaving(false);
            return;
          }
        }
      } else {
        if (step3Answer.trim().length < 2) {
          setIsFeedbackError(true);
          setEvaluationFeedback("요약 정답을 선택하거나 입력해 주세요! 🌱");
          setIsSaving(false);
          return;
        }
      }

      // Update progress and completion via secure API instead of browser-direct supabase client
      const completeRes = await fetch("/api/missions/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          missionId: mission.id,
          questionId: mission.questionId,
          step: 3,
          isCompleted: true,
        }),
      });

      if (!completeRes.ok) {
        throw new Error("미션 완료 API 통신 실패");
      }

      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error("Error saving recovery progress:", err);
      // Fallback to show success modal
      setIsSuccessModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2 flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Deep Teal Header detailing active recovery mission */}
      <section className="bg-gradient-to-r from-[#064e52] to-[#00363a] rounded-3xl p-6 text-white shadow-md border border-[#002a2d] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-[#b5e61d] text-[#064e52] px-2.5 py-0.5 rounded uppercase tracking-wider">
              ACTIVE LOOP MISSION
            </span>
            <span className="text-xs font-bold text-teal-200/80">
              ⚡ +{mission.energyReward} EP
            </span>
          </div>
          <Typography as="h1" variant="h2" className="text-white font-black text-xl">
            {mission.concept}: {isFractionConcept ? "피자 조각 분모 비밀 풀기 🍕" : "막힌 생각 해결하기 💡"}
          </Typography>
          <Typography as="p" variant="caption" className="text-teal-100/70 font-semibold max-w-xl">
            {isFractionConcept 
              ? "그림 속 피자 슬라이더를 직접 늘려보고 줄이며, 분모 크기에 따른 분수의 참모습을 발견해 봐요."
              : "선생님이 짚어준 힌트 단계를 차근차근 따라가며, 무엇을 놓쳤었는지 차분하게 생각을 열어보세요."}
          </Typography>
        </div>

        {/* Dynamic Timer display */}
        <div className="flex items-center gap-3 bg-black/20 rounded-2xl p-3 border border-white/5 flex-shrink-0">
          <span className="text-xl">⏱️</span>
          <div className="text-left min-w-[70px]">
            <span className="block text-[8px] font-black text-teal-200/60 uppercase tracking-widest leading-none">REMAINING</span>
            <span className="text-lg font-black text-[#b5e61d] leading-none animate-pulse">{timerLabel}</span>
          </div>
        </div>
      </section>

      {/* 2-Column Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Column: Interactive Fraction Pizza Visualizer OR Original Snapped Question Image */}
        {isFractionConcept ? (
          <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col justify-between min-h-[480px]">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                인터랙티브 분수 비교 캔버스 🎨
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-normal">
                슬라이더를 조절해 피자를 더 조각내 보세요. 조각이 많아질수록 1조각의 크기가 어떻게 변하는지 확인해 봐요!
              </Typography>
            </div>

            {/* Interactive Pizza Visualizations */}
            <div className="flex flex-col gap-6 py-4 flex-grow justify-center">
              {/* Pizza 1 */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-3 shadow-inner">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black text-[#064e52]">첫 번째 피자 (1/{pizza1Slices})</span>
                  <span className="text-xs font-black text-[#0d6e73] bg-[#0d6e73]/10 px-2 py-0.5 rounded-full">
                    분모: {pizza1Slices}
                  </span>
                </div>
                
                <svg className="w-24 h-24 drop-shadow-md hover:scale-105 transition duration-300" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  {renderPizzaSlices(pizza1Slices, 0, "teal")}
                </svg>

                {/* Slider for Denominator */}
                <div className="w-full flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-400 font-black">2등분</span>
                  <input 
                    type="range" 
                    min="2" 
                    max="12" 
                    value={pizza1Slices}
                    onChange={(e) => setPizza1Slices(Number(e.target.value))}
                    className="flex-1 accent-[#064e52] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-black">12등분</span>
                </div>
              </div>

              {/* Pizza 2 */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-3 shadow-inner">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black text-[#064e52]">두 번째 피자 (1/{pizza2Slices})</span>
                  <span className="text-xs font-black text-[#84cc16] bg-[#84cc16]/10 px-2 py-0.5 rounded-full">
                    분모: {pizza2Slices}
                  </span>
                </div>
                
                <svg className="w-24 h-24 drop-shadow-md hover:scale-105 transition duration-300" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  {renderPizzaSlices(pizza2Slices, 0, "lime")}
                </svg>

                {/* Slider for Denominator */}
                <div className="w-full flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-400 font-black">2등분</span>
                  <input 
                    type="range" 
                    min="2" 
                    max="12" 
                    value={pizza2Slices}
                    onChange={(e) => setPizza2Slices(Number(e.target.value))}
                    className="flex-1 accent-[#84cc16] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-black">12등분</span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 text-center font-bold">
              💡 왼쪽 피자 1조각과 오른쪽 피자 1조각의 크기를 직관적으로 대조해 보세요.
            </div>
          </section>
        ) : (
          <section className="md:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm flex flex-col justify-between min-h-[480px]">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                나의 오답 원본 분석보드 📸
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-normal">
                내가 올렸던 문제 이미지입니다. 나의 풀이 흔적과 원래 질문을 다시 천천히 읽어보세요.
              </Typography>
            </div>

            {/* Original Problem Image display */}
            <div className="flex-grow flex items-center justify-center p-2 bg-[#f8fafc] rounded-2xl border border-slate-100 shadow-inner overflow-hidden min-h-[260px] relative group">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Original Wrong Question"
                  className="max-h-[300px] object-contain rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="text-center p-4 space-y-2">
                  <span className="text-4xl block animate-pulse">📷</span>
                  <span className="text-xs font-black text-slate-400 block">이미지를 불러오는 중...</span>
                </div>
              )}
            </div>

            <div className="mt-4 bg-[#f8fafc] border border-slate-100/80 p-3 rounded-2xl">
              <span className="block text-[9px] font-black text-slate-400 tracking-widest mb-1">
                QUESTION PROMPT TEXT
              </span>
              <p className="text-[11px] font-bold text-slate-700 leading-relaxed max-h-[80px] overflow-y-auto pr-1">
                {mission.prompt || "오답 이미지 분석이 완료되었습니다. 제공되는 3단계 회복 미션에 따라 생각을 전개해 보세요."}
              </p>
            </div>
          </section>
        )}

        {/* Right Structured Question Cards (3 Columns on Desktop) */}
        <section className="md:col-span-3 flex flex-col gap-4">
          
          {/* Card 1: 생각 열기 */}
          <div 
            id="step-card-1"
            className={`rounded-3xl border p-5 transition duration-300 flex flex-col gap-4 ${
              currentStep === 1 
                ? "border-[#064e52] bg-white shadow-md ring-1 ring-[#064e52]/10" 
                : currentStep > 1 
                  ? "border-[#b5e61d] bg-[#b5e61d]/5 opacity-80" 
                  : "border-slate-100 bg-white opacity-40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                  currentStep > 1 ? "bg-[#b5e61d] text-[#064e52]" : "bg-[#064e52] text-white"
                }`}>
                  1
                </span>
                <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-sm">
                  1단계: {mission.hints[0]?.title || "생각 열기"} 💡
                </Typography>
              </div>
              {currentStep > 1 && <span className="text-xs font-black text-[#0d6e73]">✓ 완료됨</span>}
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {mission.hints[0]?.hint || "오답을 천천히 뜯어보며 왜 그렇게 생각했는지 힌트를 얻어봐요."}
            </p>

            {currentStep === 1 ? (
              <textarea
                value={step1Answer}
                onChange={(e) => {
                  setStep1Answer(e.target.value);
                  setEvaluationFeedback(null);
                }}
                disabled={isEvaluating}
                placeholder="질문 단계의 해결 생각이나 계산 과정을 이곳에 적어보세요."
                className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium focus:border-[#064e52] focus:ring-1 focus:ring-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc] disabled:opacity-75"
                rows={3}
              />
            ) : (
              <div className="text-xs font-bold text-slate-700 bg-white/70 p-3 rounded-xl border border-slate-100">
                {step1Answer}
              </div>
            )}
            
            {currentStep === 1 && evaluationFeedback && (
              <div className={`text-xs font-bold p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-2.5 ${
                isFeedbackError 
                  ? "bg-rose-50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="text-sm">{isFeedbackError ? "😕" : "✨"}</span>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 1 && mission.hints[0]?.encouragement && (
              <div className="text-[10px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 rounded-lg">
                📣 튜터 격려: "{mission.hints[0].encouragement}"
              </div>
            )}
          </div>

          {/* Card 2: 설명하기 */}
          <div 
            id="step-card-2"
            className={`rounded-3xl border p-5 transition duration-300 flex flex-col gap-4 ${
              currentStep === 2 
                ? "border-[#064e52] bg-white shadow-md ring-1 ring-[#064e52]/10" 
                : currentStep > 2 
                  ? "border-[#b5e61d] bg-[#b5e61d]/5 opacity-80" 
                  : "border-slate-100 bg-white opacity-40"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                  currentStep > 2 ? "bg-[#b5e61d] text-[#064e52]" : currentStep === 2 ? "bg-[#064e52] text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  2
                </span>
                <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-sm">
                  2단계: {mission.hints[1]?.title || "설명하기"} 🧮
                </Typography>
              </div>
              {currentStep > 2 && <span className="text-xs font-black text-[#0d6e73]">✓ 완료됨</span>}
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {mission.hints[1]?.hint || "이 문제의 핵심 개념을 스스로 다시 한 번 설명해 보세요."}
            </p>

            {currentStep === 2 ? (
              <textarea
                value={step2Answer}
                onChange={(e) => {
                  setStep2Answer(e.target.value);
                  setEvaluationFeedback(null);
                }}
                disabled={isEvaluating}
                placeholder="배운 개념과 캔버스 그림을 대조하며 발견한 생각이나 특징을 적어보세요."
                className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium focus:border-[#064e52] focus:ring-1 focus:ring-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc] disabled:opacity-75"
                rows={3}
              />
            ) : (
              currentStep > 2 ? (
                <div className="text-xs font-bold text-slate-700 bg-white/70 p-3 rounded-xl border border-slate-100">
                  {step2Answer}
                </div>
              ) : null
            )}
            
            {currentStep === 2 && evaluationFeedback && (
              <div className={`text-xs font-bold p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-2.5 ${
                isFeedbackError 
                  ? "bg-rose-50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="text-sm">{isFeedbackError ? "😕" : "✨"}</span>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 2 && mission.hints[1]?.encouragement && (
              <div className="text-[10px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 rounded-lg">
                📣 튜터 격려: "{mission.hints[1].encouragement}"
              </div>
            )}
          </div>

          {/* Card 3: 정리하기 */}
          <div 
            id="step-card-3"
            className={`rounded-3xl border p-5 transition duration-300 flex flex-col gap-4 ${
              currentStep === 3 
                ? "border-[#064e52] bg-white shadow-md ring-1 ring-[#064e52]/10" 
                : "border-slate-100 bg-white opacity-40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-black ${
                currentStep === 3 ? "bg-[#064e52] text-white" : "bg-slate-100 text-slate-400"
              }`}>
                3
              </span>
              <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-sm">
                3단계: {mission.hints[2]?.title || "정리하기"} 🎯
              </Typography>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {mission.hints[2]?.hint || "이번 오답 미션을 완수하기 위해 알게 된 개념을 한 줄로 완벽히 요약정리해 봐요."}
            </p>

            {currentStep === 3 && (
              isFractionConcept ? (
                <div className="grid grid-cols-2 gap-3">
                  {["작을수록", "클수록"].map((opt) => {
                    const isSelected = step3Answer === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isEvaluating}
                        onClick={() => {
                          setStep3Answer(opt);
                          setEvaluationFeedback(null);
                        }}
                        className={`py-3.5 rounded-2xl border-2 text-xs font-black transition duration-200 ${
                          isSelected 
                            ? "bg-[#b5e61d] text-[#064e52] border-[#b5e61d] shadow-sm" 
                            : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50 disabled:opacity-50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={step3Answer}
                  onChange={(e) => {
                    setStep3Answer(e.target.value);
                    setEvaluationFeedback(null);
                  }}
                  disabled={isEvaluating}
                  placeholder="내가 얻은 최적의 해결책과 정리 요약이나 퀴즈의 최종 답안을 직접 입력해 주세요."
                  className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium focus:border-[#064e52] focus:ring-1 focus:ring-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc] disabled:opacity-75"
                  rows={3}
                />
              )
            )}
            
            {currentStep === 3 && evaluationFeedback && (
              <div className={`text-xs font-bold p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-2.5 ${
                isFeedbackError 
                  ? "bg-rose-50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="text-sm">{isFeedbackError ? "😕" : "✨"}</span>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 3 && mission.hints[2]?.encouragement && (
              <div className="text-[10px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 rounded-lg">
                📣 튜터 격려: "{mission.hints[2].encouragement}"
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Progress Footer */}
      <footer className="bg-white rounded-3xl border border-slate-200/60 p-4.5 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
        {/* Footsteps Progress */}
        <div className="flex items-center gap-2.5">
          <span className={`text-xs font-black ${currentStep >= 1 ? "text-[#064e52]" : "text-slate-400"}`}>
            1 생각 열기 {currentStep > 1 ? "✓" : ""}
          </span>
          <span className="text-slate-300">→</span>
          <span className={`text-xs font-black ${currentStep >= 2 ? "text-[#064e52]" : "text-slate-400"}`}>
            2 설명하기 {currentStep > 2 ? "✓" : ""}
          </span>
          <span className="text-slate-300">→</span>
          <span className={`text-xs font-black ${currentStep === 3 ? "text-[#064e52]" : "text-slate-400"}`}>
            3 정리하기
          </span>
        </div>

        {/* Action Button */}
        {currentStep < 3 ? (
          <Button
            onClick={handleNextStep}
            disabled={(currentStep === 1 && !step1Answer.trim()) || (currentStep === 2 && !step2Answer.trim()) || isEvaluating}
            isLoading={isEvaluating}
            className="rounded-2xl bg-[#064e52] hover:bg-[#0d6e73] text-white font-black px-6 min-h-12 w-full sm:w-auto"
          >
            {isEvaluating ? "생각 듣는 중... 🤖" : "다음 단계 진행"}
          </Button>
        ) : (
          <Button
            onClick={handleSaveAndComplete}
            disabled={!step3Answer.trim() || isSaving || isEvaluating}
            isLoading={isSaving}
            className="rounded-2xl bg-[#b5e61d] hover:bg-[#a1cf15] text-[#064e52] font-black px-8 min-h-12 w-full sm:w-auto shadow-sm border border-[#b5e61d]"
          >
            {isSaving ? "분석 및 저장 중..." : "완료하고 저장 🚀"}
          </Button>
        )}
      </footer>

      {/* Congratulations / Success Modal */}
      {isSuccessModalOpen && (
        <div 
          aria-modal="true" 
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-3 border-[#b5e61d] bg-white px-6 py-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Sparkle Emojis */}
            <div className="absolute left-6 top-6 text-3xl">⭐</div>
            <div className="absolute right-6 top-8 text-2xl">✨</div>
            <div className="absolute bottom-6 left-8 text-2xl">🌱</div>
            
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xl">
              회복 미션 성공! 🎉
            </Typography>
            <Typography as="p" variant="body" className="mt-2.5 text-slate-500 font-semibold text-xs leading-relaxed text-left bg-slate-50 p-3 rounded-xl border border-slate-100/60 my-3">
              {isFractionConcept ? (
                <>
                  분수의 분모 비밀을 밝혀내셨군요! <br />
                  {studentName} 학생은 피자 모델로 단위 분수를 확실하게 극복해 <strong>회복 에너지 {mission.energyReward}점</strong>을 모았습니다!
                </>
              ) : (
                <>
                  개념의 막힘을 완벽하게 해결하셨군요! <br />
                  {studentName} 학생은 이번 오답의 핵심 개념(<strong>{mission.concept}</strong>)을 정복하여 <strong>회복 에너지 {mission.energyReward}점</strong>을 모았습니다!
                </>
              )}
            </Typography>

            <div className="my-5 rounded-2xl bg-[#b5e61d]/15 border border-[#b5e61d]/40 py-5 px-4">
              <span className="block text-4xl font-black text-[#064e52] leading-none">
                +{mission.energyReward}
              </span>
              <span className="block text-[10px] font-black text-[#0d6e73] tracking-widest mt-2 uppercase">
                RECOVERY ENERGY EP
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push("/")}
                variant="primary" 
                fullWidth
                className="bg-[#064e52] hover:bg-[#0d6e73] text-white font-black rounded-2xl min-h-11 text-xs"
              >
                대시보드로 돌아가기
              </Button>
              <Button 
                onClick={() => {
                  setStep1Answer("");
                  setStep2Answer("");
                  setStep3Answer("");
                  setCurrentStep(1);
                  setIsSuccessModalOpen(false);
                  reset(MISSION_SECONDS);
                }}
                variant="outline" 
                fullWidth
                className="border-slate-200 hover:bg-slate-50 text-slate-600 font-black rounded-2xl min-h-11 text-xs"
              >
                다시 훈련하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


