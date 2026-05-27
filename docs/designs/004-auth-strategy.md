# [Step 12] 인증 및 인가 설계: 루프노트 (LoopNote)

> 부모-자녀 관계를 고려한 보안 및 권한 체계

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 인증 전략 (Authentication)
*   **Provider**: Supabase Auth
*   **Method**: 
    *   **학부모**: 이메일/비밀번호 가입 및 소셜 로그인 (카카오, 구글).
    *   **학생**: 부모가 생성한 전용 아이디/비밀번호 또는 부모 기기에서의 간편 전환.

---

## 2. 인가 및 권한 관리 (Authorization)
*   **RLS (Row Level Security)** 적용:
    *   학생은 자신의 `questions`와 `missions` 데이터에만 접근 가능.
    *   부모는 연결된 `parent_id`가 일치하는 자녀의 데이터에 대해서만 **읽기 권한**을 가짐.
*   **Session**: JWT (JSON Web Token) 기반의 세션 관리.

---

## 3. 부모-자녀 계정 연결 흐름
1.  학부모 가입 및 로그인.
2.  학부모 대시보드에서 '자녀 추가' 클릭.
3.  자녀의 별명 및 간편 비밀번호 설정.
4.  시스템이 자녀용 UUID 생성 및 `parent_id` 매핑.
5.  자녀는 부모 기기나 본인 기기에서 해당 계정으로 로그인하여 미션 수행.
