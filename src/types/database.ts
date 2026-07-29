// Hand-written to match supabase/migrations/0001_init.sql. If you have
// the Supabase CLI wired up against a real project, prefer generating
// this file instead (`supabase gen types typescript`) so it can never
// drift from the live schema -- keep this version until that's set up.
//
// Note: postgrest-js's GenericTable requires a `Relationships` array on
// every table (even empty) -- leaving it out makes insert()/update()
// silently infer as `never`, which is a confusing error to hit later.

export type Role = "admin" | "teacher" | "parent";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type StudentStatus = "active" | "inactive";

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          primary_contact_name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["households"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["households"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          role: Role;
          full_name: string;
          email: string | null;
          phone: string | null;
          household_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      levels: {
        Row: { id: string; name: string; sort_order: number };
        Insert: Partial<Database["public"]["Tables"]["levels"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["levels"]["Row"]>;
        Relationships: [];
      };
      terms: {
        Row: { id: string; name: string; start_date: string; end_date: string };
        Insert: Partial<Database["public"]["Tables"]["terms"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["terms"]["Row"]>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          level_id: string;
          term_id: string;
          teacher_profile_id: string | null;
          name: string;
          schedule: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["classes"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["classes"]["Row"]>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          household_id: string;
          first_name: string;
          last_name: string;
          date_of_birth: string | null;
          status: StudentStatus;
          enrolled_date: string;
          withdrawn_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["students"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["students"]["Row"]>;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          start_date: string;
          end_date: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Row"]>;
        Relationships: [];
      };
      attendance_records: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          date: string;
          status: AttendanceStatus;
          marked_by: string | null;
          marked_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attendance_records"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Row"]>;
        Relationships: [];
      };
    };
    // The generic schema constraint expects these keys to exist even
    // when unused.
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
