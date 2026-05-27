-- ============================================================
-- LoopNote: 선생님 회원가입 및 데이터베이스 오류 최종 해결 스크립트
-- Supabase Dashboard → SQL Editor에 이 전체 코드를 붙여넣고 "Run"을 클릭하세요.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: 안전한 작업을 위해 기존 뷰 임시 삭제 (컬럼 타입 변경 차단 방지)
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.teacher_class_overview;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: profiles 테이블의 제약 조건 해제 및 컬럼 타입 변경
--         (ALTER TYPE ADD VALUE의 트랜잭션 오류를 완전히 피하기 위해
--          role 컬럼을 유연한 text 타입으로 변경하고 제약 조건을 새로 정의합니다.)
-- ─────────────────────────────────────────────────────────────

-- 1. 기존의 학생/부모 검사 제약 조건 삭제
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_parent_role_check;

-- 2. role 컬럼의 타입을 public.user_role enum에서 text로 안전하게 변환
ALTER TABLE public.profiles ALTER COLUMN role TYPE text USING role::text;

-- 3. 선생님(teacher) 역할을 포함하는 새로운 제약 조건 추가
ALTER TABLE public.profiles ADD CONSTRAINT profiles_parent_role_check CHECK (
  (role = 'parent' and parent_id is null)
  or (role = 'student' and parent_id is not null)
  or (role = 'teacher' and parent_id is null)
);


-- ─────────────────────────────────────────────────────────────
-- STEP 3: profiles 테이블에 선생님(teacher) 관련 신규 컬럼 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_name text DEFAULT NULL;

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_teacher_id ON public.profiles (teacher_id);
CREATE INDEX IF NOT EXISTS idx_profiles_class_name ON public.profiles (class_name);


-- ─────────────────────────────────────────────────────────────
-- STEP 4: 신규 가입자 프로필 자동 생성 트리거 함수 교체
--         (더 이상 rigid한 enum 타입 캐스팅을 하지 않고, 
--          student, parent, teacher 역할을 유연하고 안전하게 처리합니다.)
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

  -- 3. 연결 ID 및 학급 정보 추출
  BEGIN
    target_parent_id := (new.raw_user_meta_data->>'parent_id')::uuid;
  EXCEPTION WHEN others THEN
    target_parent_id := null;
  END;

  BEGIN
    target_teacher_id := (new.raw_user_meta_data->>'teacher_id')::uuid;
  EXCEPTION WHEN others THEN
    target_teacher_id := null;
  END;

  target_class_name := new.raw_user_meta_data->>'class_name';

  -- 4. 부모나 선생님의 경우 parent_id는 항상 null이어야 함 (제약 조건 준수)
  if user_role_raw = 'parent' or user_role_raw = 'teacher' then
    target_parent_id := null;
  end if;

  -- 5. 프로필 삽입 (중복 가입 시 업데이트 처리하여 에러 방지)
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

-- 트리거 재등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- STEP 5: 선생님 전용 뷰 재생성 및 접근 권한 설정
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

-- 뷰 권한 설정 (일반 공개 차단, 로그인 회원 전용)
REVOKE ALL ON public.teacher_class_overview FROM anon;
REVOKE ALL ON public.teacher_class_overview FROM public;
GRANT SELECT ON public.teacher_class_overview TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- STEP 6: RLS(행 단위 보안) 정책 설정
--         (선생님이 담당 학급 학생들의 정보를 안전하게 조회하도록 허용)
-- ─────────────────────────────────────────────────────────────

-- profiles 테이블 정책
DROP POLICY IF EXISTS "teachers_view_their_students_profiles" ON public.profiles;
CREATE POLICY "teachers_view_their_students_profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR parent_id = auth.uid()
    OR teacher_id = auth.uid()
  );

-- questions 테이블 정책
DROP POLICY IF EXISTS "teachers_view_student_questions" ON public.questions;
CREATE POLICY "teachers_view_student_questions"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = questions.student_id AND teacher_id = auth.uid()
    )
  );

-- recovery_missions 테이블 정책
DROP POLICY IF EXISTS "teachers_view_student_missions" ON public.recovery_missions;
CREATE POLICY "teachers_view_student_missions"
  ON public.recovery_missions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id AND q.student_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.questions q
      JOIN public.profiles p ON p.id = q.student_id
      WHERE q.id = question_id AND p.teacher_id = auth.uid()
    )
  );

-- profiles 수정 권한 정책 추가 (선생님이 자신의 학급 이름을 수정하거나 등록할 수 있도록)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- profiles 테이블 수정 권한 부여 (필요 컬럼들 허용)
GRANT UPDATE (full_name, class_name) ON public.profiles TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- ✅ 최종 확인용 쿼리
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('role', 'teacher_id', 'class_name');
