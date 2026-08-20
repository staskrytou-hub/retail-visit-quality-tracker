import { describe,expect,it } from "vitest";
import { EXTENDED_QUESTIONS,QUESTIONS } from "@/lib/constants";
import { recommendationsForAnswers } from "@/lib/visit-recommendations";

describe("visit types",()=>{
  it("has six short questions and ten sequential extended questions",()=>{
    expect(QUESTIONS).toHaveLength(6);
    expect(EXTENDED_QUESTIONS).toHaveLength(10);
    expect(EXTENDED_QUESTIONS.map(question=>question.number)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    expect(EXTENDED_QUESTIONS.map(question=>question.sourceNumber)).toEqual([1,2,3,4,5,6,7,8,9,11]);
  });

  it("selects an extended recommendation from question text",()=>{
    const question=EXTENDED_QUESTIONS.find(item=>item.sourceNumber===7)!;
    expect(recommendationsForAnswers([{...question,answer:false}])[0].title).toBe("Appearance standard");
  });
});

