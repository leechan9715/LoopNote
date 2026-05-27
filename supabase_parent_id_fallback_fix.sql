-- ============================================================
-- LoopNote: handle_new_user 트리거 parent_id direct mapping Fallback 패치
-- Supabase Dashboard -> SQL Editor에 붙여넣고 "Run"을 실행하세요.
-- ============================================================

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
  direct_parent_id text;
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

  -- 4. 직계 부모 ID 직접 분석 (Fallback 옵션 추가)
  direct_parent_id := new.raw_user_meta_data->>'parent_id';
  if direct_parent_id is not null and btrim(direct_parent_id) <> '' then
    BEGIN
      target_parent_id := direct_parent_id::uuid;
    EXCEPTION WHEN others THEN
      target_parent_id := null;
    END;
  end if;

  -- 5. 연결 코드 분석 (입력받은 코드가 선생님 UUID인지 부모 UUID인지 자동 식별 및 매핑)
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

  -- 6. 부모나 선생님의 경우 parent_id는 항상 null이어야 함
  if user_role_raw = 'parent' or user_role_raw = 'teacher' then
    target_parent_id := null;
  end if;

  -- 7. 프로필 삽입 (중복 가입 시 업데이트 처리하여 에러 방지)
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
