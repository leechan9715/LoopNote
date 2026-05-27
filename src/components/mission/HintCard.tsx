"use client";

import { Typography } from "@/components/common";

export interface MissionHint {
  encouragement: string;
  hint: string;
  id: string;
  title: string;
}

export interface HintCardProps {
  currentStep: number;
  hints: MissionHint[];
}

export function HintCard({ currentStep, hints }: HintCardProps) {
  const activeHint = hints[currentStep - 1] ?? hints[0];

  return (
    <section
      aria-labelledby="mission-hint-title"
      className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-amber-50 shadow-lg shadow-amber-100/70"
    >
      <div className="border-b-2 border-amber-100 bg-white/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <Typography
            as="h2"
            className="text-amber-950"
            id="mission-hint-title"
            variant="h2"
          >
            힌트 탐험
          </Typography>
          <span className="shrink-0 rounded-full border-2 border-amber-300 bg-amber-200 px-3 py-1 text-sm font-black text-amber-950">
            {currentStep} / {hints.length}
          </span>
        </div>

        <ol aria-label="힌트 단계" className="mt-4 grid grid-cols-3 gap-2">
          {hints.map((hint, index) => {
            const step = index + 1;
            const isActive = step === currentStep;
            const isComplete = step < currentStep;

            return (
              <li key={hint.id}>
                <div
                  aria-current={isActive ? "step" : undefined}
                  className={[
                    "flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-2 text-center transition duration-200",
                    isActive
                      ? "border-emerald-500 bg-emerald-100 text-emerald-950 shadow-md shadow-emerald-100"
                      : isComplete
                        ? "border-sky-300 bg-sky-100 text-sky-900"
                        : "border-slate-200 bg-white text-slate-500",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="text-lg font-black">{isComplete ? "✓" : step}</span>
                  <span className="text-xs font-extrabold">단계</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="px-5 py-6">
        <div
          aria-live="polite"
          className="rounded-3xl border-2 border-white bg-white px-5 py-5 shadow-sm"
        >
          <Typography as="p" className="text-emerald-700" variant="caption">
            {activeHint.encouragement}
          </Typography>
          <Typography as="h3" className="mt-2 text-slate-950" variant="h2">
            {activeHint.title}
          </Typography>
          <Typography as="p" className="mt-3 whitespace-pre-wrap break-words text-slate-700" variant="body">
            {activeHint.hint}
          </Typography>
        </div>
      </div>
    </section>
  );
}
