import { describe, expect, it } from "vitest";
import { conclusionForAnswers, recommendationsForAnswers } from "@/lib/visit-recommendations";

describe("rekomendacje wizyty", () => {
  it("tworzy rekomendacje wyłącznie dla odpowiedzi Nie", () => {
    const recommendations = recommendationsForAnswers([{number:1,answer:1},{number:2,answer:0},{number:5,answer:false}]);
    expect(recommendations.map(item => item.title)).toEqual(["Aplikacja lojalnościowa", "Pierwszy kontakt"]);
  });

  it("przy pełnym wyniku zaleca utrzymanie standardu", () => {
    expect(recommendationsForAnswers([{number:1,answer:true}])[0].title).toBe("Utrzymanie standardu");
  });

  it("podsumowuje mocne i słabe obszary", () => {
    const conclusion = conclusionForAnswers([{number:3,answer:1},{number:6,answer:0}], 50);
    expect(conclusion.strengths).toContain("dostępność towaru");
    expect(conclusion.improvements).toContain("zwrotu opakowań");
  });
});
