import { describe,expect,it } from "vitest";
import { EXTENDED_QUESTIONS,QUESTIONS } from "@/lib/constants";
import { recommendationsForAnswers } from "@/lib/visit-recommendations";

describe("rodzaje wizyt",()=>{
  it("ma 6 pytań skróconych i 10 kolejno ponumerowanych pytań rozszerzonych",()=>{
    expect(QUESTIONS).toHaveLength(6);
    expect(EXTENDED_QUESTIONS).toHaveLength(10);
    expect(EXTENDED_QUESTIONS.map(question=>question.number)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    expect(EXTENDED_QUESTIONS.map(question=>question.sourceNumber)).toEqual([1,2,3,4,5,6,7,8,9,11]);
  });

  it("dobiera rekomendację rozszerzoną na podstawie treści pytania",()=>{
    const question=EXTENDED_QUESTIONS.find(item=>item.sourceNumber===7)!;
    expect(recommendationsForAnswers([{...question,answer:false}])[0].title).toBe("Standard wyglądu");
  });
});
