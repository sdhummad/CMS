-- Phase 2 schema: weekly plans and quiz/exam scores.
--
-- Text-only weekly plans (no file attachments -- decided to keep Phase 2
-- scoped to data entry, attachments can follow as a fast-follow that only
-- touches Supabase Storage + one upload control, not the data model).
--
-- Assessment scores are teacher/admin-only for now: parents don't see
-- individual quiz/exam scores in Phase 2. That's deliberate -- scores
-- surface later, consolidated, in the Phase 3 report card. So
-- `assessments` and `assessment_scores` have no parent-facing RLS policy
-- at all yet; that gets added in the Phase 3 migration alongside
-- report_card.

-- ---------------------------------------------------------------------
-- Weekly plans
--
-- One row per class per week -- a teacher edits it in place rather than
-- creating a new row each time (unlike attendance/enrollment, a plan
-- isn't a historical fact that needs append-only preservation, it's a
-- living document until the week passes). `published_at` is what gates
-- parent visibility: a teacher can save a draft that only they and admin
-- can see, then publish when it's ready.
-- ---------------------------------------------------------------------

create table weekly_plans (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id),
  week_start_date date not null,
  topics text,
  classwork text,
  homework text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, week_start_date)
);

alter table weekly_plans enable row level security;

create policy "weekly_plans_select" on weekly_plans for select
  using (
    private.is_admin()
    or class_id in (select private.my_taught_class_ids())
    or (
      published_at is not null
      and class_id in (
        select class_id from enrollments where student_id in (select private.my_household_student_ids())
      )
    )
  );

create policy "weekly_plans_write_teacher_or_admin" on weekly_plans for all
  using (private.is_admin() or class_id in (select private.my_taught_class_ids()))
  with check (private.is_admin() or class_id in (select private.my_taught_class_ids()));

-- ---------------------------------------------------------------------
-- Assessments and scores
--
-- assessment_scores mirrors attendance_records' upsert pattern: one row
-- per student per assessment, unique constraint lets the app upsert a
-- corrected score instead of piling up duplicates.
-- ---------------------------------------------------------------------

create table assessments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id),
  type text not null check (type in ('quiz', 'surprise_quiz', 'midterm', 'final', 'homework_grade')),
  title text not null,
  date date not null,
  max_score numeric not null check (max_score > 0),
  created_at timestamptz not null default now()
);

create table assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments (id),
  student_id uuid not null references students (id),
  score numeric not null check (score >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

alter table assessments enable row level security;
alter table assessment_scores enable row level security;

create policy "assessments_teacher_or_admin" on assessments for all
  using (private.is_admin() or class_id in (select private.my_taught_class_ids()))
  with check (private.is_admin() or class_id in (select private.my_taught_class_ids()));

create policy "assessment_scores_teacher_or_admin" on assessment_scores for all
  using (
    private.is_admin()
    or assessment_id in (
      select id from assessments where class_id in (select private.my_taught_class_ids())
    )
  )
  with check (
    private.is_admin()
    or assessment_id in (
      select id from assessments where class_id in (select private.my_taught_class_ids())
    )
    -- also confirm the student is actually enrolled in that assessment's class,
    -- same guard attendance_records uses, so a typo'd student_id can't slip in
    and student_id in (
      select e.student_id
      from enrollments e
      join assessments a on a.class_id = e.class_id
      where a.id = assessment_scores.assessment_id
    )
  );
