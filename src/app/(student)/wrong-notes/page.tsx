"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button, Input, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";
import { useStorage } from "@/hooks/useStorage";
import { createBrowserSupabaseClient } from "@/services/supabase";
import { CameraScanner, type CapturedCameraImage } from "@/components/mission/CameraScanner";

type Step = 1 | 2 | 3;
type Subject = "수학" | "국어" | "영어" | "과학" | "사회";
type Emotion = "헷갈림" | "어려움" | "실수함" | "스트레스";

const steps = [
  { num: 1, label: "문제 등록" },
  { num: 2, label: "생각 설명" },
  { num: 3, label: "감정 체크" },
];

const subjects: Subject[] = ["수학", "국어", "영어", "과학", "사회"];

const emotions: { type: Emotion; title: string; desc: string; iconPath: string }[] = [
  { 
    type: "헷갈림", 
    title: "헷갈림", 
    desc: "기본 개념이 조금 아리송했어요",
    iconPath: "M12 16h.01M12 8a3 3 0 0 0-3 3v1"
  },
  { 
    type: "어려움", 
    title: "어려움", 
    desc: "문제 풀이의 시작점 자체를 찾기 어려웠어요",
    iconPath: "M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z"
  },
  { 
    type: "실수함", 
    title: "실수함", 
    desc: "알고 있는 공식인데 순간의 착각으로 틀렸어요",
    iconPath: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
  },
  { 
    type: "스트레스", 
    title: "스트레스", 
    desc: "심리적으로 부담감을 많이 느끼는 오답이에요",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7Z"
  },
];

