-- ============================================================
-- LoopNote: Teacher Role Migration
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: user_role enum에 'teacher' 추가
-- ─────────────────────────────────────────────────────────────
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';


-- ─────────────────────────────────────────────────────────────
-- STEP 2: profiles 테이블에 teacher_id 컬럼 추가
--         (학생이 어떤 선생님 반인지 연결)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_name text DEFAULT NULL;

-- teacher_id 인덱스 (선생님별 학생 조회 성능)
CREATE INDEX IF NOT EXISTS idx_profiles_teacher_id
  ON public.profiles (teacher_id);

-- class_name 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_class_name
  ON public.profiles (class_name);


-- ─────────────────────────────────────────────────────────────
-- STEP 3: 선생님 계정의 자동 프로필 생성 트리거 수정
--         (기존 트리거가 student/parent만 처리하는 경우)
-- ─────────────────────────────────────────────────────────────

-- 기존 트리거 함수가 있다면 교체 (없으면 새로 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, parent_id, teacher_id, class_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'),
    CASE
      WHEN NEW.raw_user_meta_data->>'parent_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'parent_id')::uuid
      ELSE NULL
    END,
    CASE
      WHEN NEW.raw_user_meta_data->>'teacher_id' IS NOT NULL
      THEN (NEW.raw_user_meta_data->>'teacher_id')::uuid
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'class_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 트리거가 없으면 생성
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- STEP 4: RLS(Row Level Security) 정책 — 선생님이 담당 학생 조회 허용
-- ─────────────────────────────────────────────────────────────

-- profiles: 선생님은 자신의 teacher_id를 가진 학생 프로필을 볼 수 있음
DROP POLICY IF EXISTS "teachers_view_their_students_profiles" ON public.profiles;
CREATE POLICY "teachers_view_their_students_profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- 본인 프로필은 항상 조회 가능
    auth.uid() = id
    OR
    -- 부모는 자녀 프로필 조회 가능
    auth.uid() = parent_id
    OR
    -- 선생님은 담당 학생 프로필 조회 가능
    auth.uid() = teacher_id
  );

-- questions: 선생님은 담당 학생의 오답 문항을 볼 수 있음
DROP POLICY IF EXISTS "teachers_view_student_questions" ON public.questions;
CREATE POLICY "teachers_view_student_questions"
  ON public.questions
  FOR SELECT
  USING (
    -- 학생 본인
    auth.uid() = student_id
    OR
    -- 선생님 (담당 학생인 경우)
    auth.uid() IN (
      SELECT teacher_id FROM public.profiles WHERE id = student_id AND teacher_id IS NOT NULL
    )
  );

-- recovery_missions: 선생님은 담당 학생의 미션을 볼 수 있음
DROP POLICY IF EXISTS "teachers_view_student_missions" ON public.recovery_missions;
CREATE POLICY "teachers_view_student_missions"
  ON public.recovery_missions
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.teacher_id
      FROM public.questions q
      JOIN public.profiles p ON p.id = q.student_id
      WHERE q.id = question_id AND p.teacher_id IS NOT NULL
    )
    OR
    -- 학생 본인 (기존)
    auth.uid() IN (
      SELECT student_id FROM public.questions WHERE id = question_id
    )
  );


-- ─────────────────────────────────────────────────────────────
-- STEP 5: 선생님 전용 뷰 생성 (API에서 편하게 사용)
--         teacher_class_overview: 선생님이 담당 학생 현황을 한 번에 조회
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.teacher_class_overview AS
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


-- ─────────────────────────────────────────────────────────────
-- STEP 6: 확인 쿼리 (실행 후 아래로 결과 확인)
-- ─────────────────────────────────────────────────────────────
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;
-- 결과: parent, student, teacher 세 값이 보여야 합니다.

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
-- 결과: teacher_id, class_name 컬럼이 추가되어 있어야 합니다.
