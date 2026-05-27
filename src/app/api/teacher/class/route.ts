import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/services/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();

    // 인증 확인
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "유효하지 않은 세션입니다." }, { status: 401 });

    // 선생님 역할 확인
    const { data: teacherProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, class_name")
      .eq("id", user.id)
      .single();

    if (profileError || !teacherProfile) {
      return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
    }

    if (teacherProfile.role !== "teacher") {
      return NextResponse.json({ error: "선생님 계정이 아닙니다." }, { status: 403 });
    }

    // 담당 학생 목록 조회 (questions, missions 포함)
    const { data: students, error: studentsError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        class_name,
        created_at,
        questions (
          id,
          raw_text,
          status,
          created_at,
          recovery_missions (
            id,
            is_completed,
            current_step,
            steps,
            created_at
          )
        )
      `)
      .eq("teacher_id", user.id)
      .eq("role", "student")
      .order("full_name", { ascending: true });

    if (studentsError) {
      throw studentsError;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // 학생별 통계 계산
    const enrichedStudents = (students ?? []).map((s: any) => {
      const questions: any[] = s.questions ?? [];
      const allMissions = questions.flatMap((q: any) => q.recovery_missions ?? []);

      const todayQuestions = questions.filter(
        (q: any) => new Date(q.created_at) >= todayStart
      );
      const completedMissions = allMissions.filter((m: any) => m.is_completed);
      const totalMissions = allMissions.length;
      const recoveryRate = totalMissions > 0
        ? Math.round((completedMissions.length / totalMissions) * 100)
        : 0;

      // 가장 최근 활동
      const sortedQuestions = [...questions].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestQuestion = sortedQuestions[0] ?? null;
      const latestMission = latestQuestion?.recovery_missions?.[0] ?? null;

      let recentAction = "대기 중";
      if (latestMission?.is_completed) recentAction = "미션 완료";
      else if (latestMission && latestMission.current_step > 0) recentAction = "미션 진행 중";
      else if (latestQuestion?.status === "recovering") recentAction = "오답 풀이 중";
      else if (latestQuestion) recentAction = "오답 등록됨";

      // 취약 개념 추출 (raw_text에서)
      const weakConcept = latestQuestion?.raw_text
        ? latestQuestion.raw_text.slice(0, 30) + (latestQuestion.raw_text.length > 30 ? "..." : "")
        : "등록된 오답 없음";

      // 자신감 계산
      let confidence: "상" | "중" | "하" = "중";
      if (recoveryRate >= 80) confidence = "상";
      else if (recoveryRate < 50) confidence = "하";

      // 마지막 활동 시각
      const lastActiveAt = latestQuestion?.created_at ?? s.created_at;
      const lastActiveMs = now.getTime() - new Date(lastActiveAt).getTime();
      const lastActiveDays = Math.floor(lastActiveMs / 86400000);
      let lastActiveLabel = "오늘";
      if (lastActiveDays === 1) lastActiveLabel = "어제";
      else if (lastActiveDays > 1) lastActiveLabel = `${lastActiveDays}일 전`;

      return {
        id: s.id,
        name: s.full_name,
        classGroup: s.class_name ?? "미지정 반",
        todayLoops: todayQuestions.length,
        recoveryRate,
        confidence,
        recentAction,
        weakConcept,
        coachingFeedback: `${s.full_name} 학생의 취약 개념: ${weakConcept}. 총 ${questions.length}개 오답 등록, ${completedMissions.length}개 미션 완료.`,
        completedMissions: completedMissions.length,
        totalQuestions: questions.length,
        lastActiveLabel,
      };
    });

    // 전체 통계
    const totalStudents = enrichedStudents.length;
    const avgRecoveryRate = totalStudents > 0
      ? Math.round(enrichedStudents.reduce((sum, s) => sum + s.recoveryRate, 0) / totalStudents)
      : 0;
    const lowConfidenceCount = enrichedStudents.filter(s => s.confidence === "하").length;
    const activeToday = enrichedStudents.filter(s => s.todayLoops > 0).length;

    // 오답 패턴 분석 (raw_text 기반 키워드 빈도)
    const allRawTexts: string[] = (students ?? []).flatMap((s: any) =>
      (s.questions ?? []).map((q: any) => q.raw_text ?? "")
    );
    const conceptCounts: Record<string, number> = {};
    const mathKeywords = [
      { label: "분수의 크기 비교", keywords: ["분수", "크기", "비교", "단위분수"] },
      { label: "분수의 덧셈과 뺄셈", keywords: ["분수", "덧셈", "뺄셈", "더하", "빼"] },
      { label: "대분수와 가분수", keywords: ["대분수", "가분수", "변환", "바꾸"] },
      { label: "자연수 나눗셈", keywords: ["나눗셈", "나누기", "몫", "나머지"] },
      { label: "곱셈과 나눗셈", keywords: ["곱셈", "곱하기", "나눗셈"] },
      { label: "삼각형과 도형", keywords: ["삼각형", "사각형", "각도", "도형", "내각"] },
      { label: "소수", keywords: ["소수", "0.", "소수점"] },
    ];
    allRawTexts.forEach(text => {
      if (!text) return;
      mathKeywords.forEach(({ label, keywords }) => {
        if (keywords.some(k => text.includes(k))) {
          conceptCounts[label] = (conceptCounts[label] ?? 0) + 1;
        }
      });
    });

    const topErrors = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], idx) => ({
        rank: idx + 1,
        name,
        students: count,
        desc: `${count}개 오답 문제에서 감지된 취약 패턴`,
      }));

    return NextResponse.json({
      teacher: {
        id: teacherProfile.id,
        name: teacherProfile.full_name,
        className: teacherProfile.class_name ?? "미지정",
      },
      stats: {
        totalStudents,
        avgRecoveryRate,
        lowConfidenceCount,
        activeToday,
      },
      students: enrichedStudents,
      topErrors: topErrors.length > 0 ? topErrors : [
        { rank: 1, name: "아직 오답 데이터 없음", students: 0, desc: "학생들이 오답을 등록하면 분석이 시작됩니다." }
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
