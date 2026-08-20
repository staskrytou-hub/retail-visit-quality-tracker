import { describe, expect, it } from "vitest";
import { conclusionForAnswers, recommendationsForAnswers } from "@/lib/visit-recommendations";

describe("visit recommendations", () => {
  it("creates recommendations only for negative answers", () => {
    const recommendations = recommendationsForAnswers([{number:1,answer:1},{number:2,answer:0},{number:5,answer:false}]);
    expect(recommendations.map(item => item.title)).toEqual(["Loyalty app", "First contact"]);
  });

  it("recommends maintaining the standard for a full score", () => {
    expect(recommendationsForAnswers([{number:1,answer:true}])[0].title).toBe("Maintain the standard");
  });

  it("summarizes strengths and improvement areas", () => {
    const conclusion = conclusionForAnswers([{number:3,answer:1},{number:6,answer:0}], 50);
    expect(conclusion.strengths).toContain("product availability");
    expect(conclusion.improvements).toContain("package return handling");
  });

  it("recognizes both current English and historical Polish critical wording", () => {
    expect(recommendationsForAnswers([{number:99,answer:false,text:"Did the seller offer an additional product?"}])[0].title).toBe("Active selling");
    expect(recommendationsForAnswers([{number:99,answer:false,text:"Czy Sprzedawca zaproponował Ci dodatkowy produkt?"}])[0].title).toBe("Active selling");
  });
});

