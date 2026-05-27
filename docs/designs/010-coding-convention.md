# [Step 18] 코딩 컨벤션 확정: 루프노트 (LoopNote)

> 협업의 효율과 코드 품질 유지를 위한 약속

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 기본 스타일 가이드
*   **포맷터**: Prettier (설정 파일 `.prettierrc` 준수)
*   **린터**: ESLint (Next.js 권장 설정 + TypeScript strict 모드)

---

## 2. 명명 규칙 (Naming Convention)
*   **컴포넌트**: PascalCase (예: `MissionCard.tsx`)
*   **함수/변수**: camelCase (예: `handleScanClick`)
*   **상수**: UPPER_SNAKE_CASE (예: `MAX_MISSION_TIME`)
*   **파일/폴더**: kebab-case (예: `user-profile/`)

---

## 3. 커밋 컨벤션 (Conventional Commits)
*   `feat`: 새로운 기능 추가
*   `fix`: 버그 수정
*   `docs`: 문서 수정
*   `style`: 코드 포맷팅 (로직 변경 없음)
*   `refactor`: 코드 리팩토링
*   `test`: 테스트 코드 추가/수정
*   `chore`: 빌드 업무, 패키지 매니저 설정 등
