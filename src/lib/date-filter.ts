export function visitDateFilter(range: string | null, from?: string | null, to?: string | null) {
  switch (range) {
    case "today": return { sql: "AND date(v.completed_at)=date('now')", params: [] as string[] };
    case "week": return { sql: "AND date(v.completed_at)>=date('now','-' || ((cast(strftime('%w','now') as integer)+6)%7) || ' days')", params: [] as string[] };
    case "month": return { sql: "AND date(v.completed_at)>=date('now','start of month')", params: [] as string[] };
    case "previous": return { sql: `AND date(v.completed_at)>=date('now','-' || (((cast(strftime('%w','now') as integer)+6)%7)+7) || ' days')
      AND date(v.completed_at)<date('now','-' || ((cast(strftime('%w','now') as integer)+6)%7) || ' days')`, params: [] as string[] };
    case "30": case "60": case "90": return { sql: `AND v.completed_at>=datetime('now','-${range} days')`, params: [] as string[] };
    case "custom":
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) return { sql: "AND date(v.completed_at) BETWEEN date(?) AND date(?)", params: [from, to] };
      return { sql: "", params: [] as string[] };
    default: return { sql: "", params: [] as string[] };
  }
}
