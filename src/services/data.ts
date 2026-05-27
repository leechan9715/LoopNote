import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/supabase";

const ENERGY_PER_COMPLETED_MISSION = 12;
const RECENT_QUESTION_LIMIT = 5;
const STUDENT_LIST_LIMIT = 20;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const TREND_HEIGHT_CLASS_NAMES = [
  "h-4",
  "h-8",
  "h-12",
  "h-16",
  "h-20",
  "h-24",
  "h-28",
] as const;

type TypedSupabaseClient = SupabaseClient<Database>;

type QuestionRow = Database["public"]["Tables"]["questions"]["Row"];
type RecoveryMissionRow = Database["public"]["Tables"]["recovery_missions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type QuestionWithMission = QuestionRow & {
  recovery_missions: Pick<
    RecoveryMissionRow,
    "current_step" | "id" | "is_completed" | "steps"
  >[];
};

export interface StudentSummary {
  todayCompletedMissions: number;
  totalEnergy: number;
}

export interface RecentQuestion {
  concept: string;
  createdAt: string;
  id: string;
  missionId: string | null;
  status: QuestionRow["status"];
  title: string;
}

export interface StudentQuestionListItem {
  concept: string;
  createdAt: string;
  createdLabel: string;
  id: string;
  imageUrl: string;
  missionId: string | null;
  status: QuestionRow["status"];
  statusLabel: string;
  title: string;
}

export interface StudentMissionListItem {
  concept: string;
  currentStep: number;
  id: string;
  isCompleted: boolean;
  progressPercent: number;
  questionId: string;
  status: "recovering" | "resolved";
  statusLabel: string;
  title: string;
  totalSteps: number;
}

export interface ParentTrendDay {
  completed: number;
  day: string;
  heightClassName: string;
}

export interface ParentRecentActivity {
  concept: string;
  date: string;
  result: string;
  title: string;
}

export interface ParentChildReport {
  childId: string;
  childName: string;
  difficultConcept: string;
  grade: string;
  recentActivities: ParentRecentActivity[];
  totalEnergy: number;
  weeklyMissions: number;
  weeklyTrend: ParentTrendDay[];
}

export interface ParentChildProfile {
  createdAt: string;
  id: string;
  name: string;
}

export interface UserProfile {
  createdAt: string;
  fullName: string;
  id: string;
  parentId: string | null;
  role: ProfileRow["role"];
}

export interface AddChildProfileInput {
  accessToken: string;
  email: string;
  fullName: string;
  parentId: string;
  password: string;
}

export interface MissionHintData {
  encouragement: string;
  hint: string;
  id: string;
  title: string;
}

export interface MissionDetail {
  concept: string;
  energyReward: number;
  hints: MissionHintData[];
  id: string;
  prompt: string;
  title: string;
  currentStep: number;
  isCompleted: boolean;
  questionId: string;
}

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

function startOfWeekWindow() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 6);

  return date;
}

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Json | undefined) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeMissionSteps(steps: Json): MissionHintData[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step, index) => {
      if (!isRecord(step)) {
        return null;
      }

      const title = readString(step.title) ?? `${index + 1}단계 힌트`;
      const hint = readString(step.hint) ?? "저장된 힌트를 불러오지 못했어요.";
      const encouragement =
        readString(step.encouragement) ?? "천천히 다시 생각해볼 수 있어요.";

      return {
        encouragement,
        hint,
        id: `${index + 1}-${title}`,
        title,
      };
    })
    .filter((step): step is MissionHintData => step !== null);
}

function getPrimaryMission(question: QuestionWithMission) {
  return question.recovery_missions[0] ?? null;
}

function getQuestionTitle(question: Pick<QuestionRow, "raw_text" | "id">) {
  const rawText = question.raw_text?.trim();

  if (!rawText) {
    return "촬영한 오답 문제";
  }

  return rawText.length > 42 ? `${rawText.slice(0, 42)}...` : rawText;
}

function getQuestionConcept(question: QuestionWithMission) {
  const mission = getPrimaryMission(question);
  const steps = mission ? normalizeMissionSteps(mission.steps) : [];

  return steps[0]?.title ?? getQuestionTitle(question);
}

