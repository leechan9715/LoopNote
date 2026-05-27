import { NextResponse } from "next/server";

import { generateMission } from "@/services/ai";
import { createServerSupabaseClient } from "@/services/supabase";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";
export const maxDuration = 45;

interface GenerateMissionRequestBody {
  question_id?: unknown;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "미션 생성 중 문제가 생겼습니다.";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateMissionRequestBody;
    const questionId = body.question_id;

    if (typeof questionId !== "string" || questionId.trim().length === 0) {
      return NextResponse.json(
        { error: "question_id가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Auth Validation: Ensure requester owns the question
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });

    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id, image_url, student_id")
      .eq("id", questionId)
      .eq("student_id", user.id) // Strict ownership check
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: "오답 문제를 찾지 못했습니다." },
        { status: 404 }
      );
    }

    const mission = await generateMission(question.image_url);

    const { data: recoveryMission, error: missionError } = await supabase
      .from("recovery_missions")
      .insert({
        current_step: 0,
        is_completed: false,
        question_id: question.id,
        steps: mission.steps as unknown as Json,
      })
      .select("id, question_id, steps, current_step, is_completed, created_at")
      .single();

    if (missionError || !recoveryMission) {
      throw missionError ?? new Error("회복 미션을 저장하지 못했습니다.");
    }

    const { error: updateError } = await supabase
      .from("questions")
      .update({
        raw_text: mission.problemText,
        status: "recovering",
      })
      .eq("id", question.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      mission: recoveryMission,
      analysis: {
        concept: mission.concept,
        difficulty: mission.difficulty,
        problemText: mission.problemText,
        subject: mission.subject,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
