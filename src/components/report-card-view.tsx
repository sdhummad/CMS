import type { ReportCardSnapshot } from "@/types/database";

export function ReportCardView({ periodLabel, snapshot }: { periodLabel: string; snapshot: ReportCardSnapshot }) {
  const { period, attendance: att, assessments } = snapshot;
  const attendancePct = att.total > 0 ? Math.round((att.present / att.total) * 100) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between bg-indigo-600 px-4 py-2.5 text-white">
        <div>
          <p className="text-sm font-semibold">{periodLabel}</p>
          <p className="text-[11px] text-indigo-100">
            {period.start_date} – {period.end_date}
          </p>
        </div>
        {attendancePct !== null && (
          <div className="text-right">
            <p className="text-lg font-bold leading-none">{attendancePct}%</p>
            <p className="text-[10px] text-indigo-100">attendance</p>
          </div>
        )}
      </div>

      <div className="bg-white p-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Attendance</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <AttendanceChip label="Present" count={att.present} color="emerald" />
          <AttendanceChip label="Late" count={att.late} color="amber" />
          <AttendanceChip label="Absent" count={att.absent} color="red" />
          <AttendanceChip label="Excused" count={att.excused} color="gray" />
        </div>

        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Quizzes &amp; exams</p>
        {assessments.length > 0 ? (
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {assessments.map((a, j) => (
              <div key={j} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-700">{a.title}</p>
                  <p className="text-[11px] capitalize text-gray-400">
                    {a.type.replace("_", " ")} · {a.date}
                  </p>
                </div>
                <ScoreBadge score={a.score} maxScore={a.max_score} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No quizzes or exams recorded this period.</p>
        )}
      </div>
    </div>
  );
}

// Tailwind's build-time scanner needs literal class names, not
// interpolated ones -- hence the explicit switch instead of building a
// `bg-${color}-50` string, which would silently fail to compile in.
function AttendanceChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "emerald" | "amber" | "red" | "gray";
}) {
  const styles: Record<typeof color, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[color]}`}>
      {count} {label}
    </span>
  );
}

function ScoreBadge({ score, maxScore }: { score: number | null; maxScore: number }) {
  if (score === null) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400">Not recorded</span>
    );
  }
  const pct = Math.round((score / maxScore) * 100);
  const styles =
    pct >= 80 ? "bg-emerald-50 text-emerald-700" : pct >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {score} / {maxScore} · {pct}%
    </span>
  );
}
