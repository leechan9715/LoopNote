create policy "Parents can read child questions"
  on public.questions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = questions.student_id
        and profiles.parent_id = auth.uid()
    )
  );

create policy "Parents can read child recovery missions"
  on public.recovery_missions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.questions
      join public.profiles
        on profiles.id = questions.student_id
      where questions.id = recovery_missions.question_id
        and profiles.parent_id = auth.uid()
    )
  );
