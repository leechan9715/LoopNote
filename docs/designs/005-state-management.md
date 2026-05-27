# [Step 13] 상태 관리 전략: 루프노트 (LoopNote)

> Next.js 환경에서의 효율적인 데이터 흐름 및 상태 제어

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 상태 관리 원칙
*   **Server Component First**: 가능한 많은 데이터를 서버 컴포넌트에서 Fetch하여 클라이언트 번들 크기 감소.
*   **SWR (또는 React Query)**: 클라이언트 측 데이터 패칭, 캐싱, 낙관적 업데이트(Optimistic UI) 처리.
*   **Zustand**: 전역 UI 상태(모달 열림 여부, 미션 타이머 등) 및 가벼운 클라이언트 상태 관리.

---

## 2. 주요 상태 범주
### 2.1 서버 상태 (Server State) - SWR 활용
*   오답 리스트, 미션 상세 정보, 사용자 프로필 정보.
*   학부모용 주간 리포트 데이터.

### 2.2 로컬 UI 상태 (Local UI State) - `useState` 활용
*   입력 폼 데이터, 사진 촬영 모드 전환 여부.

### 2.3 전역 UI 상태 (Global UI State) - Zustand 활용
*   현재 진행 중인 10분 미션의 '남은 시간'.
*   앱 전체 테마 및 토스트 알림 메시지.
