# [Step 19] 외부 서비스 연동 계획: 루프노트 (LoopNote)

> 서비스 확장을 위한 외부 API 및 플랫폼 연동 명세

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. AI 및 데이터 서비스
*   **OpenAI API**: GPT-4o 기반의 이미지 분석 및 힌트 생성 엔진 연동.
*   **Google Vision API**: 고정밀 OCR이 필요한 경우 서브 엔진으로 활용.

---

## 2. 결제 및 비즈니스
*   **Toss Payments**: 국내 결제 환경 최적화를 위한 프리미엄 정기 구독 결제 연동.
*   **카카오 알림톡 (Solapi 등)**: 학부모용 실시간 알림 전송.

---

## 3. 분석 및 모니터링
*   **Amplitude**: 사용자 여정(Funnel) 및 리텐션 분석 연동.
*   **Sentry**: 런타임 에러 로깅 및 성능 모니터링 연동.

---

## 4. 연동 보안 원칙
1.  **API Key 관리**: 모든 비밀 키는 Vercel 환경변수 및 Supabase Secrets에 저장하며, 클라이언트 측에 노출하지 않습니다.
2.  **Rate Limiting**: AI API 오남용 방지를 위해 사용자당 호출 횟수 제한 로직을 구현합니다.
