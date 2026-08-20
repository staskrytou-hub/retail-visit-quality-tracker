import { describe, expect, it } from "vitest";
import { calculateScore, calculateScoreForQuestions, criticalQuestionWeightForAnswerCount, googleMapsDirectionsUrl, isCriticalQuestionText, normalizeMpcs, scoreWeightsForAnswerCount } from "@/lib/logic";

describe("wynik wizyty", () => {
  it("liczy pytanie krytyczne w skróconej wizycie jako 40%", () => expect(calculateScore([false,true,true,true,true,true])).toBe(60));
  it("rozdziela pozostałe punkty skróconej wizyty po 12%", () => expect(calculateScore([true,true,false,true,false,true])).toBe(76));
  it("liczy pełny wynik", () => expect(calculateScore([true,true,true,true,true,true])).toBe(100));
  it("liczy pytanie krytyczne w rozszerzonej wizycie jako 20%", () => expect(calculateScore([true,true,true,true,false,true,true,true,true,true])).toBe(80));
  it("liczy pytania 9 i 10 rozszerzonej wizyty po 5%", () => expect(calculateScore([true,true,true,true,true,true,true,true,false,false])).toBe(90));
  it("liczy wynik wizyty rozszerzonej według pełnego zestawu wag", () => expect(calculateScore([true,true,true,true,true,false,false,false,false,false])).toBe(60));
  it("zachowuje wagę krytyczną historycznej wizyty niezależnie od numeru pytania", () => {
    const answers = Array.from({length:10},(_,index)=>({number:index+1,text:index===1?"Czy Sprzedawca zaproponował Ci dodatkowy produkt?":`Pytanie ${index+1}`,answer:index!==1}));
    expect(calculateScoreForQuestions(answers)).toBe(80);
  });
  it("utrzymuje sumę wag równą 100%", () => {
    expect(scoreWeightsForAnswerCount(6).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    expect(scoreWeightsForAnswerCount(10).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });
  it("zwraca właściwą wagę krytycznego pytania dla rodzaju wizyty", () => {
    expect(criticalQuestionWeightForAnswerCount(6)).toBe(40);
    expect(criticalQuestionWeightForAnswerCount(10)).toBe(20);
  });
  it("rozpoznaje pytanie krytyczne po treści", () => expect(isCriticalQuestionText("Czy Sprzedawca zaproponował Ci dodatkowy produkt?")).toBe(true));
  it("wymaga sześciu albo dziesięciu odpowiedzi", () => expect(() => calculateScore([true])).toThrow());
});

describe("normalizacja Store Code", () => {
  it("usuwa duplikaty, zachowuje zera i normalizuje wielkość", () => expect(normalizeMpcs([" d1002 ","D1002","dx788"])).toEqual(["D1002","DX788"]));
  it("akceptuje Store Code wpisane z myślnikami", () => expect(normalizeMpcs(["d-10-03", " DX-802 "])).toEqual(["D1003", "DX802"]));
});

describe("nawigacja Google Maps", () => {
  it("buduje trasę samochodową do adresu sklepu", () => expect(googleMapsDirectionsUrl("Demo City", "Example Street 5")).toBe("https://www.google.com/maps/dir/?api=1&destination=Example%20Street%205%2C%20Demo%20City%2C%20Polska&travelmode=driving"));
    it("buduje trasę dla syntetycznego sklepu", () => expect(googleMapsDirectionsUrl("Demo City", "Example Street 9", "D1009")).toBe("https://www.google.com/maps/dir/?api=1&destination=Example%20Street%209%2C%20Demo%20City%2C%20Polska&travelmode=driving"));
});
