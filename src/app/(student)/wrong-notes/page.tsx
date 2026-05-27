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
type Emotion = "헷갈렸어요 😕" | "너무 어려웠어요 😫" | "실수했어요 😅" | "포기하고 싶었어요 😭";

const steps = [
  { num: 1, label: "문제 등록" },
  { num: 2, label: "생각 설명" },
  { num: 3, label: "감정 체크" },
];

const subjects: Subject[] = ["수학", "국어", "영어", "과학", "사회"];

const emotions: { type: Emotion; emoji: string; title: string; desc: string; bg: string; border: string; text: string }[] = [
  { type: "헷갈렸어요 😕", emoji: "😕", title: "헷갈렸어요", desc: "개념이 조금 아리송했어요", bg: "bg-blue-50/50 hover:bg-blue-50", border: "border-blue-100 checked:border-blue-500", text: "text-blue-700" },
  { type: "너무 어려웠어요 😫", emoji: "😫", title: "너무 어려웠어요", desc: "손도 대기 힘들 만큼 막막했어요", bg: "bg-purple-50/50 hover:bg-purple-50", border: "border-purple-100 checked:border-purple-500", text: "text-purple-700" },
  { type: "실수했어요 😅", emoji: "😅", title: "실수했어요", desc: "다 아는 건데 아쉽게 틀렸어요", bg: "bg-amber-50/50 hover:bg-amber-50", border: "border-amber-100 checked:border-amber-500", text: "text-amber-700" },
  { type: "포기하고 싶었어요 😭", emoji: "😭", title: "포기하고 싶었어요", desc: "스트레스를 많이 받았어요", bg: "bg-rose-50/50 hover:bg-rose-50", border: "border-rose-100 checked:border-rose-500", text: "text-rose-700" },
];

