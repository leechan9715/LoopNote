import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase";

export const runtime = "nodejs";

interface ProgressRequestBody {
  missionId?: unknown;
  questionId?: unknown;
  step?: unknown;
  isCompleted?: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProgressRequestBody;
    const { missionId, questionId, step, isCompleted } = body;

    if (typeof missionId !== "string") {
      return NextResponse.json(
        { error: "미션 ID가 누락되었습니다." },
        { status: 400 }
      );
    }

    const stepNum = typeof step === "number" ? step : 0;
    const completed = typeof isCompleted === "boolean" ? isCompleted : false;

    const supabase = createServerSupabaseClient();
    
    // Auth Validation: session verification
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    
    if (!token) {
      // Offline / Guest Mode bypass
      return NextResponse.json({ success: true, guest: true });
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });
    }

    // 1. Update Recovery Mission step and completed status
    const { error: missionError } = await supabase
      .from("recovery_missions")
      .update({
        current_step: stepNum,
        is_completed: completed,
      })
      .eq("id", missionId);

    if (missionError) throw missionError;

    // 2. If fully completed, update associated Question status to 'resolved'
    if (completed && typeof questionId === "string") {
      const { error: questionError } = await supabase
        .from("questions")
        .update({
          status: "resolved",
        })
        .eq("id", questionId);

      if (questionError) throw questionError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mission progress API error:", error);
    return NextResponse.json(
      { error: error?.message || "미션 상태 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
