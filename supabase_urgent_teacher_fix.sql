-- ============================================================
-- 선생님 회원가입 오류 즉시 수정
-- Supabase Dashboard → SQL Editor에 붙여넣고 Run 클릭
-- ============================================================

-- STEP 1: teacher 역할을 enum에 추가 (가장 중요!)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'teacher';

-- STEP 2: profiles 테이블에 teacher용 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_name text DEFAULT NULL;

-- STEP 3: 트리거 함수 교체 (teacher 포함 모든 역할 처리)
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
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

-- STEP 4: 트리거가 없으면 생성
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

-- ✅ 확인: 아래 결과에 'teacher' 가 보이면 성공!
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'user_role'
ORDER BY enumsortorder;
