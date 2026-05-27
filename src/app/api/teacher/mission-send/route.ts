import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase";
import { generateMission } from "@/services/ai";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";

// 선생님이 학생에게 미션 처방 (기존 pending 오답을 recovering으로 전환 + 코칭 메시지 기록 및 미션 생성 보장)
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });

    // 선생님 역할 확인
    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (teacherProfile?.role !== "teacher") {
      return NextResponse.json({ error: "선생님 계정이 아닙니다." }, { status: 403 });
    }

    const body = await request.json() as { studentId?: unknown; message?: unknown };
    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : null;

    if (!studentId) {
      return NextResponse.json({ error: "studentId가 필요합니다." }, { status: 400 });
    }

    // 담당 학생인지 확인
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("id, full_name, teacher_id")
      .eq("id", studentId)
      .eq("teacher_id", user.id)
      .single();

    if (!studentProfile) {
      return NextResponse.json({ error: "담당 학생이 아닙니다." }, { status: 403 });
    }

    // 학생의 pending 오답 중 가장 최신 것 조회 (미션 존재 여부 확인용)
    const { data: pendingQuestion } = await supabase
      .from("questions")
      .select("id, image_url, recovery_missions(id)")
      .eq("student_id", studentId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { id: string; image_url: string; recovery_missions: { id: string }[] } | null };

    let updatedCount = 0;
    if (pendingQuestion) {
      const hasMission = pendingQuestion.recovery_missions && pendingQuestion.recovery_missions.length > 0;

      if (!hasMission) {
        // AI 미션이 존재하지 않으면 생성 후 삽입
        try {
          const mission = await generateMission(pendingQuestion.image_url);

          const { error: missionError } = await supabase
            .from("recovery_missions")
            .insert({
              current_step: 0,
              is_completed: false,
              question_id: pendingQuestion.id,
              steps: mission.steps as unknown as Json,
            });

          if (missionError) throw missionError;

          // questions 상태 변경 및 추출된 문제 텍스트 반영
          await supabase
            .from("questions")
            .update({ 
              status: "recovering",
              raw_text: mission.problemText
            })
            .eq("id", pendingQuestion.id);

        } catch (aiErr: any) {
          console.error("AI mission generation failed in teacher prescribe:", aiErr);
          
          // AI 생성 실패 시 안전 장치로 기본 3단계 힌트 미션 제공
          const fallbackSteps = [
            {
              order: 1,
              title: "1단계: 문제의 조건 파악하기 🔍",
              hint: "문제를 소리 내어 한 글자씩 읽어보세요. 이 문제에서 구하고자 하는 최종 값은 무엇인가요?",
              studentAction: "구해야 하는 정답이 무엇인지 입력창에 한 줄로 적어보기",
              encouragement: "스스로 풀 수 있는 첫걸음입니다. 힘내세요! 🌱"
            },
            {
              order: 2,
              title: "2단계: 배운 개념 기억하기 💡",
              hint: "이 문제와 관련해서 학교나 학원에서 배운 개념은 무엇인가요? 문제를 해결하기 위한 식을 세워보세요.",
              studentAction: "문제를 풀기 위한 연산 기호나 공식을 적어보기",
              encouragement: "중간 풀이도 훌륭한 성공 경험입니다! 🌟"
            },
            {
              order: 3,
              title: "3단계: 스스로 풀이 완성하기 ➕",
              hint: "식과 조건들을 바탕으로 빈 도화지에 적어서 계산해 보세요. 스스로 찾은 정답은 무엇인가요?",
              studentAction: "자신이 도출해낸 결과를 입력창에 적어보기",
              encouragement: "마지막 단계입니다. 끝까지 잘 풀어냈어요! 💪"
            }
          ];

          await supabase
            .from("recovery_missions")
            .insert({
              current_step: 0,
              is_completed: false,
              question_id: pendingQuestion.id,
              steps: fallbackSteps as unknown as Json,
            });

          await supabase
            .from("questions")
            .update({ status: "recovering" })
            .eq("id", pendingQuestion.id);
        }
      } else {
        // 이미 미션이 있다면 단순 상태만 전환
        await supabase
          .from("questions")
          .update({ status: "recovering" })
          .eq("id", pendingQuestion.id);
      }
      updatedCount = 1;
    }

    return NextResponse.json({
      success: true,
      studentName: studentProfile.full_name,
      updatedQuestions: updatedCount,
      message: `${studentProfile.full_name} 학생에게 미션이 활성화되었습니다.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
