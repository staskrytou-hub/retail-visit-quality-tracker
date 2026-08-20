export const VISIT_AREAS = [
  { key: "warzywa_owoce", label: "Warzywa i owoce" },
  { key: "pieczywo", label: "Pieczywo" },
  { key: "dania_przekaski", label: "Dania gotowe i szybkie przekąski" },
] as const;

export type VisitAreaKey = (typeof VISIT_AREAS)[number]["key"];

export function visitAreaLabel(key: string) {
  return VISIT_AREAS.find(area => area.key === key)?.label ?? key;
}
