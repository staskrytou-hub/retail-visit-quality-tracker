export function calculateScore(answers: boolean[]) {
  const weights = scoreWeightsForAnswerCount(answers.length);
  const score = answers.reduce((sum, answer, index) => sum + (answer ? weights[index] : 0), 0);
  return Math.round(score * 100) / 100;
}

export function calculateScoreForQuestions(answers: Array<{ number:number;text:string;answer:boolean }>) {
  if (answers.length !== 6 && answers.length !== 10) throw new Error("Wymagane jest dokładnie 6 albo 10 odpowiedzi");
  const score = answers.reduce((sum, item) => {
    if (!item.answer) return sum;
    if (isCriticalQuestionText(item.text)) return sum + (answers.length === 6 ? 40 : 20);
    if (answers.length === 10 && (item.number === 9 || item.number === 10)) return sum + 5;
    return sum + (answers.length === 6 ? 12 : 10);
  }, 0);
  return Math.round(score * 100) / 100;
}

export function scoreWeightsForAnswerCount(answerCount: number) {
  if (answerCount === 6) return [40, 12, 12, 12, 12, 12] as const;
  if (answerCount === 10) return [10, 10, 10, 10, 20, 10, 10, 10, 5, 5] as const;
  throw new Error("Wymagane jest dokładnie 6 albo 10 odpowiedzi");
}

export function criticalQuestionWeightForAnswerCount(answerCount: number) {
  return answerCount === 6 ? 40 : answerCount === 10 ? 20 : 0;
}

export function isCriticalQuestionText(text: string) {
  return text.toLocaleLowerCase("pl-PL").includes("dodatkowy produkt");
}

export function normalizeMpcs(values: string[]) {
  return [...new Set(values
    .map(value => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(value => value.length > 1 && value.startsWith("D")))];
}

const exactStoreDestinations: Record<string, string> = {};

export function googleMapsDirectionsUrl(city: string, street: string, mpc?: string) {
  const exactDestination = mpc ? exactStoreDestinations[mpc.trim().toUpperCase()] : undefined;
  const destination = encodeURIComponent(exactDestination || `${street.trim()}, ${city.trim()}, Polska`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
