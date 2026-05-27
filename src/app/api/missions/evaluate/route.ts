import { NextResponse } from "next/server";

import { evaluateStepAnswer } from "@/services/ai";
import { createServerSupabaseClient } from "@/services/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

interface EvaluateRequestBody {
  problemText?: unknown;
  stepTitle?: unknown;
  stepHint?: unknown;
  studentAnswer?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EvaluateRequestBody;
    const { problemText, stepTitle, stepHint, studentAnswer } = body;

    if (
      typeof stepTitle !== "string" ||
      typeof stepHint !== "string" ||
      typeof studentAnswer !== "string"
    ) {
      return NextResponse.json(
        { error: "필요한 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Auth Validation: Ensure valid session
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });

    const result = await evaluateStepAnswer(
      typeof problemText === "string" ? problemText : "수학 오답 문제",
      stepTitle,
      stepHint,
      studentAnswer
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "평가 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