const defaultProblemText = "분수 1/3과 1/5 중 어느 것이 더 큰지 비교하고, 그 이유를 피자 그림을 사용하여 설명해 보세요.";

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
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>("헷갈렸어요 😕");
  
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
    setToastMessage("문제가 성공적으로 스캔되었습니다!📸");
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedBlob(file);
        setCapturedDataUrl(event.target?.result as string);
        setToastMessage("파일 업로드 완료!📸");
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
        setToastMessage("파일 업로드 완료!📸");
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (isDemoStudent) {
      alert("체험용 계정에서는 오답 스캔 및 업로드 기능이 제한됩니다. 로그인 후 나의 실제 오답을 스캔해 보세요! 📸");
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

        // Trigger AI Generation (async, but let's call it and redirect)
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

      setToastMessage("오답 등록 및 진단 완료! 곧 진단 페이지로 이동합니다.");
      setTimeout(() => {
        router.push(`/wrong-notes/diagnose/${questionId}`);
      }, 1000);

    } catch (err) {
      console.error("Submission failed:", err);
      setToastMessage("등록 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!capturedDataUrl) {
        setToastMessage("⚠️ 오답 사진을 먼저 등록해 주세요!");
        return;
      }
      if (selectedAnswer === null) {
        setToastMessage("⚠️ 내가 선택한 번호나 답안을 체크해 주세요!");
        return;
      }
      if (selectedAnswer === 0 && !customAnswer.trim()) {
        setToastMessage("⚠️ 직접 적은 답안을 입력해 주세요!");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!metacognition.trim()) {
        setToastMessage("⚠️ 왜 그렇게 생각했는지 이유를 적어주세요!");
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
    <div className="max-w-xl mx-auto py-2 flex flex-col gap-6">
      
      {/* Dynamic Progress Header */}
      <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm">
        <Typography as="p" variant="caption" className="font-extrabold text-[#0d6e73] uppercase tracking-wider mb-2">
          신규 오답 등록
        </Typography>
        <Typography as="h1" variant="h1" className="text-slate-900 font-black text-xl md:text-2xl">
          오답 스캔 & 막힘 진단 📝
        </Typography>
        
        {/* Horizontal Progress Timeline */}
        <div className="flex items-center justify-between mt-6 relative">
          <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-10" />
          <div 
            className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1 bg-[#064e52] transition-all duration-300 -z-10"
            style={{ width: currentStep === 1 ? "0%" : currentStep === 2 ? "40%" : "80%" }}
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
                className="flex flex-col items-center gap-1.5 focus:outline-none"
              >
                <div 
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm border transition duration-300 ${
                    isActive 
                      ? "bg-[#064e52] text-white border-[#064e52]" 
                      : isCompleted 
                        ? "bg-[#b5e61d] text-[#064e52] border-[#b5e61d]" 
                        : "bg-white text-slate-400 border-slate-100"
                  }`}
                >
                  {isCompleted ? "✓" : s.num}
                </div>
                <span className={`text-[10px] font-black tracking-tight ${isActive ? "text-[#064e52]" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* STEP 1: 문제 등록 */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Subject Selector */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-3">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
              교과목 선택
            </Typography>
            <div className="flex flex-wrap gap-2">
              {subjects.map((sub) => {
                const isSelected = selectedSubject === sub;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition duration-200 ${
                      isSelected 
                        ? "bg-[#b5e61d] text-[#064e52] border-[#b5e61d] shadow-sm" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Dotted Upload Dropzone */}
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
              오답 문제 사진 업로드
            </Typography>
            
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-3 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center min-h-[220px] transition duration-200 ${
                capturedDataUrl ? "border-[#b5e61d] bg-[#b5e61d]/5" : "border-slate-200 hover:border-[#064e52]/30 bg-slate-50/50"
              }`}
            >
              {capturedDataUrl ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-md border-2 border-white">
                  <Image 
                    src={capturedDataUrl} 
                    alt="Captured Scan Preview" 
                    fill 
                    className="object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition duration-200">
                    <button 
                      onClick={() => setCapturedDataUrl(null)} 
                      className="bg-rose-600 text-white rounded-full px-4 py-2 text-xs font-black"
                    >
                      삭제 후 다시 찍기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-100 text-slate-400">
                    📸
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">문제 사진을 드래그해서 올려주세요</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">파일 형식: JPG, PNG, GIF</p>
                  </div>
                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-[#064e52] hover:bg-[#0d6e73] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-sm transition"
                    >
                      카메라로 스캔하기
                    </button>
                    <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center justify-center">
                      <span>파일 올리기</span>
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
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
              내가 고른 답안 번호
            </Typography>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = selectedAnswer === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedAnswer(num)}
                    className={`w-11 h-11 rounded-full text-sm font-black border transition duration-200 flex items-center justify-center ${
                      isSelected 
                        ? "bg-[#064e52] text-white border-[#064e52] scale-110 shadow-md shadow-[#064e52]/15" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            
            {/* Custom answer typing option */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold">주관식이나 서술형인 경우:</span>
              <button 
                type="button" 
                onClick={() => setSelectedAnswer(0)} // 0 means custom/written
                className={`text-[10px] font-black transition ${selectedAnswer === 0 ? "text-[#0d6e73] underline" : "text-slate-500"}`}
              >
                직접 답안 적기
              </button>
            </div>

            {selectedAnswer === 0 && (
              <div className="pt-3 border-t border-dashed border-slate-150 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input
                  label="내가 직접 적은 정답 입력"
                  placeholder="내가 작성한 정답을 입력해 주세요 (예: 5/8, 12cm 등)"
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800"
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* STEP 2: 생각 설명 */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                메타인지 생각 설명 🧠
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-500 font-bold leading-relaxed">
                정답을 골랐을 때 어떤 생각이었나요? 풀이 과정이나 고민을 자세히 적을수록 AI 선생님이 더 정교한 생각 회복 힌트를 제작해 줍니다.
              </Typography>
            </div>

            <textarea
              rows={6}
              value={metacognition}
              onChange={(e) => setMetacognition(e.target.value)}
              placeholder="예: '피자 1/3은 피자 3개 크기인 줄 알고 1/5보다 더 크다고 생각했는데, 막상 피자를 그려보니까 헷갈려요... 어떻게 풀어야 할지 잘 모르겠어요.'"
              className="w-full rounded-2xl border border-slate-200 p-4 text-xs font-semibold focus:border-[#064e52] focus:ring-1 focus:ring-[#064e52] outline-none transition resize-none leading-relaxed bg-[#f8fafc]"
            />
          </section>
        </div>
      )}

      {/* STEP 3: 감정 체크 */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <section className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <Typography as="h2" variant="h2" className="text-[#064e52] font-black text-sm">
                풀 때의 감정 체크 💭
              </Typography>
              <Typography as="p" variant="caption" className="text-slate-500 font-bold leading-relaxed">
                이 오답 문제를 마주했을 때의 기분이 어땠나요? 마음까지 보듬어 회복할 수 있는 코칭 카드가 제공됩니다.
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
                    className={`p-4 rounded-2xl border-2 text-left transition duration-200 flex items-start gap-3.5 ${emo.bg} ${
                      isSelected 
                        ? "border-[#064e52] bg-white ring-1 ring-[#064e52] shadow-sm" 
                        : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <span className="text-3xl">{emo.emoji}</span>
                    <div className="space-y-0.5">
                      <span className="block text-xs font-black text-slate-800">{emo.title}</span>
                      <span className="block text-[10px] text-slate-400 font-bold leading-relaxed">{emo.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Footer Navigation Action Bar */}
      <footer className="flex justify-between gap-3 items-center pt-2">
        {currentStep > 1 ? (
          <Button 
            onClick={prevStep}
            variant="outline"
            className="rounded-2xl border-slate-200 text-slate-600 font-black px-6 shadow-none"
          >
            ← 이전 단계
          </Button>
        ) : (
          <Button 
            onClick={() => router.push("/")}
            variant="outline"
            className="rounded-2xl border-slate-200 text-slate-600 font-black px-6 shadow-none"
          >
            목록으로
          </Button>
        )}

        {currentStep < 3 ? (
          <Button 
            onClick={nextStep}
            className="rounded-2xl bg-[#064e52] hover:bg-[#0d6e73] text-white font-black px-6 flex-1 min-h-12"
          >
            다음 단계로 →
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="rounded-2xl bg-[#b5e61d] hover:bg-[#a1cf15] text-[#064e52] font-black px-6 flex-1 min-h-12 shadow-sm border border-[#b5e61d]"
          >
            진단 시작하기 🚀
          </Button>
        )}
      </footer>

      {/* Scanner Overlay Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
        <div className="fixed left-1/2 bottom-20 z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm">
          <div className="rounded-2xl bg-slate-950/90 text-white px-4 py-3.5 text-center text-xs font-black shadow-2xl border border-slate-800/50 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
