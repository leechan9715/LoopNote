# [Step 17] 공통 훅 및 유틸 목록: 루프노트 (LoopNote)

> 중복 제거 및 생산성 향상을 위한 공통 로직 사전 정의

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 핵심 커스텀 훅 (Custom Hooks)
*   `useAuth`: 현재 사용자 정보, 로그인/로그아웃, 권한 체크 처리.
*   `useMission`: 미션 진행 상태 관리, 다음 단계 이동, AI 피드백 호출 로직.
*   `useTimer`: 10분 미션 카운트다운 및 타임아웃 처리.
*   `useStorage`: Supabase 이미지 업로드 및 URL 반환 로직.

---

## 2. 핵심 유틸리티 (Utilities)
*   `ocrParser`: OCR 결과 텍스트 정제 및 특수 문자 처리.
*   `mathFormatter`: 수식 가독성을 위한 포맷팅 유틸.
*   `timeFormatter`: 초 단위를 `MM:SS` 형식으로 변환.
*   `errorBoundary`: API 에러 발생 시 사용자 친화적인 메시지 매핑.
