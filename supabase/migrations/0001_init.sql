-- Phase 1 schema: roster, class structure, attendance.
-- Weekly plans, assessments, and report cards are deferred to Phase 2/3
-- migrations (see planning doc) so we don't build tables for features
-- that don't exist yet.
--
-- This has been applied against the live project and verified with
-- Supabase's security advisor (zero warnings). Two things to know if
-- you're reading this as a reference:
--
-- 1. RLS helper functions (is_admin, my_household_id, etc.) live in a
--    `private` schema, not `public`. PostgREST only auto-exposes
--    functions in `public` as `/rest/v1/rpc/<name>` endpoints -- if
--    these lived in `public`, anyone could call them directly as an
--    API rather than only having them run implicitly inside RLS policy
--    checks. Moving them to `private` (with USAGE/EXECUTE granted
--    broadly, matching how `public` behaves by default) closes that off
--    without touching what RLS itself is allowed to do internally.
-- 2. LANGUAGE sql functions are parsed against the catalog at CREATE
--    time (unlike plpgsql, which is opaque until called), so
--    `private.my_taught_class_ids()` and
--    `private.my_household_student_ids()` are defined only after
--    `classes` and `students` exist, further down this file.

create extension if not exists "pgcrypto";
create schema if not exists private;
grant usage on schema private to public;

-- ---------------------------------------------------------------------
-- Households and profiles
--
-- One Supabase Auth user = one login. A "household" is the parent
-- account's grouping entity (holds 1-to-many children). Admin and
-- teacher logins are also auth users, just with a different profile
-- role and no household_id.
-- ---------------------------------------------------------------------

create table households (
  id uuid primary key default gen_random_uuid(),
  primary_contact_name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'parent')),
  full_name text not null,
  email text,
  phone text,
  household_id uuid references households (id) on delete set null,
  created_at timestamptz not null default now()
);

-- New Supabase Auth signups default to a parent account with their own
-- household. Admin/teacher accounts are never created through public
-- sign-up -- an admin promotes a profile's role after the fact -- so
-- this is the only path that creates a household + profile pair.
create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
begin
  insert into households (primary_contact_name)
  values (coalesce(new.raw_user_meta_data ->> 'full_name', new.email, new.phone))
  returning id into new_household_id;

  insert into profiles (id, role, full_name, email, phone, household_id)
  values (
    new.id,
    'parent',
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, new.phone),
    new.email,
    new.phone,
    new_household_id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- Role-check helpers, used throughout the RLS policies below.
-- SECURITY DEFINER so they can read `profiles` even though the calling
-- user's own RLS policy on `profiles` wouldn't otherwise let them see
-- rows other than their own.
--
-- Only the two functions that depend solely on `profiles` live here.
-- The other two reference `classes` / `students`, which don't exist yet
-- at this point in the script, so they're defined further down, right
-- after their target tables are created.
-- ---------------------------------------------------------------------

create function private.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create function private.is_teacher()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

create function private.my_household_id()
returns uuid language sql security definer stable set search_path = public as $$
  select household_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Levels, terms, classes
-- ---------------------------------------------------------------------

create table levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);

create table terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels (id),
  term_id uuid not null references terms (id),
  teacher_profile_id uuid references profiles (id),
  name text not null,
  schedule text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Students and enrollment history
--
-- enrollments is append-only: a student moving classes/levels gets a
-- new row with a start_date, the old row gets an end_date. Nothing is
-- overwritten, so history stays intact for as long as the student is
-- active (and after, once archived per the retention policy).
-- ---------------------------------------------------------------------

create table students (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  enrolled_date date not null default current_date,
  withdrawn_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id),
  class_id uuid not null references classes (id),
  start_date date not null default current_date,
  end_date date
);

-- Now that `classes` and `students` exist, the remaining role-check
-- helpers (see the note above) can be defined.
create function private.my_taught_class_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from classes where teacher_profile_id = auth.uid();
$$;

create function private.my_household_student_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select id from students where household_id = private.my_household_id();
$$;

-- ---------------------------------------------------------------------
-- Attendance
--
-- One row per student per class per date. Any of the three roles can
-- write it (per the school's policy); marked_by keeps it auditable.
-- The absence-notification email is application logic that fires off
-- an insert/update landing on status = 'absent' -- not a DB trigger,
-- so it can use the app's transactional email provider.
-- ---------------------------------------------------------------------

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes (id),
  student_id uuid not null references students (id),
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  marked_by uuid references profiles (id),
  marked_at timestamptz not null default now(),
  unique (class_id, student_id, date)
);

