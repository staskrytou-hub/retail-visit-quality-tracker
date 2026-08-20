import { describe, expect, it } from "vitest";
import { calculateScore, calculateScoreForQuestions, criticalQuestionWeightForAnswerCount, googleMapsDirectionsUrl, isCriticalQuestionText, normalizeMpcs, scoreWeightsForAnswerCount } from "@/lib/logic";

describe("visit scoring", () => {
  it("weights the critical question at 40% in a short visit", () => expect(calculateScore([false,true,true,true,true,true])).toBe(60));
  it("splits the remaining short-visit points into 12% weights", () => expect(calculateScore([true,true,false,true,false,true])).toBe(76));
  it("calculates a full score", () => expect(calculateScore([true,true,true,true,true,true])).toBe(100));
  it("weights the critical question at 20% in an extended visit", () => expect(calculateScore([true,true,true,true,false,true,true,true,true,true])).toBe(80));
  it("weights questions 9 and 10 at 5% each", () => expect(calculateScore([true,true,true,true,true,true,true,true,false,false])).toBe(90));
  it("uses the full extended-visit weight set", () => expect(calculateScore([true,true,true,true,true,false,false,false,false,false])).toBe(60));
  it("preserves critical weighting for historical Polish visits regardless of question number", () => {
    const answers = Array.from({length:10},(_,index)=>({number:index+1,text:index===1?"Czy Sprzedawca zaproponował Ci dodatkowy produkt?":`Question ${index+1}`,answer:index!==1}));
    expect(calculateScoreForQuestions(answers)).toBe(80);
  });
  it("recognizes the current English critical question", () => expect(isCriticalQuestionText("Did the seller offer you an additional product?")).toBe(true));
  it("recognizes the historical Polish critical question", () => expect(isCriticalQuestionText("Czy Sprzedawca zaproponował Ci dodatkowy produkt?")).toBe(true));
  it("keeps every score-weight set at 100%", () => {
    expect(scoreWeightsForAnswerCount(6).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    expect(scoreWeightsForAnswerCount(10).reduce((sum, weight) => sum + weight, 0)).toBe(100);
  });
  it("returns the correct critical weight for each visit type", () => {
    expect(criticalQuestionWeightForAnswerCount(6)).toBe(40);
    expect(criticalQuestionWeightForAnswerCount(10)).toBe(20);
  });
  it("requires exactly six or ten answers", () => expect(() => calculateScore([true])).toThrow());
});

describe("Store Code normalization", () => {
  it("removes duplicates, preserves zeros, and normalizes case", () => expect(normalizeMpcs([" d1002 ","D1002","dx788"])).toEqual(["D1002","DX788"]));
  it("accepts Store Codes entered with dashes", () => expect(normalizeMpcs(["d-10-03", " DX-802 "])).toEqual(["D1003", "DX802"]));
});

describe("Google Maps navigation", () => {
  it("builds a driving route to a store address", () => expect(googleMapsDirectionsUrl("Demo City", "Example Street 5")).toBe("https://www.google.com/maps/dir/?api=1&destination=Example%20Street%205%2C%20Demo%20City%2C%20Poland&travelmode=driving"));
  it("builds a route for a synthetic store", () => expect(googleMapsDirectionsUrl("Demo City", "Example Street 9", "D1009")).toBe("https://www.google.com/maps/dir/?api=1&destination=Example%20Street%209%2C%20Demo%20City%2C%20Poland&travelmode=driving"));
});
