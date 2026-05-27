-- ============================================================
-- LoopNote: teacher_class_overview 뷰 보안 수정
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: 기존 뷰 삭제 후 security_invoker 옵션으로 재생성
--   security_invoker = on → 뷰를 호출한 사용자의 권한으로 실행
--   즉, 하위 테이블의 RLS 정책이 그대로 적용됨
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.teacher_class_overview;

CREATE VIEW public.teacher_class_overview
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


-- ─────────────────────────────────────────────────────────────
-- STEP 2: anon(비로그인) 사용자의 접근 차단
-- ─────────────────────────────────────────────────────────────
REVOKE ALL ON public.teacher_class_overview FROM anon;
REVOKE ALL ON public.teacher_class_overview FROM public;

-- 로그인한 사용자(authenticated)만 조회 가능
GRANT SELECT ON public.teacher_class_overview TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 확인 쿼리: 아래 결과에서 anon이 없으면 성공
-- ─────────────────────────────────────────────────────────────
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'teacher_class_overview';
