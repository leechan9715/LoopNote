-- ============================================================
-- LoopNote: 학생 회원가입 시 선생님/부모 연결 오류 최종 해결 스크립트
-- Supabase Dashboard → SQL Editor에 이 전체 코드를 붙여넣고 "Run"을 클릭하세요.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: 안전한 작업을 위해 기존 뷰 임시 삭제
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.teacher_class_overview;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: profiles 테이블 제약 조건 수정
--         (기존 제약조건은 학생 가입 시 부모 ID가 필수로 존재해야만 했습니다.
--          학생이 혼자 가입하거나 선생님 코드를 입력하고 가입할 수 있도록 
--          부모 ID 필수 제약을 해제합니다.)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_parent_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_parent_role_check CHECK (
  (role = 'parent' and parent_id is null)
  or (role = 'student') -- 학생은 부모 연결이 없을 수도 있음 (선생님만 연동하거나 나중 연동 가능)
  or (role = 'teacher' and parent_id is null)
);


-- ─────────────────────────────────────────────────────────────
-- STEP 3: 신규 가입자 프로필 자동 생성 트리거 함수 업데이트
--         (학생이 입력한 코드/이메일이 '선생님 ID'인지 '부모 ID'인지 
--          데이터베이스를 조회해 자동으로 판별하고 올바른 컬럼에 매핑합니다.)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name text;
  user_role_raw text;
  raw_code text;
  resolved_uuid uuid;
  linked_role text;
  target_parent_id uuid;
  target_teacher_id uuid;
  target_class_name text;
BEGIN
  -- 1. 이름 추출 및 공백 정제
  user_full_name := btrim(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  if length(user_full_name) = 0 then
    user_full_name := '사용자';
  end if;

  -- 2. 역할 추출 (기본값 student)
  user_role_raw := coalesce(new.raw_user_meta_data->>'role', 'student');

  -- 3. 학급명 정보 추출 (선생님용)
  target_class_name := new.raw_user_meta_data->>'class_name';

  -- 4. 연결 코드 분석 (입력받은 코드가 선생님 UUID인지 부모 UUID인지 자동 식별)
  raw_code := new.raw_user_meta_data->>'parent_email_or_code';
  
  if raw_code is not null and btrim(raw_code) <> '' then
    BEGIN
      resolved_uuid := raw_code::uuid;
      
      -- 연결된 프로필의 역할을 조회
      SELECT role INTO linked_role FROM public.profiles WHERE id = resolved_uuid;
      
      if linked_role = 'teacher' then
        target_teacher_id := resolved_uuid;
        -- 선생님과 매핑되면 해당 선생님의 학급명을 학생의 학급명으로도 자동 설정
        SELECT class_name INTO target_class_name FROM public.profiles WHERE id = resolved_uuid;
      elsif linked_role = 'parent' then
        target_parent_id := resolved_uuid;
      end if;
    EXCEPTION WHEN others THEN
      -- UUID 형식이 아니거나 조회 실패 시 일반 이메일 등으로 취급하여 매핑 건너뜀
      resolved_uuid := null;
    END;
  end if;

  -- 5. 부모나 선생님의 경우 parent_id는 항상 null이어야 함
  if user_role_raw = 'parent' or user_role_raw = 'teacher' then
    target_parent_id := null;
  end if;

  -- 6. 프로필 삽입 (중복 가입 시 업데이트 처리하여 에러 방지)
  INSERT INTO public.profiles (id, full_name, role, parent_id, teacher_id, class_name)
  VALUES (new.id, user_full_name, user_role_raw, target_parent_id, target_teacher_id, target_class_name)
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = excluded.full_name,
    role = excluded.role,
    parent_id = excluded.parent_id,
    teacher_id = excluded.teacher_id,
    class_name = excluded.class_name;

  RETURN new;
EXCEPTION
  WHEN others THEN
    raise log 'Error in handle_new_user trigger: %', sqlerrm;
    raise exception '가입 중 프로필 생성에 실패했습니다. (사유: %)', sqlerrm;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- STEP 4: 선생님 전용 뷰 재생성 및 접근 권한 설정
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.teacher_class_overview
  WITH (security_invoker = on)
AS
SELECT
  p.id                                          AS student_id,
  p.full_name                                   AS student_name,
  p.class_name,
  p.teacher_id,
  COUNT(DISTINCT q.id)                          AS total_questions,
  COUNT(DISTINCT q.id) FILTER (
    WHERE q.created_at >= NOW() - INTERVAL '1 day'
  )                                             AS today_questions,
  COUNT(DISTINCT rm.id) FILTER (
    WHERE rm.is_completed = true
  )                                             AS completed_missions,
  COUNT(DISTINCT rm.id) FILTER (
    WHERE rm.is_completed = false AND rm.id IS NOT NULL
  )                                             AS active_missions,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT rm.id) > 0
      THEN COUNT(DISTINCT rm.id) FILTER (WHERE rm.is_completed = true)::numeric
           / COUNT(DISTINCT rm.id)::numeric * 100
      ELSE 0
    END
  )                                             AS recovery_rate,
  MAX(q.created_at)                             AS last_active_at,
  (
    SELECT q2.raw_text
    FROM public.questions q2
    WHERE q2.student_id = p.id
      AND q2.status IN ('pending', 'recovering')
    ORDER BY q2.created_at DESC
    LIMIT 1
  )                                             AS latest_weak_text
FROM public.profiles p
LEFT JOIN public.questions q ON q.student_id = p.id
LEFT JOIN public.recovery_missions rm ON rm.question_id = q.id
WHERE p.role = 'student'
GROUP BY p.id, p.full_name, p.class_name, p.teacher_id;

REVOKE ALL ON public.teacher_class_overview FROM anon;
REVOKE ALL ON public.teacher_class_overview FROM public;
GRANT SELECT ON public.teacher_class_overview TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- ✅ 최종 확인용 쿼리
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('role', 'teacher_id', 'class_name');
