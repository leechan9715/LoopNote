# [Step 16] 컴포넌트 분리 설계: 루프노트 (LoopNote)

> 일관된 디자인 시스템과 재사용성을 위한 컴포넌트 전략

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 디자인 시스템 원칙
*   **키즈 친화적 UI**: 큰 버튼, 파스텔톤 컬러, 읽기 쉬운 폰트 사이즈 적용.
*   **피드백 강화**: 성공 시 애니메이션(Confetti), 로딩 시 재미있는 인디케이터 제공.

---

## 2. 주요 컴포넌트 계층

### 2.1 아토믹 컴포넌트 (Atoms)
*   `Typography`: 제목, 본문 등 텍스트 스타일.
*   `Button`: 기본, 강조, 취소 버튼.
*   `ProgressBar`: 10분 타이머 및 미션 진행률 표시용.

### 2.2 도메인 컴포넌트 (Molecules/Organisms)
*   `CameraScanner`: 사진 촬영 및 미리보기 컴포넌트.
*   `HintCard`: AI가 제공하는 힌트를 보여주는 카드.
*   `AnswerInput`: 학생이 풀이를 입력하는 인터랙티브 폼.
*   `MissionSuccessModal`: 미션 완료 축하 및 보상 안내 모달.

### 2.3 레이아웃 컴포넌트 (Layouts)
*   `StudentLayout`: 하단 내비게이션 바 포함.
*   `ParentLayout`: 사이드바 기반 대시보드 구조.
