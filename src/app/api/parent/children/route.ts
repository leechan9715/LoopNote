import { createServerSupabaseClient } from "@/services/supabase";

type AddChildRequestBody = {
  action?: unknown;
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
  const action = readTrimmedString(body.action) || "create";
  const email = readTrimmedString(body.email);

  if (!parentId || !email) {
    return jsonError("자녀 계정 이메일과 학부모 정보가 필요합니다.");
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

  // CASE 1: 기존 자녀 계정 연결하기 (Link action)
  if (action === "link") {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return jsonError("학생 계정을 찾는 도중 오류가 발생했습니다.", 500);
    }
    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      return jsonError("해당 이메일로 가입된 학생 계정을 찾을 수 없습니다.", 404);
    }

    const { data: childProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name, created_at")
      .eq("id", targetUser.id)
      .single();

    if (profileError || !childProfile) {
      return jsonError("해당 유저의 학생 프로필이 존재하지 않습니다.", 404);
    }

    if (childProfile.role !== "student") {
      return jsonError("학생 역할의 계정만 자녀로 연결할 수 있습니다.", 400);
    }

    // parent_id를 현재 학부모 ID로 맵핑
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ parent_id: parentId })
      .eq("id", childProfile.id);

    if (updateError) {
      return jsonError("자녀 계정 연동에 실패했습니다. 다시 시도해 주세요.", 500);
    }

    return Response.json({
      child: {
        createdAt: childProfile.created_at,
        id: childProfile.id,
        name: childProfile.full_name,
      },
    });
  }

  // CASE 2: 신규 자녀 계정 만들어 연결하기 (Create action)
  const fullName = readTrimmedString(body.fullName);
  const password = readTrimmedString(body.password);

  if (!fullName || !password) {
    return jsonError("자녀 이름과 비밀번호를 입력해 주세요.");
  }

  if (password.length < 6) {
    return jsonError("자녀 비밀번호는 6자 이상이어야 합니다.");
  }

  const { data: childAuth, error: childAuthError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: fullName,
        parent_id: parentId,
        parent_email_or_code: parentId,
        role: "student",
      },
    });

  if (childAuthError || !childAuth.user) {
    return jsonError(childAuthError?.message ?? "자녀 계정을 생성하지 못했습니다.");
  }

  // Verification (Trigger handles the profile creation automatically)
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
    await new Promise((resolve) => setTimeout(resolve, 500));
    attempts++;
  }

  if (!childProfile) {
    console.error("Child profile auto-creation timed out for:", childAuth.user.id);
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
