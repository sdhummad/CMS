import { redirect } from "next/navigation";

// A bare /teacher/classes/[classId] URL (e.g. from the sidebar link)
// just lands on the first tab -- Attendance is the thing a teacher opens
// most often, so it's the default rather than an empty landing page.
export default function ClassIndexPage({ params }: { params: { classId: string } }) {
  redirect(`/teacher/classes/${params.classId}/attendance`);
}
