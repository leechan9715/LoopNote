import { createServerSupabaseClient } from "@/services/supabase";

type AddChildRequestBody = {
  email?: unknown;
  fullName?: unknown;
  parentId?: unknown;
  password?: unknown;
};

function readTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (!token) {
    return jsonError("로그인 정보가 필요합니다.", 401);
  }

  let body: AddChildRequestBody;

  try {
    body = (await request.json()) as AddChildRequestBody;
  } catch {
    return jsonError("요청 본문을 확인해 주세요.");
  }

  const parentId = readTrimmedString(body.parentId);
  const fullName = readTrimmedString(body.fullName);
  const email = readTrimmedString(body.email);
  const password = readTrimmedString(body.password);

  if (!parentId || !fullName || !email || !password) {
    return jsonError("자녀 이름, 이메일, 비밀번호를 모두 입력해 주세요.");
  }

  if (password.length < 6) {
    return jsonError("자녀 비밀번호는 6자 이상이어야 합니다.");
  }

  const supabase = createServerSupabaseClient();
  const { data: requester, error: requesterError } = await supabase.auth.getUser(token);

  if (requesterError || requester.user?.id !== parentId) {
    return jsonError("자녀를 추가할 권한이 없습니다.", 403);
  }

  const { data: parentProfile, error: parentProfileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", parentId)
    .single();

  if (parentProfileError || parentProfile?.role !== "parent") {
    return jsonError("학부모 프로필을 먼저 생성해야 합니다.", 403);
  }

  const { data: childAuth, error: childAuthError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: fullName,
        parent_id: parentId,
        role: "student",
      },
    });

  if (childAuthError || !childAuth.user) {
    return jsonError(childAuthError?.message ?? "자녀 계정을 생성하지 못했습니다.");
  }

  // 4. Verification (Trigger handles the profile creation automatically)
  // We poll briefly or simply attempt to fetch the profile to confirm success
  let childProfile = null;
  let attempts = 0;
  while (attempts < 3) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("id", childAuth.user.id)
      .single();

    if (data) {
      childProfile = data;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
  }

  if (!childProfile) {
    console.error('Child profile auto-creation timed out or failed for:', childAuth.user.id);
    // Rollback auth user if profile wasn't created by trigger
    await supabase.auth.admin.deleteUser(childAuth.user.id);
    return jsonError("자녀 프로필 생성 중 시간 초과가 발생했습니다. 다시 시도해 주세요.");
  }

  return Response.json({
    child: {
      createdAt: childProfile.created_at,
      id: childProfile.id,
      name: childProfile.full_name,
    },
  });
}
