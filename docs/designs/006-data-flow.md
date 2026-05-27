# [Step 14] 데이터 흐름 설계: 루프노트 (LoopNote)

> 오답 스캔부터 미션 완료까지의 엔드-투-엔드 데이터 여정

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 핵심 시나리오: 오답 회복 미션 흐름
1.  **사진 업로드**: 학생이 촬영한 사진을 Supabase Storage에 업로드 (Client → Storage).
2.  **OCR 요청**: 업로드된 이미지 URL을 담아 API Route 호출 (Client → Next.js API).
3.  **분석 및 저장**: API에서 Google Vision/OpenAI를 통해 텍스트 추출 후 DB 저장 (API → DB).
4.  **미션 생성**: 추출된 텍스트를 OpenAI GPT에 전달하여 단계별 힌트 미션 생성 (API → OpenAI → DB).
5.  **학습 시작**: 생성된 미션 ID를 클라이언트로 반환하여 학습 화면 진입.
6.  **실시간 피드백**: 학생의 입력값을 서버로 전송, AI가 검증 후 다음 힌트 또는 정답 처리 (Client ↔ API).

---

## 2. 알림 데이터 흐름
1.  학생 미션 완료 (DB Update).
2.  DB 웹훅(Webhook) 또는 Edge Function 트리거.
3.  학부모 기기로 푸시 알림 또는 알림톡 전송 (Server → FCM/Alimtalk → Parent).
