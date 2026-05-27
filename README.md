# LoopNote

LoopNote는 초등학생의 학습 미션 수행과 학부모 리포트를 지원하는 Next.js 기반 에듀테크 MVP입니다.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- ESLint
- Prettier

## Getting Started

개발 서버 실행:

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Project Structure

```text
src/
  app/
    (auth)/
    (student)/
    (parent)/
    api/
  components/
    common/
    mission/
    report/
  hooks/
  services/
  store/
  types/
  utils/
```

## Scripts

- `npm run dev`: start the development server
- `npm run build`: create a production build
- `npm run start`: start the production server
- `npm run lint`: run ESLint

## Supabase

로컬 또는 원격 Supabase 프로젝트에 `profiles` 테이블을 적용합니다.

```bash
supabase db push
```

직접 SQL Editor에서 실행해야 하는 경우에는 아래 마이그레이션 파일을 적용합니다.

```text
supabase/migrations/20260526000000_create_profiles.sql
```

마이그레이션은 `user_role` enum, `profiles` 테이블, 부모-자녀 조회를 위한 RLS 정책을 생성합니다.

### Storage bucket: `questions`

오답 스캔 이미지를 업로드하려면 Supabase Storage에 `questions` 버킷을 생성합니다.

1. Supabase Dashboard에서 **Storage > New bucket**을 선택합니다.
2. 버킷 이름을 `questions`로 설정합니다.
3. 현재 클라이언트는 업로드 후 `getPublicUrl`을 사용하므로 공개 URL이 필요합니다. MVP에서는 Public bucket으로 시작할 수 있습니다.
4. 운영 환경에서는 authenticated 사용자만 자신의 경로에 업로드할 수 있도록 Storage RLS 정책을 적용합니다.

권장 경로 규칙:

```text
student-id/timestamp-random.jpg
```

예시 Storage 정책:

```sql
create policy "Students can upload own question images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'questions'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Students can read own question images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'questions'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

`questions` 테이블에는 업로드 성공 후 `student_id`, `image_url`, `raw_text`, `status`를 포함한 기초 레코드가 생성됩니다.

## OpenAI

미션 생성 API는 OpenAI Vision 모델을 사용합니다. 로컬 환경에는 아래 값을 설정합니다.

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_VISION_MODEL=gpt-4o
```

`POST /api/missions/generate`는 `question_id`를 받아 저장된 이미지 URL을 분석하고, 3단계 힌트 미션을 생성해 `recovery_missions` 테이블에 저장합니다.

## Notes

The application follows the approved LoopNote design documents under `docs/plans/designs/`.
