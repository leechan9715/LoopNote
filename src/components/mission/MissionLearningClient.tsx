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

  // Detect if concept is fraction-related
  const isFractionConcept = useMemo(() => {
    const conceptName = (mission.concept || "").toLowerCase();
    const promptText = (mission.prompt || "").toLowerCase();
    return conceptName.includes("분수") || conceptName.includes("fraction") || promptText.includes("분수") || promptText.includes("피자");
  }, [mission.concept, mission.prompt]);

  // Fetch the question image URL dynamically
  useEffect(() => {
    if (!mission.questionId || mission.questionId.startsWith("sample") || isDemoStudent) {
      return;
    }
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
      } catch (err: any) {
        console.warn("Could not load mission question image (using fallback):", err?.message || err);
      }
    };

    void fetchQuestionImage();
    return () => {
      isMounted = false;
    };
  }, [mission.questionId, supabase, isDemoStudent]);

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
      alert("체험용 계정에서는 미션 풀이 상태가 저장되지 않으며 AI 평가 요청이 제한됩니다. 로그인 후 실제 오답 미션을 직접 완료해 보세요!");
      setEvaluationFeedback("훌륭한 생각입니다! 다음 단계로 자동 진행합니다.");
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
      
      // Fallback for guest mode or offline
      if (!token) {
        if (answer.trim().length < 4) {
          setIsFeedbackError(true);
          setEvaluationFeedback("답변이 너무 짧습니다. 생각을 조금 더 구체적으로 적어 주세요.");
          setIsEvaluating(false);
          return;
        }
        setEvaluationFeedback("훌륭한 생각입니다! 다음 단계로 자동 진행합니다.");
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
        setEvaluationFeedback(resData.feedback || "정말 훌륭한 시도입니다! 잘 이해하셨네요!");
        
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
          console.warn("Failed to sync intermediate progress:", dbErr);
        }

        // Proceed after a brief display
        setTimeout(() => {
          setEvaluationFeedback(null);
          setCurrentStep((prev) => (prev + 1));
        }, 2200);
      } else {
        setIsFeedbackError(true);
        setEvaluationFeedback(resData.feedback || "음, 조금 빗나간 것 같아요. 힌트를 다시 읽고 다시 한 번 도전해 볼까요?");
      }
    } catch (err: any) {
      console.warn("Evaluation failed, using offline fallback:", err?.message || err);
      if (answer.trim().length < 4) {
        setIsFeedbackError(true);
        setEvaluationFeedback("답변이 너무 짧습니다. 조금만 더 설명해 주세요.");
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
      alert("체험용 계정에서는 미션 완료 저장이 제한됩니다. 로그인 후 실제 오답 미션을 직접 완료해 보세요!");
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
            setEvaluationFeedback(resData.feedback || "음, 개념 요약이나 퀴즈가 조금 아쉬워요. 다시 적어볼까요?");
            setIsSaving(false);
            return;
          }
        }
      } else {
        if (step3Answer.trim().length < 2) {
          setIsFeedbackError(true);
          setEvaluationFeedback("요약 정답을 선택하거나 입력해 주세요!");
          setIsSaving(false);
          return;
        }
      }

      // Update progress and completion via secure API
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
    } catch (err: any) {
      console.warn("Error saving recovery progress:", err?.message || err);
      setIsSuccessModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 flex flex-col gap-6 animate-in fade-in duration-300 pb-16 text-left">
      
      {/* Deep Teal Header */}
      <section className="bg-gradient-to-r from-[#064e52] to-[#00282b] rounded-[2rem] p-6 text-white shadow-xl border border-[#0d6e73]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#ccff00]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black bg-[#ccff00] text-[#064e52] px-3 py-1 rounded-md tracking-widest uppercase shadow-sm">
              Active Loop Mission
            </span>
            <span className="text-[9.5px] font-black text-teal-200 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
              Reward: +{mission.energyReward} EP
            </span>
          </div>
          <Typography as="h1" variant="h2" className="text-white font-black text-xl md:text-2xl tracking-tight uppercase">
            {mission.concept}: {isFractionConcept ? "분모 크기 개념 비교 복습" : "개념 논리 흐름 복구"}
          </Typography>
          <Typography as="p" variant="caption" className="text-teal-100/85 font-semibold text-xs md:text-sm max-w-xl leading-relaxed">
            {isFractionConcept 
              ? "그림 속 피자 등분막대를 직접 조절하며 분수 크기의 물리적 비교 원리를 정확하게 이해하세요."
              : "선생님이 짚어준 힌트 단계를 차근차근 따라가며, 오답 오류 지점을 능동적으로 교정해 가세요."}
          </Typography>
        </div>
 
        {/* Timer display */}
        <div className="flex items-center gap-3 bg-black/20 rounded-2xl p-3 px-4 border border-white/5 flex-shrink-0 relative z-10">
          <div className="text-left min-w-[70px]">
            <span className="block text-[8px] font-black text-teal-200/60 uppercase tracking-widest leading-none mb-1">REMAINING</span>
            <span className="text-lg font-black text-[#ccff00] leading-none animate-pulse-glow">{timerLabel}</span>
          </div>
        </div>
      </section>

      {/* 2-Column Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Column: Interactive Fraction Pizza Visualizer OR Original Snapped Question Image */}
        {isFractionConcept ? (
          <section className="md:col-span-2 glass-card rounded-[2rem] border border-white/60 p-6 shadow-[0_20px_50px_rgba(6,78,82,0.02)] flex flex-col justify-between min-h-[480px]">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
                인터랙티브 분수 비교기
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-relaxed text-[10px]">
                슬라이더 조작에 따라 등분수가 쪼개지는 피자 슬라이스 단면적을 확인해 보세요.
              </Typography>
            </div>
 
            {/* Interactive Pizza Visualizations */}
            <div className="flex flex-col gap-6 py-4 flex-grow justify-center">
              {/* Pizza 1 */}
              <div className="bg-[#f8fafc]/55 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-3 shadow-inner">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black text-[#064e52]">첫 번째 피자 (1/{pizza1Slices})</span>
                  <span className="text-xs font-black text-[#0d6e73] bg-[#0d6e73]/10 px-2.5 py-0.5 rounded-full">
                    분모: {pizza1Slices}
                  </span>
                </div>
                
                <svg className="w-24 h-24 drop-shadow-sm hover:scale-105 transition duration-300 animate-float" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  {renderPizzaSlices(pizza1Slices, 0, "teal")}
                </svg>
  
                {/* Slider */}
                <div className="w-full flex items-center gap-3 mt-1 px-1">
                  <span className="text-[10px] text-slate-400 font-black">2등분</span>
                  <input 
                    type="range" 
                    min="2" 
                    max="12" 
                    value={pizza1Slices}
                    onChange={(e) => setPizza1Slices(Number(e.target.value))}
                    className="flex-1 accent-[#064e52] h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-black">12등분</span>
                </div>
              </div>
 
              {/* Pizza 2 */}
              <div className="bg-[#f8fafc]/55 border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-3 shadow-inner">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-black text-[#064e52]">두 번째 피자 (1/{pizza2Slices})</span>
                  <span className="text-xs font-black text-emerald-650 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    분모: {pizza2Slices}
                  </span>
                </div>
                
                <svg className="w-24 h-24 drop-shadow-sm hover:scale-105 transition duration-300 animate-float" style={{ animationDelay: "0.4s" }} viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="#e2e8f0" />
                  <circle cx="50" cy="50" r="44" fill="#ffffff" />
                  {renderPizzaSlices(pizza2Slices, 0, "lime")}
                </svg>
  
                {/* Slider */}
                <div className="w-full flex items-center gap-3 mt-1 px-1">
                  <span className="text-[10px] text-slate-400 font-black">2등분</span>
                  <input 
                    type="range" 
                    min="2" 
                    max="12" 
                    value={pizza2Slices}
                    onChange={(e) => setPizza2Slices(Number(e.target.value))}
                    className="flex-1 accent-[#84cc16] h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 font-black">12등분</span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-slate-400 text-center font-bold">
              분모 숫자가 클수록 조각의 절대 부피가 급격히 하락합니다.
            </div>
          </section>
        ) : (
          <section className="md:col-span-2 glass-card rounded-[2rem] border border-white/60 p-6 shadow-[0_20px_50px_rgba(6,78,82,0.02)] flex flex-col justify-between min-h-[480px]">
            <div className="space-y-1 mb-4">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
                오답 원본 스냅샷
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-normal text-[10px]">
                촬영하여 전송했던 문제 원본의 레이아웃을 다시 참고합니다.
              </Typography>
            </div>
 
            <div className="flex-grow flex items-center justify-center p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner overflow-hidden min-h-[260px] relative group">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Original Wrong Question"
                  className="max-h-[280px] object-contain rounded-xl shadow-md border border-white transition duration-200"
                />
              ) : (
                <div className="text-center p-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Image Loading</span>
                </div>
              )}
            </div>
 
            <div className="mt-5 bg-white/60 border border-slate-100 p-4 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-400 tracking-wider uppercase mb-1.5">
                QUESTION PROMPT
              </span>
              <p className="text-[11px] font-bold text-slate-650 leading-relaxed max-h-[85px] overflow-y-auto pr-1">
                {mission.prompt || "오답에 얽힌 생각 오류 지점 분석 보고가 완료되었습니다. 아래 3단계 타임라인을 채워가세요."}
              </p>
            </div>
          </section>
        )}

        {/* Right Columns: Cognitive Scroll Timeline */}
        <section className="md:col-span-3 flex flex-col gap-4">
          
          {/* Step 1 */}
          <div 
            id="step-card-1"
            className={`rounded-2xl border p-5 md:p-6 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden ${
              currentStep === 1 
                ? "border-[#064e52] bg-white shadow-md" 
                : currentStep > 1 
                  ? "border-slate-200/80 bg-slate-50/55 opacity-75" 
                  : "border-slate-100/50 bg-white/30 opacity-40 pointer-events-none"
            }`}
          >
            {currentStep === 1 && (
              <div className="absolute top-0 left-0 h-[2.5px] w-24 bg-[#064e52]" />
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg text-[10.5px] font-black transition-colors ${
                  currentStep > 1 ? "bg-[#064e52] text-white" : "bg-[#064e52] text-white"
                }`}>
                  1
                </span>
                <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider">
                  1단계: {mission.hints[0]?.title || "생각 열기"}
                </Typography>
              </div>
              {currentStep > 1 && <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shadow-sm">완료</span>}
            </div>

            <p className="text-[11px] font-bold text-slate-500 leading-relaxed bg-[#f8fafc]/70 p-4 rounded-xl border border-slate-150/40">
              {mission.hints[0]?.hint || "오답을 천천히 분석하며 막혔던 시작 지점을 되짚어 보세요."}
            </p>

            {currentStep === 1 ? (
              <textarea
                value={step1Answer}
                onChange={(e) => {
                  setStep1Answer(e.target.value);
                  setEvaluationFeedback(null);
                }}
                disabled={isEvaluating}
                placeholder="질문 단계의 내 생각을 논리적으로 서술해 주세요."
                className="w-full rounded-xl border border-slate-200/80 p-4 text-[11px] font-bold focus:border-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc]/50 disabled:opacity-75"
                rows={3}
              />
            ) : (
              <div className="text-[11px] font-bold text-[#064e52] bg-white/70 p-4 rounded-xl border border-slate-105">
                {step1Answer}
              </div>
            )}
            
            {currentStep === 1 && evaluationFeedback && (
              <div className={`text-[10px] font-bold p-3.5 rounded-xl border transition-all duration-300 ${
                isFeedbackError 
                  ? "bg-rose-50/50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 1 && mission.hints[0]?.encouragement && (
              <div className="text-[9px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 px-3 rounded-lg border border-[#0d6e73]/10">
                AI 코치 조언: "{mission.hints[0].encouragement}"
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div 
            id="step-card-2"
            className={`rounded-2xl border p-5 md:p-6 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden ${
              currentStep === 2 
                ? "border-[#064e52] bg-white shadow-md" 
                : currentStep > 2 
                  ? "border-slate-200/80 bg-slate-50/55 opacity-75" 
                  : "border-slate-100/50 bg-white/30 opacity-40 pointer-events-none"
            }`}
          >
            {currentStep === 2 && (
              <div className="absolute top-0 left-0 h-[2.5px] w-24 bg-[#064e52]" />
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg text-[10.5px] font-black transition-colors ${
                  currentStep > 2 ? "bg-[#064e52] text-white" : currentStep === 2 ? "bg-[#064e52] text-white" : "bg-slate-100 text-slate-400"
                }`}>
                  2
                </span>
                <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider">
                  2단계: {mission.hints[1]?.title || "설명하기"}
                </Typography>
              </div>
              {currentStep > 2 && <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shadow-sm">완료</span>}
            </div>

            <p className="text-[11px] font-bold text-slate-500 leading-relaxed bg-[#f8fafc]/70 p-4 rounded-xl border border-slate-150/40">
              {mission.hints[1]?.hint || "오답의 핵심 개념 원리를 한글이나 수식으로 정리해 보세요."}
            </p>

            {currentStep === 2 ? (
              <textarea
                value={step2Answer}
                onChange={(e) => {
                  setStep2Answer(e.target.value);
                  setEvaluationFeedback(null);
                }}
                disabled={isEvaluating}
                placeholder="개념 모델에서 깨달은 점을 나만의 단어로 설명해 주세요."
                className="w-full rounded-xl border border-slate-200/80 p-4 text-[11px] font-bold focus:border-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc]/50 disabled:opacity-75"
                rows={3}
              />
            ) : (
              currentStep > 2 ? (
                <div className="text-[11px] font-bold text-[#064e52] bg-white/70 p-4 rounded-xl border border-slate-105">
                  {step2Answer}
                </div>
              ) : null
            )}
            
            {currentStep === 2 && evaluationFeedback && (
              <div className={`text-[10px] font-bold p-3.5 rounded-xl border transition-all duration-300 ${
                isFeedbackError 
                  ? "bg-rose-50/50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 2 && mission.hints[1]?.encouragement && (
              <div className="text-[9px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 px-3 rounded-lg border border-[#0d6e73]/10">
                AI 코치 조언: "{mission.hints[1].encouragement}"
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div 
            id="step-card-3"
            className={`rounded-2xl border p-5 md:p-6 transition-all duration-300 flex flex-col gap-4 relative overflow-hidden ${
              currentStep === 3 
                ? "border-[#064e52] bg-white shadow-md" 
                : "border-slate-100 bg-white/30 opacity-40 pointer-events-none"
            }`}
          >
            {currentStep === 3 && (
              <div className="absolute top-0 left-0 h-[2.5px] w-24 bg-[#064e52]" />
            )}
            <div className="flex items-center gap-2.5">
              <span className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg text-[10.5px] font-black transition-colors ${
                currentStep === 3 ? "bg-[#064e52] text-white" : "bg-slate-100 text-slate-400"
              }`}>
                3
              </span>
              <Typography as="h3" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider">
                3단계: {mission.hints[2]?.title || "정리하기"}
              </Typography>
            </div>

            <p className="text-[11px] font-bold text-slate-500 leading-relaxed bg-[#f8fafc]/70 p-4 rounded-xl border border-slate-150/40">
              {mission.hints[2]?.hint || "마지막 단계입니다. 배운 개념 요약 가이드 퀴즈에 마킹해 보세요."}
            </p>

            {currentStep === 3 && (
              isFractionConcept ? (
                <div className="grid grid-cols-2 gap-3 max-w-sm">
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
                        className={`py-3.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-[#ccff00] text-[#064e52] border-[#064e52] shadow-sm" 
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 disabled:opacity-50"
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
                  placeholder="오답 개념의 올바른 해결 공식과 요약 규칙을 입력하세요."
                  className="w-full rounded-xl border border-slate-200 p-4 text-[11px] font-bold focus:border-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc]/50 disabled:opacity-75"
                  rows={3}
                />
              )
            )}
            
            {currentStep === 3 && evaluationFeedback && (
              <div className={`text-[10px] font-bold p-3.5 rounded-xl border transition-all duration-300 ${
                isFeedbackError 
                  ? "bg-rose-50/50 border-rose-100 text-rose-800" 
                  : "bg-emerald-50/50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="leading-relaxed">{evaluationFeedback}</span>
              </div>
            )}
            
            {currentStep === 3 && mission.hints[2]?.encouragement && (
              <div className="text-[9px] text-[#0d6e73] font-bold bg-[#0d6e73]/5 p-2 px-3 rounded-lg border border-[#0d6e73]/10">
                AI 코치 조언: "{mission.hints[2].encouragement}"
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Progress Footer */}
      <footer className="glass-card rounded-[2rem] border border-white/60 p-4 md:p-5 shadow-[0_20px_50px_rgba(6,78,82,0.02)] flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span className={currentStep >= 1 ? "text-[#064e52]" : ""}>01 Open</span>
          <span>➔</span>
          <span className={currentStep >= 2 ? "text-[#064e52]" : ""}>02 Explain</span>
          <span>➔</span>
          <span className={currentStep === 3 ? "text-[#064e52]" : ""}>03 Master</span>
        </div>

        {currentStep < 3 ? (
          <Button
            onClick={handleNextStep}
            disabled={(currentStep === 1 && !step1Answer.trim()) || (currentStep === 2 && !step2Answer.trim()) || isEvaluating}
            isLoading={isEvaluating}
            className="rounded-xl bg-[#064e52] hover:bg-[#00363a] text-white font-black px-6 min-h-12 w-full sm:w-auto text-xs shadow-sm cursor-pointer transition duration-200"
          >
            {isEvaluating ? "생각 로직 검증 중" : "단계 제출 및 검증"}
          </Button>
        ) : (
          <Button
            onClick={handleSaveAndComplete}
            disabled={!step3Answer.trim() || isSaving || isEvaluating}
            isLoading={isSaving}
            className="rounded-xl bg-[#ccff00] hover:bg-[#e1ff66] text-[#064e52] font-black px-8 min-h-12 w-full sm:w-auto text-xs shadow-md shadow-lime-200/30 cursor-pointer transition duration-200"
          >
            {isSaving ? "최종 전송 및 기록" : "생각 회복 완료"}
          </Button>
        )}
      </footer>

      {/* Congratulations / Success Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-white/60 bg-[#f8fafc] px-6 py-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-[#064e52] font-black text-xl tracking-tight uppercase border-b border-[#064e52]/5 pb-3">
              Recovery Accomplished
            </h2>
            
            <p className="mt-3 text-slate-500 font-bold text-xs leading-relaxed text-left bg-white/70 p-4.5 rounded-2xl border border-slate-150/40 my-4 shadow-inner">
              {isFractionConcept ? (
                <>
                  분수의 분모 등분 비교 법칙을 완벽히 자가 해결하셨군요! <br />
                  <strong>{studentName}</strong> 학생은 단위 분수를 확실하게 지각 극복하여 <strong>회복 에너지 {mission.energyReward} EP</strong>를 획득했습니다!
                </>
              ) : (
                <>
                  개념 오류 지점을 성공적으로 타파하셨습니다! <br />
                  <strong>{studentName}</strong> 학생은 이번 오답의 핵심 개념(<strong>{mission.concept}</strong>)을 정복하여 <strong>회복 에너지 {mission.energyReward} EP</strong>를 적립했습니다!
                </>
              )}
            </p>

            <div className="my-5 rounded-2xl bg-[#ccff00] border border-[#064e52]/10 py-5 px-4 shadow-sm animate-pulse">
              <span className="block text-4xl font-black text-[#064e52] leading-none tracking-tighter font-sans">
                +{mission.energyReward}
              </span>
              <span className="block text-[8px] font-black text-[#064e52] tracking-widest mt-2 uppercase">
                Recovery EP Accumulate
              </span>
            </div>

            <div className="flex flex-col gap-2 relative z-10">
              <button 
                onClick={() => router.push("/")}
                className="w-full min-h-12 bg-[#064e52] hover:bg-[#00363a] text-white font-black rounded-2xl text-xs shadow-md cursor-pointer transition duration-200"
              >
                대시보드로 복귀
              </button>
              <button 
                onClick={() => {
                  setStep1Answer("");
                  setStep2Answer("");
                  setStep3Answer("");
                  setCurrentStep(1);
                  setIsSuccessModalOpen(false);
                  reset(MISSION_SECONDS);
                }}
                className="w-full min-h-12 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-black rounded-2xl text-xs transition duration-200 cursor-pointer"
              >
                자가 훈련 재개
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
