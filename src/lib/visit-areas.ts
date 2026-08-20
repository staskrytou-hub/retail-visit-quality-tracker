export const VISIT_AREAS = [
  { key: "warzywa_owoce", label: "Fruit and vegetables" },
  { key: "pieczywo", label: "Bakery" },
  { key: "dania_przekaski", label: "Ready meals and quick snacks" },
] as const;

export type VisitAreaKey = (typeof VISIT_AREAS)[number]["key"];

export function visitAreaLabel(key: string) {
  return VISIT_AREAS.find(area => area.key === key)?.label ?? key;
}
