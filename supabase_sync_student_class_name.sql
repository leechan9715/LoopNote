-- ============================================================
-- LoopNote: 담당 학생들의 미지정 학급/학년 동기화 SQL 스크립트
-- Supabase Dashboard → SQL Editor에 이 코드를 붙여넣고 "Run"을 클릭하세요.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: 현재 연결되어 있으나 학급명(class_name)이 NULL 또는 빈 값인 
--         학생들의 학급명을 연결된 선생님의 학급명으로 일괄 동기화합니다.
-- ─────────────────────────────────────────────────────────────
UPDATE public.profiles s
SET class_name = t.class_name
FROM public.profiles t
WHERE s.teacher_id = t.id
  AND s.role = 'student'
  AND (s.class_name IS NULL OR btrim(s.class_name) = '');

-- ─────────────────────────────────────────────────────────────
-- STEP 2: 향후 선생님이 대시보드(환경설정)에서 학급명을 수정했을 때,
--         소속 학생들의 학급명도 실시간으로 연동되어 자동 수정되도록 
--         트리거 및 함수를 생성합니다.
-- ─────────────────────────────────────────────────────────────

-- 1. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.sync_students_class_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 선생님의 학급명(class_name)이 변경되었을 때만 실행
  IF (OLD.class_name IS DISTINCT FROM NEW.class_name) AND NEW.role = 'teacher' THEN
    UPDATE public.profiles
    SET class_name = NEW.class_name
    WHERE teacher_id = NEW.id
      AND role = 'student';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. 기존 트리거 삭제 (존재 시) 및 신규 등록
DROP TRIGGER IF EXISTS trigger_sync_students_class_name ON public.profiles;

CREATE TRIGGER trigger_sync_students_class_name
  AFTER UPDATE OF class_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_students_class_name();

-- ─────────────────────────────────────────────────────────────
-- ✅ 동기화 결과 임시 조회
-- ─────────────────────────────────────────────────────────────
SELECT id, full_name, role, class_name, teacher_id 
FROM public.profiles 
WHERE role = 'student';
