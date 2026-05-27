import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase";

export const runtime = "nodejs";

// 선생님이 학생에게 미션 처방 (기존 pending 오답을 recovering으로 전환 + 코칭 메시지 기록)
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

    // 학생의 pending 오답 중 가장 최신 것을 recovering 으로 전환
    const { data: pendingQuestion } = await supabase
      .from("questions")
      .select("id")
      .eq("student_id", studentId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let updatedCount = 0;
    if (pendingQuestion) {
      await supabase
        .from("questions")
        .update({ status: "recovering" })
        .eq("id", pendingQuestion.id);
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
