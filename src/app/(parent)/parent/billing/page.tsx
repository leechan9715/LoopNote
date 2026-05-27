"use client";

import { useState } from "react";

import { Button, Typography } from "@/components/common";
import { useAuth } from "@/hooks/useAuth";

const planBenefits = [
  "하루 미션 제한 확장",
  "주간 회복 리포트 상세 분석",
  "자녀별 취약 개념 알림",
  "향후 OCR 보관 기간 확장",
];

export default function ParentBillingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm lg:px-7">
        <Typography as="p" className="font-black text-indigo-700" variant="caption">
          Billing
        </Typography>
        <Typography as="h1" className="mt-2 text-slate-950" variant="h1">
          구독 관리
        </Typography>
        <Typography as="p" className="mt-3 max-w-2xl text-slate-600" variant="body">
          현재 플랜과 프리미엄 혜택을 확인합니다.
        </Typography>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-6 shadow-sm">
          <Typography as="p" className="font-black text-emerald-700" variant="caption">
            현재 구독 상태
          </Typography>
          <p className="mt-4 text-4xl font-black leading-tight tracking-normal text-emerald-950">
            무료 플랜
          </p>
          <Typography as="p" className="mt-3 text-emerald-900" variant="body">
            무료 사용자는 일 3회 미션을 사용할 수 있습니다.
          </Typography>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <Typography as="h2" className="text-slate-950" variant="h2">
            프리미엄 플랜
          </Typography>
          <Typography as="p" className="mt-2 text-slate-600" variant="body">
            자녀의 회복 흐름을 더 넓게 보고 싶은 학부모를 위한 플랜입니다.
          </Typography>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {planBenefits.map((benefit) => (
              <li
                className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-extrabold text-indigo-900"
                key={benefit}
              >
                {benefit}
              </li>
            ))}
          </ul>
          <Button
            className="mt-6"
            disabled={!isAuthenticated || isLoading}
            onClick={() => {
              setNotice("결제 연동은 다음 단계에서 Stripe Checkout으로 연결됩니다.");
            }}
          >
            구독하기
          </Button>
          {notice ? (
            <Typography as="p" className="mt-3 font-bold text-slate-600" variant="caption">
              {notice}
            </Typography>
          ) : null}
        </section>
      </div>
    </div>
  );
}
