-- ============================================================
-- LoopNote: 1:1 코칭 리포트 및 학부모 브리핑 데이터베이스 마이그레이션 SQL
-- Supabase Dashboard → SQL Editor에 이 전체 코드를 붙여넣고 "Run"을 클릭하세요.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: profiles 테이블에 coaching_feedback 컬럼 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coaching_feedback text;

COMMENT ON COLUMN public.profiles.coaching_feedback IS '선생님이 해당 학생에게 보낸 1:1 코칭 메시지 또는 학급 전체 브리핑';

-- ─────────────────────────────────────────────────────────────
-- STEP 2: RLS(행 레벨 보안) 정책 보완
--         (선생님이 담당하는 학생들의 coaching_feedback 필드를 
--          안전하게 업데이트할 수 있도록 정책을 설정합니다.)
-- ─────────────────────────────────────────────────────────────

-- 1. 기존 업데이트 정책이 존재할 경우 삭제 방지 및 안전한 추가를 위해 drop 처리
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can update their student profiles" ON public.profiles;

-- 2. 사용자가 자신의 이름 등을 수정할 수 있는 기본 정책 재정의
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. 선생님이 담당 학생의 코칭 피드백 및 학급 정보를 수정할 수 있는 전용 정책 정의
CREATE POLICY "Teachers can update their student profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() 
    OR id = auth.uid()
  )
  WITH CHECK (
    teacher_id = auth.uid() 
    OR id = auth.uid()
  );

-- 4. Supabase가 authenticated 역할을 통해 이 컬럼을 업데이트할 수 있도록 권한을 재부여합니다.
GRANT UPDATE (coaching_feedback, class_name, full_name) ON public.profiles TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- ✅ 마이그레이션 완료 확인 쿼리
-- ─────────────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'coaching_feedback';