function getMissionResult(mission: Pick<RecoveryMissionRow, "current_step" | "is_completed"> | null) {
  if (!mission) {
    return "미션 생성 대기";
  }

  if (mission.is_completed) {
    return "미션 완료";
  }

  return `${Math.max(0, mission.current_step)}단계 진행 중`;
}

function getQuestionStatusLabel(status: QuestionRow["status"]) {
  if (status === "pending") {
    return "분석 대기";
  }

  if (status === "recovering") {
    return "회복 중";
  }

  return "회복 완료";
}

function getMissionProgress(mission: Pick<RecoveryMissionRow, "current_step" | "is_completed" | "steps">) {
  const stepCount = normalizeMissionSteps(mission.steps).length;
  const totalSteps = Math.max(1, stepCount, mission.current_step);
  const currentStep = mission.is_completed
    ? totalSteps
    : Math.min(Math.max(0, mission.current_step), totalSteps);

  return {
    currentStep,
    progressPercent: Math.round((currentStep / totalSteps) * 100),
    totalSteps,
  };
}

function getRelativeDateLabel(dateIso: string) {
  const createdAt = new Date(dateIso);
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfCreatedAt = new Date(createdAt);
  startOfCreatedAt.setHours(0, 0, 0, 0);

  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfCreatedAt.getTime()) / 86_400_000
  );

  if (dayDiff === 0) {
    return `오늘 ${createdAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (dayDiff === 1) {
    return `어제 ${createdAt.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return createdAt.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function buildWeeklyTrend(questions: QuestionWithMission[]) {
  const startDate = startOfWeekWindow();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      completed: 0,
      date,
      day: WEEKDAY_LABELS[date.getDay()],
    };
  });

  questions.forEach((question) => {
    const mission = getPrimaryMission(question);

    if (!mission?.is_completed) {
      return;
    }

    const createdAt = new Date(question.created_at);
    const bucket = buckets.find(
      (item) => item.date.toDateString() === createdAt.toDateString()
    );

    if (bucket) {
      bucket.completed += 1;
    }
  });

  const maxCompleted = Math.max(1, ...buckets.map((bucket) => bucket.completed));

  return buckets.map(({ completed, day }) => {
    const heightStep = Math.max(1, Math.ceil((completed / maxCompleted) * 7));

    return {
      completed,
      day,
      heightClassName: TREND_HEIGHT_CLASS_NAMES[heightStep - 1] ?? "h-4",
    };
  });
}

function findDifficultConcept(questions: QuestionWithMission[]) {
  const counts = new Map<string, number>();

  questions.forEach((question) => {
    const concept = getQuestionConcept(question);
    const current = counts.get(concept) ?? 0;
    counts.set(concept, current + 1);
  });

  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "아직 없음"
  );
}

function mapRecentQuestions(questions: QuestionWithMission[]): RecentQuestion[] {
  return questions.slice(0, RECENT_QUESTION_LIMIT).map((question) => {
    const mission = getPrimaryMission(question);

    return {
      concept: getQuestionConcept(question),
      createdAt: question.created_at,
      id: question.id,
      missionId: mission?.id ?? null,
      status: question.status,
      title: getQuestionTitle(question),
    };
  });
}

function mapStudentQuestions(questions: QuestionWithMission[]): StudentQuestionListItem[] {
  return questions.map((question) => {
    const mission = getPrimaryMission(question);

    return {
      concept: getQuestionConcept(question),
      createdAt: question.created_at,
      createdLabel: getRelativeDateLabel(question.created_at),
      id: question.id,
      imageUrl: question.image_url,
      missionId: mission?.id ?? null,
      status: question.status,
      statusLabel: getQuestionStatusLabel(question.status),
      title: getQuestionTitle(question),
    };
  });
}

function mapStudentMissions(questions: QuestionWithMission[]): StudentMissionListItem[] {
  return questions.flatMap((question) => {
    const mission = getPrimaryMission(question);

    if (!mission) {
      return [];
    }

    const progress = getMissionProgress(mission);
    const status = mission.is_completed || question.status === "resolved" ? "resolved" : "recovering";

    return [
      {
        concept: getQuestionConcept(question),
        currentStep: progress.currentStep,
        id: mission.id,
        isCompleted: mission.is_completed,
        progressPercent: progress.progressPercent,
        questionId: question.id,
        status,
        statusLabel: status === "resolved" ? "완료된 미션" : "진행 중인 미션",
        title: getQuestionTitle(question),
        totalSteps: progress.totalSteps,
      },
    ];
  });
}