-- Grant execute on everything in `private` up front, matching how the
-- `public` schema behaves by default -- this is what lets RLS policies
-- below actually call these functions for anon/authenticated queries,
-- without ever exposing them as PostgREST RPC endpoints (that exposure
-- is controlled by which schemas PostgREST is told to serve, which
-- stays just `public`).
grant execute on all functions in schema private to public;

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Every table is scoped server-side: a teacher's queries only ever
-- touch their own classes, a parent's only their own household. This
-- is enforced in Postgres itself, not just hidden in the UI, per the
-- security-basics practice of checking authorization on every request.
-- ---------------------------------------------------------------------

alter table households enable row level security;
alter table profiles enable row level security;
alter table levels enable row level security;
alter table terms enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table enrollments enable row level security;
alter table attendance_records enable row level security;

-- households: a parent sees only their own; admin sees all.
-- No direct insert policy -- rows are only created by the signup trigger.
create policy "households_select" on households for select
  using (id = private.my_household_id() or private.is_admin());

create policy "households_update_admin" on households for update
  using (private.is_admin());

-- profiles: everyone can see their own profile; admin sees all;
-- teachers can see the profiles of parents/students they teach is not
-- needed at the profile level (they read via students/classes instead).
create policy "profiles_select_self_or_admin" on profiles for select
  using (id = auth.uid() or private.is_admin());

create policy "profiles_update_self_or_admin" on profiles for update
  using (id = auth.uid() or private.is_admin());

-- levels / terms: readable by anyone signed in (parents and teachers
-- need level names for display), writable only by admin.
create policy "levels_select_authenticated" on levels for select
  using (auth.role() = 'authenticated');
create policy "levels_write_admin" on levels for all
  using (private.is_admin()) with check (private.is_admin());

create policy "terms_select_authenticated" on terms for select
  using (auth.role() = 'authenticated');
create policy "terms_write_admin" on terms for all
  using (private.is_admin()) with check (private.is_admin());

-- classes: admin sees/manages all; a teacher sees their own classes;
-- a parent sees only classes their own children are enrolled in.
create policy "classes_select" on classes for select
  using (
    private.is_admin()
    or teacher_profile_id = auth.uid()
    or id in (
      select class_id from enrollments where student_id in (select private.my_household_student_ids())
    )
  );
create policy "classes_write_admin" on classes for all
  using (private.is_admin()) with check (private.is_admin());

-- students: a parent manages their own children; a teacher can see
-- (read-only) students enrolled in their classes; admin sees/manages all.
create policy "students_select" on students for select
  using (
    household_id = private.my_household_id()
    or private.is_admin()
    or id in (
      select student_id from enrollments where class_id in (select private.my_taught_class_ids())
    )
  );
create policy "students_insert_own_household" on students for insert
  with check (household_id = private.my_household_id() or private.is_admin());
create policy "students_update_own_household_or_admin" on students for update
  using (household_id = private.my_household_id() or private.is_admin());

-- enrollments: admin manages placement; teacher/parent can read the
-- rows relevant to them (needed to know which class a child is in).
create policy "enrollments_select" on enrollments for select
  using (
    private.is_admin()
    or class_id in (select private.my_taught_class_ids())
    or student_id in (select private.my_household_student_ids())
  );
create policy "enrollments_write_admin" on enrollments for all
  using (private.is_admin()) with check (private.is_admin());

-- attendance_records: teacher, parent, or admin can all write, but
-- only for a class/student they actually have a relationship with --
-- and only for a student genuinely enrolled in that class.
create policy "attendance_select" on attendance_records for select
  using (
    private.is_admin()
    or class_id in (select private.my_taught_class_ids())
    or student_id in (select private.my_household_student_ids())
  );
create policy "attendance_write" on attendance_records for insert
  with check (
    (
      private.is_admin()
      or class_id in (select private.my_taught_class_ids())
      or student_id in (select private.my_household_student_ids())
    )
    and student_id in (select student_id from enrollments where class_id = attendance_records.class_id)
  );
create policy "attendance_update" on attendance_records for update
  using (
    private.is_admin()
    or class_id in (select private.my_taught_class_ids())
    or student_id in (select private.my_household_student_ids())
  );
