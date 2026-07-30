-- Phase 3 schema: reporting periods and consolidated report cards.
--
-- No PDF generation (decided) -- a finalized report card is a JSON
-- snapshot (attendance summary + assessment scores for that period),
-- rendered as a styled page/email rather than a file. Keeps this phase
-- to data + email, no rendering pipeline or file storage to maintain.
--
-- `snapshot` is populated at generate time and is what "finalize" locks:
-- once finalized_at is set, the app refuses to regenerate/overwrite it,
-- so a later attendance correction can't silently rewrite a report a
-- parent already received.

create table reporting_periods (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms (id),
  label text not null,
  start_date date not null,
  end_date date not null
);

alter table reporting_periods enable row level security;

create policy "reporting_periods_select_authenticated" on reporting_periods for select
  using (auth.role() = 'authenticated');

create policy "reporting_periods_write_admin" on reporting_periods for all
  using (private.is_admin())
  with check (private.is_admin());

-- ---------------------------------------------------------------------
-- Report cards
--
-- One row per student per reporting period. class_id is what's used for
-- the teacher-ownership RLS check (same pattern as every other
-- teacher-authored table); a student's history across different classes
-- in different periods is just multiple rows, same append-style history
-- the rest of the schema already relies on.
-- ---------------------------------------------------------------------

create table report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id),
  class_id uuid not null references classes (id),
  reporting_period_id uuid not null references reporting_periods (id),
  snapshot jsonb,
  generated_at timestamptz not null default now(),
  finalized_at timestamptz,
  finalized_by uuid references profiles (id),
  emailed_at timestamptz,
  unique (student_id, reporting_period_id)
);

alter table report_cards enable row level security;

create policy "report_cards_select" on report_cards for select
  using (
    private.is_admin()
    or class_id in (select private.my_taught_class_ids())
    or (
      finalized_at is not null
      and student_id in (select private.my_household_student_ids())
    )
  );

create policy "report_cards_write_teacher_or_admin" on report_cards for all
  using (private.is_admin() or class_id in (select private.my_taught_class_ids()))
  with check (private.is_admin() or class_id in (select private.my_taught_class_ids()));