function mapRecentActivities(questions: QuestionWithMission[]): ParentRecentActivity[] {
  return questions.slice(0, RECENT_QUESTION_LIMIT).map((question) => {
    const mission = getPrimaryMission(question);

    return {
      concept: getQuestionConcept(question),
      date: getRelativeDateLabel(question.created_at),
      result: getMissionResult(mission),
      title: getQuestionTitle(question),
    };
  });
}

function mapParentChildProfile(profile: Pick<ProfileRow, "created_at" | "full_name" | "id">): ParentChildProfile {
  return {
    createdAt: profile.created_at,
    id: profile.id,
    name: profile.full_name,
  };
}

function mapUserProfile(profile: ProfileRow): UserProfile {
  return {
    createdAt: profile.created_at,
    fullName: profile.full_name,
    id: profile.id,
    parentId: profile.parent_id,
    role: profile.role,
  };
}

async function getQuestionsWithMissions(
  supabase: TypedSupabaseClient,
  studentId: string,
  options: {
    createdAfter?: string;
    limit?: number;
  } = {}
) {
  let query = supabase
    .from("questions")
    .select(
      "id, student_id, image_url, raw_text, status, created_at, recovery_missions(id, steps, current_step, is_completed)"
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (options.createdAfter) {
    query = query.gte("created_at", options.createdAfter);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as QuestionWithMission[];
}

export async function getStudentSummary(
  supabase: TypedSupabaseClient,
  studentId: string
): Promise<StudentSummary> {
  const [todayQuestions, allQuestions] = await Promise.all([
    getQuestionsWithMissions(supabase, studentId, {
      createdAfter: startOfTodayIso(),
    }),
    getQuestionsWithMissions(supabase, studentId),
  ]);

  const todayCompletedMissions = todayQuestions.filter((question) =>
    getPrimaryMission(question)?.is_completed
  ).length;
  const completedMissionCount = allQuestions.filter((question) =>
    getPrimaryMission(question)?.is_completed
  ).length;

  return {
    todayCompletedMissions,
    totalEnergy: completedMissionCount * ENERGY_PER_COMPLETED_MISSION,
  };
}

export async function getRecentQuestions(
  supabase: TypedSupabaseClient,
  studentId: string
): Promise<RecentQuestion[]> {
  const questions = await getQuestionsWithMissions(supabase, studentId, {
    limit: RECENT_QUESTION_LIMIT,
  });

  return mapRecentQuestions(questions);
}

export async function getStudentQuestionList(
  supabase: TypedSupabaseClient,
  studentId: string,
  limit = STUDENT_LIST_LIMIT
): Promise<StudentQuestionListItem[]> {
  const questions = await getQuestionsWithMissions(supabase, studentId, {
    limit,
  });

  return mapStudentQuestions(questions);
}

export async function getStudentMissionList(
  supabase: TypedSupabaseClient,
  studentId: string,
  limit = STUDENT_LIST_LIMIT
): Promise<StudentMissionListItem[]> {
  const questions = await getQuestionsWithMissions(supabase, studentId, {
    limit,
  });

  return mapStudentMissions(questions);
}

export async function getParentDashboardData(
  supabase: TypedSupabaseClient,
  parentId: string
): Promise<ParentChildReport[]> {
  const { data: children, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, parent_id, created_at")
    .eq("parent_id", parentId)
    .eq("role", "student")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return Promise.all(
    ((children ?? []) as ProfileRow[]).map(async (child) => {
      const questions = await getQuestionsWithMissions(supabase, child.id);
      const weeklyQuestions = questions.filter(
        (question) => new Date(question.created_at) >= startOfWeekWindow()
      );
      const completedMissionCount = questions.filter((question) =>
        getPrimaryMission(question)?.is_completed
      ).length;
      const weeklyMissions = weeklyQuestions.filter((question) =>
        getPrimaryMission(question)?.is_completed
      ).length;

      return {
        childId: child.id,
        childName: child.full_name,
        difficultConcept: findDifficultConcept(questions),
        grade: "자녀 계정",
        recentActivities: mapRecentActivities(questions),
        totalEnergy: completedMissionCount * ENERGY_PER_COMPLETED_MISSION,
        weeklyMissions,
        weeklyTrend: buildWeeklyTrend(weeklyQuestions),
      };
    })
  );
}

export async function getParentChildren(
  supabase: TypedSupabaseClient,
  parentId: string
): Promise<ParentChildProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, parent_id, created_at")
    .eq("parent_id", parentId)
    .eq("role", "student")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProfileRow[]).map(mapParentChildProfile);
}

export async function addChildProfile(
  input: AddChildProfileInput
): Promise<ParentChildProfile> {
  const { accessToken, ...requestBody } = input;

  const response = await fetch("/api/parent/children", {
    body: JSON.stringify(requestBody),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json()) as {
    child?: ParentChildProfile;
    error?: string;
  };

  if (!response.ok || !payload.child) {
    throw new Error(payload.error ?? "자녀 계정을 추가하지 못했습니다.");
  }

  return payload.child;
}

export async function getUserProfile(
  supabase: TypedSupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, parent_id, created_at")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw error;
  }

  return mapUserProfile(data as ProfileRow);
}

export async function updateProfileName(
  supabase: TypedSupabaseClient,
  userId: string,
  fullName: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select("id, role, full_name, parent_id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapUserProfile(data as ProfileRow);
}

export async function getMissionDetail(
  supabase: TypedSupabaseClient,
  missionId: string
): Promise<MissionDetail | null> {
  // UUID 형식 검증 (PostgreSQL 22P02 형식 캐스팅 에러 방지)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(missionId)) {
    if (missionId === "sample-mission-id") {
      return {
        id: "sample-mission-id",
        questionId: "sample-question-id",
        title: "오답 회복 미션 (체험)",
        concept: "동분모 분수의 덧셈과 뺄셈 🧮",
        prompt: "피자 1판이 8조각으로 나뉘어 있습니다. 지우가 3조각을 먹고, 민수가 2조각을 먹었습니다. 두 사람이 먹은 피자는 전체의 몇 분의 몇일까요?",
        energyReward: 20,
        currentStep: 0,
        isCompleted: false,
        hints: [
          {
            id: "1-concept",
            title: "1단계: 문제 상황 파악하기 🍕",
            hint: "피자 전체는 8조각입니다. 한 조각은 전체의 8분의 1(1/8)을 나타냅니다. 지우와 민수가 각각 먹은 조각 수를 세어보세요.",
            encouragement: "그림을 보고 천천히 세어봐도 괜찮아요!"
          },
          {
            id: "2-concept",
            title: "2단계: 분수로 표현하기 📊",
            hint: "지우가 먹은 양은 8조각 중 3조각이므로 '3/8'이고, 민수가 먹은 양은 8조각 중 2조각이므로 '2/8'입니다. 두 분수의 분모와 분자를 확인해 보세요.",
            encouragement: "분모는 전체 조각 수, 분자는 먹은 조각 수예요!"
          },
          {
            id: "3-action",
            title: "3단계: 동분모 분수의 덧셈 전개 ➕",
            hint: "분모가 같을 때는 분모를 그대로 두고 분자만 더합니다. 즉, 3/8 + 2/8 = (3+2)/8 = 5/8 입니다. 두 사람이 먹은 피자는 전체의 '8분의 5'입니다! 정답창에 5/8를 적어보세요.",
            encouragement: "다 왔어요! 분모는 8 그대로, 분자는 3+2를 더하면 돼요!"
          }
        ]
      };
    }
    return null;
  }

  const { data, error } = await supabase
    .from("recovery_missions")
    .select(
      "id, question_id, steps, current_step, is_completed, created_at, questions(id, raw_text, status, created_at)"
    )
    .eq("id", missionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw error;
  }

  const mission = data as RecoveryMissionRow & {
    questions: Pick<QuestionRow, "created_at" | "id" | "raw_text" | "status"> | null;
  };
  const hints = normalizeMissionSteps(mission.steps);

  return {
    concept: hints[0]?.title ?? "회복 미션",
    energyReward: ENERGY_PER_COMPLETED_MISSION,
    hints,
    id: mission.id,
    prompt: mission.questions?.raw_text?.trim() || "촬영한 오답 문제를 다시 풀어보세요.",
    title: "오답 회복 미션",
    currentStep: mission.current_step,
    isCompleted: mission.is_completed,
    questionId: mission.question_id,
  };
}
