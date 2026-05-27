# [Step 15] 폴더 구조 설계: 루프노트 (LoopNote)

> 확장성과 유지보수성을 고려한 Next.js App Router 프로젝트 구조

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

---

## 1. 디렉토리 구조 (Directory Structure)

```text
/src
  /app              # Next.js App Router (Page, Layout, Error)
    /(auth)         # 로그인, 회원가입 관련 그룹
    /(student)      # 학생 전용 대시보드 및 미션 페이지
    /(parent)       # 학부모 전용 리포트 및 설정 페이지
    /api            # API Routes (Backend Logic)
  /components       # 재사용 가능한 UI 컴포넌트
    /common         # Button, Input, Modal 등 기초 UI
    /mission        # 미션 카드, 타이머 등 미션 도메인 특화
    /report         # 차트, 그래프 등 리포트 도메인 특화
  /hooks            # 커스텀 훅 (useAuth, useMission 등)
  /services         # 외부 API 통신 및 비즈니스 로직 (Supabase Client)
  /store            # 전역 상태 관리 (Zustand)
  /types            # TypeScript 인터페이스 및 타입 정의
  /utils            # 공통 유틸리티 함수 (formatDate, validation)
/public             # 이미지, 아이콘 등 정적 자산
```

---

## 2. 구조적 전략
*   **Route Groups `()` 활용**: 도메인별(학생/학부모) 레이아웃 및 권한 처리를 용이하게 분리합니다.
*   **Colocation**: 특정 페이지에서만 쓰이는 컴포넌트는 해당 페이지 폴더 근처에 두는 것을 검토합니다.
