export type RecommendationAnswer = { number:number;answer:number|boolean;text?:string };

type RecommendationArea = { label:string;title:string;recommendation:string };

const definedAreas={
  additional:{label:"additional sales",title:"Active selling",recommendation:"Remind the team to consistently offer an additional product during each transaction."},
  app:{label:"loyalty app promotions",title:"Loyalty app",recommendation:"Strengthen active communication about promotions and benefits available in the loyalty app."},
  stock:{label:"product availability",title:"Product availability",recommendation:"Verify availability of key categories and replenish gaps in line with the sales plan."},
  farewell:{label:"polite farewell",title:"Service standard",recommendation:"Practice a consistent, polite farewell with the team after each customer interaction."},
  greeting:{label:"customer greeting",title:"First contact",recommendation:"Implement a consistent greeting for every customer and reinforce the first-contact standard."},
  returns:{label:"package return handling",title:"Returns handling",recommendation:"Verify that the station and procedure for package returns are ready and understood."},
  appearance:{label:"neat and professional appearance",title:"Appearance standard",recommendation:"Reinforce the neat, professional appearance standard and verify it on every shift."},
  cleanliness:{label:"store cleanliness",title:"Store cleanliness",recommendation:"Introduce regular checks of the store surroundings and interior, with confirmation that the checks were completed."},
  professionalism:{label:"professional and efficient service",title:"Service professionalism",recommendation:"Review the standard for polite and efficient service with the team, avoiding unnecessary customer waiting."},
  selfCheckout:{label:"self-checkout readiness",title:"Self-checkout",recommendation:"Ensure the self-checkout station is available and ready during periods of higher traffic."},
} satisfies Record<string,RecommendationArea>;

const shortAreas:Record<number,RecommendationArea>={
  1:definedAreas.additional,
  2:definedAreas.app,
  3:definedAreas.stock,
  4:definedAreas.farewell,
  5:definedAreas.greeting,
  6:definedAreas.returns,
};

function areaForAnswer(answer:RecommendationAnswer) {
  const text=(answer.text||"").toLocaleLowerCase("en-US");
  if(text.includes("additional product"))return definedAreas.additional;
  if(text.includes("loyalty app"))return definedAreas.app;
  if(text.includes("available")||text.includes("displayed")||text.includes("stock"))return definedAreas.stock;
  if(text.includes("farewell"))return definedAreas.farewell;
  if(text.includes("greet"))return definedAreas.greeting;
  if(text.includes("package return"))return definedAreas.returns;
  if(text.includes("neat")||text.includes("work clothing")||text.includes("appearance"))return definedAreas.appearance;
  if(text.includes("clean")||text.includes("surroundings")||text.includes("interior"))return definedAreas.cleanliness;
  if(text.includes("professionally")||text.includes("politely")||text.includes("efficiently"))return definedAreas.professionalism;
  if(text.includes("self-checkout"))return definedAreas.selfCheckout;
  return shortAreas[answer.number];
}

export function recommendationsForAnswers(answers:RecommendationAnswer[]) {
  const failed=answers.filter(item=>!Boolean(item.answer));
  if(!failed.length)return [{title:"Maintain the standard",text:"Maintain the current level of standards and continue regular service-quality monitoring."}];
  return failed.map(item=>{const area=areaForAnswer(item);return {title:area?.title||"Corrective action",text:area?.recommendation||"Review the issue with the team and implement a corrective action."}});
}

export function conclusionForAnswers(answers:RecommendationAnswer[],score:number) {
  const passed=answers.filter(item=>Boolean(item.answer)).map(item=>areaForAnswer(item)?.label).filter(Boolean);
  const failed=answers.filter(item=>!Boolean(item.answer)).map(item=>areaForAnswer(item)?.label).filter(Boolean);
  const roundedScore=Math.round(score);
  const status=roundedScore>=83?"The store meets most of the assessed standards at a good level.":roundedScore>=67?"The score indicates partial compliance and a need for targeted improvement.":"The score requires urgent corrective action and follow-up verification.";
  const strengths=passed.length?`Strengths: ${passed.join(", ")}.`:"No assessed standard was fully confirmed.";
  const improvements=failed.length?`Areas to improve: ${failed.join(", ")}.`:"No areas requiring corrective action were identified.";
  return {status,strengths,improvements};
}
