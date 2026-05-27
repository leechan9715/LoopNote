# [Step 11] DB 및 API 설계서: 루프노트 (LoopNote)

> 데이터 스키마 및 주요 API 엔드포인트 명세

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 데이터베이스 스키마 (ERD)

### 1.1 `profiles` (사용자 프로필)
*   `id`: UUID (Primary Key, Auth 연동)
*   `role`: user_role (enum: 'student', 'parent')
*   `full_name`: string
*   `parent_id`: UUID (Self-reference, student일 경우 부모 연결)

### 1.2 `questions` (오답 문제)
*   `id`: UUID (PK)
*   `student_id`: UUID (FK to profiles)
*   `image_url`: string (Storage 경로)
*   `raw_text`: text (OCR 결과)
*   `status`: question_status (enum: 'pending', 'recovering', 'resolved')
*   `created_at`: timestamp

### 1.3 `recovery_missions` (회복 미션)
*   `id`: UUID (PK)
*   `question_id`: UUID (FK to questions)
*   `steps`: jsonb (단계별 힌트 및 미션 내용)
*   `current_step`: integer
*   `is_completed`: boolean

---

## 2. 주요 API 엔드포인트

### 2.1 학생용 API
*   `POST /api/questions/scan`: 사진 업로드 및 OCR 분석 요청.
*   `GET /api/missions/:id`: 미션 상세 내용 및 현재 단계 조회.
*   `PATCH /api/missions/:id/progress`: 사용자의 풀이 입력 및 AI 피드백 수신.

### 2.2 학부모용 API
*   `GET /api/reports/:student_id`: 특정 자녀의 학습 통계 및 회복 리포트 조회.
*   `POST /api/subscriptions/checkout`: 프리미엄 구독 결제 처리.
