export type RecommendationAnswer = { number:number;answer:number|boolean;text?:string };

type RecommendationArea = { label:string;title:string;recommendation:string };

const definedAreas={
  additional:{label:"sprzedaż dodatkowa",title:"Sprzedaż aktywna",recommendation:"Przypomnieć zespołowi standard proponowania produktu dodatkowego przy każdej transakcji."},
  app:{label:"promocje w aplikacji lojalnościowej",title:"Aplikacja lojalnościowa",recommendation:"Wzmocnić aktywne informowanie klientów o promocjach i korzyściach dostępnych w aplikacji lojalnościowej."},
  stock:{label:"dostępność towaru",title:"Dostępność towaru",recommendation:"Zweryfikować dostępność kluczowych kategorii i uzupełniać braki zgodnie z planem sprzedaży."},
  farewell:{label:"uprzejme pożegnanie",title:"Standard obsługi",recommendation:"Przećwiczyć z zespołem konsekwentne, uprzejme pożegnanie klienta po zakończeniu obsługi."},
  greeting:{label:"powitanie klienta",title:"Pierwszy kontakt",recommendation:"Wdrożyć konsekwentne powitanie każdego klienta i przypomnieć standard pierwszego kontaktu."},
  returns:{label:"obsługa zwrotu opakowań",title:"Obsługa zwrotów",recommendation:"Zweryfikować gotowość stanowiska i procedurę obsługi zwrotu opakowań."},
  appearance:{label:"schludny i profesjonalny wygląd",title:"Standard wyglądu",recommendation:"Przypomnieć standard schludnego, profesjonalnego wyglądu i zweryfikować jego stosowanie na każdej zmianie."},
  cleanliness:{label:"czystość punktu",title:"Czystość punktu",recommendation:"Wprowadzić regularną kontrolę czystości otoczenia i wnętrza punktu z potwierdzeniem wykonania."},
  professionalism:{label:"profesjonalna i sprawna obsługa",title:"Profesjonalizm obsługi",recommendation:"Omówić z zespołem standard uprzejmej i sprawnej obsługi bez zbędnego oczekiwania."},
  selfCheckout:{label:"gotowość stanowiska samoobsługowego",title:"Stanowisko samoobsługowe",recommendation:"Zapewnić dostępność i gotowość stanowiska samoobsługowego w godzinach wzmożonego ruchu."},
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
  const text=(answer.text||"").toLocaleLowerCase("pl-PL");
  if(text.includes("dodatkowy produkt"))return definedAreas.additional;
  if(text.includes("aplikacji lojalnościowej"))return definedAreas.app;
  if(text.includes("dostępne")||text.includes("wyeksponowane")||text.includes("zatowar"))return definedAreas.stock;
  if(text.includes("pożegn"))return definedAreas.farewell;
  if(text.includes("przywita"))return definedAreas.greeting;
  if(text.includes("zwrotu opakowań"))return definedAreas.returns;
  if(text.includes("schludnie")||text.includes("strój roboczy")||text.includes("wyglądała"))return definedAreas.appearance;
  if(text.includes("czyste")||text.includes("czystość")||text.includes("otoczenie"))return definedAreas.cleanliness;
  if(text.includes("profesjonalnie")||text.includes("uprzejmie")||text.includes("sprawnie"))return definedAreas.professionalism;
  if(text.includes("samoobsług"))return definedAreas.selfCheckout;
  return shortAreas[answer.number];
}

export function recommendationsForAnswers(answers:RecommendationAnswer[]) {
  const failed=answers.filter(item=>!Boolean(item.answer));
  if(!failed.length)return [{title:"Utrzymanie standardu",text:"Utrzymać obecny poziom realizacji standardów i kontynuować regularny monitoring jakości obsługi."}];
  return failed.map(item=>{const area=areaForAnswer(item);return {title:area?.title||"Działanie korygujące",text:area?.recommendation||"Omówić niezgodność z zespołem i wdrożyć działanie korygujące."}});
}

export function conclusionForAnswers(answers:RecommendationAnswer[],score:number) {
  const passed=answers.filter(item=>Boolean(item.answer)).map(item=>areaForAnswer(item)?.label).filter(Boolean);
  const failed=answers.filter(item=>!Boolean(item.answer)).map(item=>areaForAnswer(item)?.label).filter(Boolean);
  const roundedScore=Math.round(score);
  const status=roundedScore>=83?"Punkt realizuje większość kontrolowanych standardów na dobrym poziomie.":roundedScore>=67?"Wynik wskazuje na częściową realizację standardów i potrzebę ukierunkowanej poprawy.":"Wynik wymaga pilnych działań korygujących i ponownej weryfikacji standardów.";
  const strengths=passed.length?`Mocne strony: ${passed.join(", ")}.`:"Nie potwierdzono pełnej realizacji żadnego z kontrolowanych standardów.";
  const improvements=failed.length?`Do poprawy: ${failed.join(", ")}.`:"Nie stwierdzono obszarów wymagających działań korygujących.";
  return {status,strengths,improvements};
}