export default function RegisterWrongNoteForm() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const isDemoStudent = !isAuthenticated || (user && user.email === "student@loopnote.com");
  const { uploadImage, isUploading, error: storageError } = useStorage();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Form State
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedSubject, setSelectedSubject] = useState<Subject>("수학");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [customAnswer, setCustomAnswer] = useState("");
  const [metacognition, setMetacognition] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>("헷갈림");
  
  // UI Controls
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timeout);
  }, [toastMessage]);

  const handleCapture = ({ blob, dataUrl }: CapturedCameraImage) => {
    setCapturedBlob(blob);
    setCapturedDataUrl(dataUrl);
    setIsScannerOpen(false);
    setToastMessage("오답 이미지가 정상 스캔되었습니다.");
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedBlob(file);
        setCapturedDataUrl(event.target?.result as string);
        setToastMessage("파일 업로드 완료");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedBlob(file);
        setCapturedDataUrl(event.target?.result as string);
        setToastMessage("파일 업로드 완료");
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (isDemoStudent) {
      alert("체험용 계정에서는 오답 스캔 및 업로드 기능이 제한됩니다. 로그인 후 실제 오답을 스캔하고 학습 루프를 체험해 보세요!");
      return;
    }
    setIsSubmitting(true);
    try {
      let finalImageUrl = "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop"; // Default beautiful placeholder
      let questionId = crypto.randomUUID();

      if (isAuthenticated && user?.id) {
        // If we have a real captured image
        if (capturedBlob) {
          try {
            const uploadResult = await uploadImage({
              file: capturedBlob,
              studentId: user.id,
            });
            finalImageUrl = uploadResult.publicUrl;
          } catch (err) {
            console.error("Storage upload failed, fallback to mock URL:", err);
          }
        }

        // Insert into Questions Table
        const { data: newQuestion, error: insertError } = await supabase
          .from("questions")
          .insert({
            id: questionId,
            student_id: user.id,
            image_url: finalImageUrl,
            raw_text: `${selectedSubject} 오답 - 오답 이유: [내가 적은 답: ${selectedAnswer === 0 ? customAnswer : selectedAnswer + '번'}] ${metacognition || "개념 혼동"} | 감정: ${selectedEmotion}`,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError) {
          throw insertError;
        }

        if (newQuestion) {
          questionId = newQuestion.id;
        }

        // Trigger AI Generation (async)
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          void fetch("/api/missions/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ question_id: questionId }),
          });
        }
      }

      setToastMessage("생각오류 분석 개시! 곧 진단 보고서 페이지로 연결됩니다.");
      setTimeout(() => {
        router.push(`/wrong-notes/diagnose/${questionId}`);
      }, 1000);

    } catch (err) {
      console.error("Submission failed:", err);
      setToastMessage("등록 중 요류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!capturedDataUrl) {
        setToastMessage("⚠️ 오답 이미지를 먼저 등록해 주세요!");
        return;
      }
      if (selectedAnswer === null) {
        setToastMessage("⚠️ 내가 골랐던 선택 번호를 클릭해 주세요!");
        return;
      }
      if (selectedAnswer === 0 && !customAnswer.trim()) {
        setToastMessage("⚠️ 직접 적었던 주관식 답안을 입력해 주세요!");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!metacognition.trim()) {
        setToastMessage("⚠️ 왜 그렇게 풀었는지 메타인지 생각을 짧게 설명해 주세요!");
        return;
      }
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 flex flex-col gap-6 pb-16">
      
      {/* Progress Header */}
      <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] relative overflow-hidden transition-all duration-300 text-left">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#ccff00]/10 to-transparent rounded-bl-full pointer-events-none" />
        
        <Typography as="p" variant="caption" className="font-black text-[#064e52]/75 uppercase tracking-widest mb-1.5">
          New Wrong Answer Entry
        </Typography>
        <Typography as="h1" variant="h1" className="text-[#021e21] font-black text-xl md:text-2xl tracking-tight">
          오답 스캔 및 생각 진단
        </Typography>
        
        {/* Horizontal Progress Timeline */}
        <div className="flex items-center justify-between mt-8 relative px-2">
          <div className="absolute left-[12%] right-[12%] top-1/2 -translate-y-1/2 h-[2px] bg-slate-200/60 rounded-full -z-10" />
          <div 
            className="absolute left-[12%] top-1/2 -translate-y-1/2 h-[2px] bg-[#064e52] rounded-full transition-all duration-500 -z-10"
            style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "38%" : "76%" }}
          />

          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <button
                key={s.num}
                onClick={() => {
                  if (isCompleted || s.num === 1) setCurrentStep(s.num as Step);
                }}
                disabled={!isCompleted && s.num > currentStep}
                className="flex flex-col items-center gap-2 focus:outline-none transition group cursor-pointer"
              >
                <div 
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs border transition-all duration-300 ${
                    isActive 
                      ? "bg-[#064e52] text-white border-[#064e52] scale-110 shadow-sm" 
                      : isCompleted 
                        ? "bg-[#ccff00] text-[#064e52] border-[#064e52] shadow-sm" 
                        : "bg-white/80 text-slate-400 border-slate-200/50 backdrop-blur-sm hover:border-slate-350"
                  }`}
                >
                  {isCompleted ? "✓" : s.num}
                </div>
                <span className={`text-[9.5px] font-black tracking-widest uppercase transition-colors duration-300 ${isActive ? "text-[#064e52]" : "text-slate-400 group-hover:text-slate-500"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>
 
      {/* STEP 1: 문제 등록 */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          
          {/* Subject Selector */}
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-4">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 교과목 카테고리
            </Typography>
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-black transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? "bg-[#064e52] text-white border-[#064e52] shadow-sm" 
                        : "bg-white/60 text-slate-600 border-slate-200/80 hover:bg-white"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </section>
  
          {/* Dotted Upload Dropzone / AR Scan Aperture */}
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-4">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 오답 스캔 이미지
            </Typography>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border border-dashed rounded-[1.8rem] p-8 text-center flex flex-col items-center justify-center min-h-[240px] transition-all duration-300 relative overflow-hidden ${
                capturedDataUrl ? "border-[#064e52] bg-white/40" : "border-slate-250 bg-[#f8fafc]/55 hover:border-slate-350"
              }`}
            >
              {capturedDataUrl ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-md border-4 border-white">
                  <Image 
                    src={capturedDataUrl} 
                    alt="Captured Scan Preview" 
                    fill 
                    className="object-cover" 
                  />
                  {/* Glowing Laser Scanline overlay */}
                  <div className="absolute inset-x-0 h-0.5 bg-[#ccff00] shadow-[0_0_12px_#ccff00] top-0 animate-laser-scan" />
                  
                  <div className="absolute inset-0 bg-[#00282b]/70 opacity-0 hover:opacity-100 flex items-center justify-center transition-all duration-300">
                    <button 
                      onClick={() => setCapturedDataUrl(null)} 
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 py-2.5 text-[10px] font-black shadow-md cursor-pointer transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      삭제 후 재촬영
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-[#064e52]/5 text-[#064e52] border border-[#064e52]/10 flex items-center justify-center text-xl shadow-sm relative">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#064e52]">이곳으로 이미지를 가져와 스캔해 주세요</p>
                    <p className="text-[8.5px] text-slate-400 font-black mt-1.5 tracking-widest uppercase">JPG / PNG / GIF / Drag & Drop</p>
                  </div>
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-[#064e52] hover:bg-[#00363a] text-white text-xs font-black px-5 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      실시간 오답 스캔
                    </button>
                    <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 text-[#064e52] text-xs font-black px-5 py-3 rounded-2xl transition-all duration-200 flex items-center justify-center hover:scale-[1.01] active:scale-[0.99]">
                      <span>파일 불러오기</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="sr-only" 
                        onChange={handleFileInput} 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </section>
  
          {/* Multiple-choice button selectors */}
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-5">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 내가 선택했던 번호
            </Typography>
            <div className="flex justify-between gap-2 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = selectedAnswer === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedAnswer(num)}
                    className={`w-11 h-11 rounded-xl text-xs font-black border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      isSelected 
                        ? "bg-[#064e52] text-white border-[#064e52] scale-105 shadow-sm" 
                        : "bg-white/50 text-slate-650 border-slate-200/80 hover:bg-white"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            
            <div className="pt-3 border-t border-slate-100/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold tracking-tight">주관식이나 직접 입력하는 답안인가요?</span>
              <button 
                type="button" 
                onClick={() => setSelectedAnswer(0)}
                className={`text-[9.5px] font-black transition-colors cursor-pointer ${selectedAnswer === 0 ? "text-[#064e52] underline decoration-2" : "text-slate-500 hover:text-[#064e52]"}`}
              >
                직접 답안 입력
              </button>
            </div>
  
            {selectedAnswer === 0 && (
              <div className="pt-4 border-t border-dashed border-slate-200/80 animate-in fade-in duration-300">
                <Input
                  label="직접 적은 답안"
                  placeholder="작성했던 답안을 정확히 적어주세요"
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 focus:border-[#064e52]"
                />
              </div>
            )}
          </section>
        </div>
      )}
 
      {/* STEP 2: 생각 설명 */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-4">
            <div className="space-y-1.5">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 메타인지 생각 설명
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-relaxed text-[10.5px]">
                답을 선택할 당시의 생각 오류를 있는 그대로 적어주세요. 많이 채워주실수록 AI 발문 힌트의 정확도가 극대화됩니다.
              </Typography>
            </div>
  
            <div className="relative">
              <textarea
                rows={7}
                value={metacognition}
                onChange={(e) => setMetacognition(e.target.value)}
                placeholder="예: 분모가 더 큰 쪽이 나누는 조각이 작아져 실제 비율이 작아진다는 것을 헷갈리고 단순 수의 크기로 비교했습니다."
                className="w-full rounded-[1.5rem] border border-slate-200 p-5 text-[11px] font-bold focus:border-[#064e52] outline-none transition bg-white/40 resize-none leading-relaxed"
              />
              <span className="absolute bottom-4 right-4 text-[9px] font-bold text-slate-400">
                {metacognition.length}자 입력됨
              </span>
            </div>
          </section>
        </div>
      )}
  
      {/* STEP 3: 감정 체크 */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300 text-left">
          <section className="glass-card rounded-[2rem] border border-white/60 p-6 md:p-8 shadow-[0_20px_50px_rgba(6,78,82,0.03)] space-y-5">
            <div className="space-y-1.5">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-xs uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" /> 학습 시점의 마음 상태
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-400 font-bold leading-relaxed text-[10.5px]">
                이 오답을 직면했을 때 내면의 진짜 마음 상태에 가장 근접한 옵션을 고르세요.
              </Typography>
            </div>
  
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {emotions.map((emo) => {
                const isSelected = selectedEmotion === emo.type;
                return (
                  <button
                    key={emo.type}
                    type="button"
                    onClick={() => setSelectedEmotion(emo.type)}
                    className={`p-5 rounded-[1.5rem] border-2 text-left transition duration-200 flex items-start gap-4 hover:scale-[1.01] cursor-pointer ${
                      isSelected 
                        ? "border-[#064e52] bg-white shadow-sm" 
                        : "border-slate-100/60 bg-[#f8fafc]/30 hover:border-slate-200"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-[#064e52]/5 text-[#064e52] shrink-0">
                      <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={emo.iconPath} />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-black text-[#021e21]">{emo.title}</span>
                      <span className="block text-[9.5px] text-slate-400 font-bold leading-relaxed">{emo.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
  
      {/* Footer Navigation Action Bar */}
      <footer className="flex justify-between gap-3.5 items-center pt-2">
        {currentStep > 1 ? (
          <Button 
            onClick={prevStep}
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white text-slate-600 font-black px-6 shadow-sm hover:bg-slate-50 transition active:scale-95 text-xs min-h-[48px] cursor-pointer"
          >
            이전 단계
          </Button>
        ) : (
          <Button 
            onClick={() => router.push("/")}
            variant="outline"
            className="rounded-2xl border-slate-200 bg-white text-slate-600 font-black px-6 shadow-sm hover:bg-slate-50 transition active:scale-95 text-xs min-h-[48px] cursor-pointer"
          >
            대시보드
          </Button>
        )}
  
        {currentStep < 3 ? (
          <Button 
            onClick={nextStep}
            className="rounded-2xl bg-[#064e52] hover:bg-[#00363a] text-white font-black px-6 flex-1 min-h-[48px] text-xs shadow-sm cursor-pointer"
          >
            다음 단계로
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="rounded-2xl bg-[#ccff00] hover:bg-[#e1ff66] text-[#064e52] font-black px-6 flex-1 min-h-[48px] text-xs shadow-md shadow-lime-200/30 cursor-pointer"
          >
            AI 생각진단 분석 요청 ➔
          </Button>
        )}
      </footer>
  
      {/* Scanner Overlay Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md">
            <CameraScanner
              onCapture={handleCapture}
              onClose={() => setIsScannerOpen(false)}
            />
          </div>
        </div>
      )}
  
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed left-1/2 bottom-24 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-2xl bg-[#021e21]/95 text-white px-5 py-4 text-center text-xs font-black shadow-2xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
