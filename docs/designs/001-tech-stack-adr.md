# [Step 9] 기술 스택 확정 및 ADR: 루프노트 (LoopNote)

> Next.js 기반의 현대적 에듀테크 스택 선정 사유 및 명세

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 프론트엔드 (Frontend)
*   **Framework**: **Next.js 14+ (App Router)**
    *   *사유*: SSR/ISR을 통한 초기 로딩 속도 최적화 및 SEO 대응. 초등학생의 다양한 기기 환경 고려.
*   **Language**: **TypeScript**
    *   *사유*: 타입 안정성을 통한 런타임 에러 방지 및 유지보수성 향상.
*   **Styling**: **Tailwind CSS**
    *   *사유*: 빠른 스타일링 및 일관된 디자인 시스템 구축.

---

## 2. 백엔드 및 인프라 (Backend & Infra)
*   **Platform**: **Supabase**
    *   *사유*: Auth, Database(PostgreSQL), Storage(이미지 업로드)를 하나로 관리하여 MVP 개발 속도 극대화.
*   **AI Engine**: **OpenAI API (GPT-4o / GPT-4o-mini)**
    *   *사유*: OCR 데이터 분석 및 단계별 소크라테스식 힌트 생성에 최적화.
*   **Deployment**: **Vercel**
    *   *사유*: Next.js와의 최상의 궁합 및 자동 배포(CI/CD) 지원.

---

## 3. 데이터 및 외부 서비스
*   **Database**: **PostgreSQL (Supabase Managed)**
*   **OCR**: **Google Vision API** (필기체 인식 특화) 또는 OpenAI GPT-4o vision.
*   **Analytics**: **Amplitude** (사용자 행동 분석).
*   **Error Tracking**: **Sentry**.

---

## 4. 의사결정 기록 (ADR)
| 결정 사항 | 선택 | 대안 | 결정 사유 |
| :--- | :--- | :--- | :--- |
| 메인 프레임워크 | Next.js | React SPA | 초기 로딩 성능 및 SSR 필요성 |
| 서버/DB | Supabase | Custom Node.js + RDS | MVP 단계에서의 빠른 인프라 구축 및 비용 효율성 |
| 스타일링 | Tailwind | Styled-components | 빌드 타임 성능 및 러닝 커브 고려 |
