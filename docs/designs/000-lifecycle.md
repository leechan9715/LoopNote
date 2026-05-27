# Professional Project Development Lifecycle

> 리서치부터 운영까지 총 29단계의 전문가급 프로젝트 운영 표준 가이드라인

**Status**: Approved
**Created**: 2026-05-26
**Owner**: Gemini (Review Agent)

## [Phase 1: 기획 및 비즈니스 (Planning & Business)]
1. **리서치 (Research)**: 시장 분석, 경쟁 서비스 벤치마킹, 기술적 실현 가능성 검토
2. **비즈니스 모델 정의 (Business Model)**: 수익 구조, 가치 제안, 시장 포지셔닝 확정
3. **KPI 정의 (KPI)**: 성공 측정을 위한 핵심 지표(MAU, 전환율 등) 설정
4. **페르소나 정의 (Persona)**: 타겟 사용자의 특성, 니즈, 행동 패턴 구체화
5. **문제 정의 검증 (Problem Validation)**: 가설 수립 및 실제 사용자 데이터를 통한 문제 검증
6. **기획 (PRD)**: 제품 요구사항 문서 작성, 상세 기능 및 비즈니스 로직 정의
7. **법적 검토 항목 정리 (Legal Review)**: 개인정보 처리방침, 약관, 관련 법규 준수 여부 확인
8. **MVP 우선순위 컷 (MVP Priority Cut)**: 핵심 기능 선별 및 최소 기능 제품 범위 확정

## [Phase 2: 기술 설계 (Technical Design)]
9. **기술 스택 확정 (Tech Stack)**: 프레임워크, 언어, 인프라, 라이브러리 최종 선정
10. **시스템 아키텍처 설계 (Architecture)**: 전체 시스템 구조(모놀리식/MSA), 클라우드 구성 설계
11. **DB / API 설계 (DB/API)**: ERD 작성, REST/GraphQL 엔드포인트 및 스키마 명세
12. **인증·인가 설계 (Auth)**: JWT/OAuth2, 권한 관리(RBAC) 전략 수립
13. **상태관리 전략 (State Management)**: 전역/로컬 상태 관리 라이브러리 및 데이터 흐름 정의
14. **데이터 흐름 설계 (Data Flow)**: 프론트-백엔드-DB 간의 데이터 이동 경로 최적화 설계
15. **폴더 구조 설계 (Folder Structure)**: 확장성을 고려한 프로젝트 디렉토리 구조 확정
16. **컴포넌트 분리 설계 (Component Design)**: 아토믹 디자인 등 컴포넌트 재사용 전략 수립
17. **공통 훅 / 유틸 목록 (Hooks/Utils)**: 중복 제거를 위한 공통 로직(Hooks, Utils) 사전 정의
18. **코딩 컨벤션 확정 (Convention)**: ESLint, Prettier, 커밋 컨벤션 등 협업 규칙 설정
19. **외부 서비스 연동 계획 (Integrations)**: 결제, 알림, 메일 등 외부 API 연동 명세

## [Phase 3: 개발 및 검증 (Development & QA)]
20. **개발 시작 (Development)**: 스프린트 단위 기능 구현, 코드 리뷰 및 PR 프로세스
21. **테스트 (Unit → Integration → E2E)**: 단계별 테스트 코드 작성 및 검증
22. **보안 점검 (Security Audit)**: OWASP Top 10 기준 취약점 점검 및 보안 패치
23. **환경변수 / 시크릿 관리 (Secrets)**: `.env`, KMS 등을 이용한 민감 정보 관리 체계 구축

## [Phase 4: 배포 및 운영 (Deployment & Ops)]
24. **배포 + 롤백 계획 (Deployment/Rollback)**: CI/CD 파이프라인, 블루-그린/카나리 배포 전략
25. **모니터링 / 에러 트래킹 (Monitoring)**: Grafana, Sentry 등을 통한 실시간 상태 감시
26. **장애 대응 플레이북 (Incident Response)**: 장애 발생 시 조치 절차 및 에스컬레이션 경로 정의
27. **데이터 백업 전략 (Backup)**: DB 및 정적 에셋의 정기 백업 및 복구 프로세스
28. **스케일링 계획 (Scaling)**: 트래픽 증가에 따른 오토스케일링 및 부하 분산 전략
29. **운영 + 지속적 개선 (Ops & Improvement)**: 피드백 수집, 성능 최적화, 정기 업데이트
