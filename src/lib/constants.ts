export const QUESTIONS = [
  { number: 1, sourceNumber: 5, text: "Czy obsługa zaproponowała klientowi dodatkowy produkt?" },
  { number: 2, sourceNumber: 4, text: "Czy obsługa poinformowała o promocji lub korzyściach w aplikacji lojalnościowej?" },
  { number: 3, sourceNumber: 2, text: "Czy kluczowe produkty były dostępne i odpowiednio wyeksponowane?" },
  { number: 4, sourceNumber: 6, text: "Czy obsługa zakończyła wizytę uprzejmym pożegnaniem?" },
  { number: 5, sourceNumber: 3, text: "Czy obsługa przywitała klienta?" },
  { number: 6, sourceNumber: 11, text: "Czy punkt był gotowy do obsługi zwrotu opakowań?" },
] as const;

export const EXTENDED_QUESTIONS = [
  { number: 1, sourceNumber: 1, text: "Czy otoczenie i wnętrze punktu były czyste?" },
  { number: 2, sourceNumber: 2, text: "Czy kluczowe produkty były dostępne i odpowiednio wyeksponowane?" },
  { number: 3, sourceNumber: 3, text: "Czy obsługa przywitała klienta?" },
  { number: 4, sourceNumber: 4, text: "Czy obsługa poinformowała o promocji lub korzyściach w aplikacji lojalnościowej?" },
  { number: 5, sourceNumber: 5, text: "Czy obsługa zaproponowała klientowi dodatkowy produkt?" },
  { number: 6, sourceNumber: 6, text: "Czy obsługa zakończyła wizytę uprzejmym pożegnaniem?" },
  { number: 7, sourceNumber: 7, text: "Czy obsługa wyglądała schludnie i miała profesjonalny strój roboczy?" },
  { number: 8, sourceNumber: 8, text: "Czy obsługa zachowywała się profesjonalnie, uprzejmie i sprawnie?" },
  { number: 9, sourceNumber: 9, text: "Czy stanowisko samoobsługowe było dostępne i gotowe do użycia?" },
  { number: 10, sourceNumber: 11, text: "Czy punkt był gotowy do obsługi zwrotu opakowań?" },
] as const;

export const PARTNERS = [
  { code: "REG1", login: "region1", name: "Demo Partner 1", expectedStores: 3 },
  { code: "REG2", login: "region2", name: "Demo Partner 2", expectedStores: 3 },
  { code: "REG3", login: "region3", name: "Demo Partner 3", expectedStores: 3 },
] as const;

export const INITIAL_PASSWORD = process.env.DEMO_INITIAL_PASSWORD || "demo1234";
export const SESSION_COOKIE = "retail_visit_session";
