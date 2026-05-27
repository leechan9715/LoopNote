"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { Button, Input, Typography } from "@/components/common";

export interface AnswerInputSubmitPayload {
  answer: string;
}

export interface AnswerInputProps {
  currentStep: number;
  isFinalStep: boolean;
  onSubmit: (payload: AnswerInputSubmitPayload) => void;
}

export function AnswerInput({
  currentStep,
  isFinalStep,
  onSubmit,
}: AnswerInputProps) {
  const animationTimeoutRef = useRef<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [isCelebrating, setIsCelebrating] = useState(false);
  const trimmedAnswer = answer.trim();

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trimmedAnswer.length === 0) {
      return;
    }

    onSubmit({ answer: trimmedAnswer });
    setAnswer("");
    setIsCelebrating(true);

    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
    }

    animationTimeoutRef.current = window.setTimeout(() => {
      setIsCelebrating(false);
      animationTimeoutRef.current = null;
    }, 900);
  };

  return (
    <form
      className={[
        "rounded-3xl border-2 bg-white px-5 py-5 shadow-lg transition duration-200",
        isCelebrating
          ? "border-emerald-300 shadow-emerald-100 motion-safe:scale-[1.01]"
          : "border-sky-100 shadow-sky-100",
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={handleSubmit}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Typography as="h2" className="text-slate-950" variant="h2">
            내 풀이 쓰기
          </Typography>
          <Typography as="p" className="mt-1 text-slate-600" variant="caption">
            {currentStep}단계 생각을 한 문장으로 적어보세요.
          </Typography>
        </div>
        {isCelebrating ? (
          <span
            aria-live="polite"
            className="rounded-full border-2 border-emerald-200 bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-800"
          >
            좋아요!
          </span>
        ) : null}
      </div>

      <Input
        autoComplete="off"
        helperText="정답이 아니어도 괜찮아요. 떠오른 방법을 적으면 다음 힌트가 열려요."
        label="풀이 과정"
        name="mission-answer"
        onChange={(event) => {
          setAnswer(event.target.value);
        }}
        placeholder="예: 먼저 전체 개수를 식으로 바꿔볼게요"
        value={answer}
      />

      <Button
        className="mt-4"
        disabled={trimmedAnswer.length === 0}
        fullWidth
        size="lg"
        type="submit"
        variant={isFinalStep ? "secondary" : "primary"}
      >
        {isFinalStep ? "미션 완료하기" : "다음 힌트 열기"}
      </Button>
    </form>
  );
}
