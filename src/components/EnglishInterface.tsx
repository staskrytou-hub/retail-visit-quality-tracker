"use client";

import { useEffect } from "react";

const EXACT: Record<string, string> = {
  "Zaloguj się": "Sign in",
  "Bezpieczny dostęp do wizyt operacyjnych i wyników struktury.": "Secure access to operational visits and quality results.",
  "Hasło": "Password",
  "Logowanie…": "Signing in…",
  "Resetuj hasło": "Reset password",
  "Rejon do resetu": "Region to reset",
  "Powtórz rejon dla potwierdzenia": "Repeat the region to confirm",
  "Resetowanie…": "Resetting…",
  "Zresetuj hasło": "Reset password",
  "Wpisz ten sam rejon w obu polach": "Enter the same region in both fields",
  "Hasło zostało zresetowane do hasła demonstracyjnego.": "The password has been reset to the demo password.",
  "Nie udało się zresetować hasła": "Password reset failed",
  "Błąd logowania": "Sign-in failed",
  "Wystąpił błąd": "An error occurred",
  "Zdjęcia są zbyt duże. Usuń jedno zdjęcie lub wybierz mniejsze pliki i spróbuj ponownie.": "The photos are too large. Remove one photo or choose smaller files and try again.",
  "Zmień hasło": "Change password",
  "Obecne hasło": "Current password",
  "Nowe hasło": "New password",
  "Powtórz nowe hasło": "Repeat new password",
  "Zapisz nowe hasło": "Save new password",
  "Nie udało się zmienić hasła": "Could not change the password",
  "Wizyty w tym tygodniu": "Visits this week",
  "Wizyty w poprzednim tygodniu": "Visits last week",
  "Pozostałe wizyty z ostatnich 30 dni": "Other visits from the last 30 days",
  "Wizyty od 31 do 60 dni": "Visits from 31 to 60 days ago",
  "Wizyty od 61 do 90 dni": "Visits from 61 to 90 days ago",
  "Wizyty od 91 do 180 dni": "Visits from 91 to 180 days ago",
  "Archiwum - starsze niż 180 dni": "Archive - older than 180 days",
  "Wizyta wykonana przez Ciebie": "Visit completed by you",
  "Brak zakończonych wizyt.": "No completed visits.",
  "Sklepy do wizyty": "Stores to visit",
  "Zlecone sklepy z gotową nawigacją. Każde zlecenie otwiera pełną wizytę rozszerzoną.": "Assigned stores with ready navigation. Each assignment opens a full extended visit.",
  "Nawigacja": "Navigation",
  "Rozpocznij": "Start",
  "Otworzyć nawigację": "Open navigation",
  "Warzywa i owoce": "Fruit and vegetables",
  "Pieczywo": "Bakery",
  "Dania gotowe i szybkie przekąski": "Ready meals and quick snacks",
  "Tak": "Yes",
  "Nie": "No",
  "Dalej": "Next",
  "Wstecz": "Back",
  "Zapisz": "Save",
  "Anuluj": "Cancel",
  "Usuń": "Delete",
  "Edytuj": "Edit",
  "Otwórz": "Open",
  "Zamknij": "Close",
  "Odśwież": "Refresh",
  "Pobierz PDF": "Download PDF",
  "Zdjęcia": "Photos",
  "Zdjęcie": "Photo",
  "Komentarz": "Comment",
  "Uwagi": "Notes",
  "Podsumowanie": "Summary",
  "Historia": "History",
  "Sklepy": "Stores",
  "Sklep": "Store",
  "Wizyty": "Visits",
  "Wizyta": "Visit",
  "Manager": "Manager",
  "Partner": "Partner",
  "Wynik": "Score",
  "Średnia": "Average",
  "Dzisiaj": "Today",
  "Ten tydzień": "This week",
  "Ostatnie wizyty": "Recent visits",
  "Brak danych": "No data",
  "Brak wizyt": "No visits",
  "Brak wyników": "No results",
  "Szukaj": "Search",
  "Wybierz": "Select",
  "Zakończ": "Complete",
  "Zakończ wizytę": "Complete visit",
  "Rozpocznij wizytę": "Start visit",
  "Wizyta krótka": "Short visit",
  "Wizyta rozszerzona": "Extended visit",
  "Pytanie": "Question",
  "Odpowiedź": "Answer",
  "Rekomendacje": "Recommendations",
  "Wnioski": "Conclusions",
};

const PHRASES: Array<[RegExp, string]> = [
  [/Czy na pewno zresetować hasło dla rejonu (.+?) do hasła demonstracyjnego\?/g, "Reset the password for region $1 to the demo password?"],
  [/Wizyty, zdjęcia i sklepy zostają bez zmian\./g, "Visits, photos and stores remain unchanged."],
  [/Witaj, (.+?)\. Przy pierwszym logowaniu ustaw własne hasło\. Zostanie bezpiecznie zapisane\./g, "Welcome, $1. Set your own password on first sign-in. It will be stored securely."],
  [/Wykonał:\s*/g, "Completed by: "],
  [/Rejon\s+/g, "Region "],
  [/Zlecił:\s*/g, "Assigned by: "],
  [/Otworzyć nawigację do sklepu (.+?) w Google Maps\?/g, "Open navigation to store $1 in Google Maps?"],
  [/\bsklepów\b/g, "stores"],
  [/\bsklep\b/g, "store"],
  [/\bdo wizyty\b/g, "to visit"],
  [/\bBrak\b/g, "No"],
  [/\bwizyt\b/g, "visits"],
  [/\bwizyta\b/gi, "visit"],
  [/\bwyników\b/g, "results"],
  [/\bwynik\b/gi, "score"],
  [/\bśrednia\b/gi, "average"],
  [/\bpunkt\b/gi, "store"],
  [/\bobsługa\b/gi, "service"],
  [/\bklienta\b/gi, "customer"],
  [/\bklientowi\b/gi, "customer"],
  [/\bpromocji\b/gi, "promotion"],
  [/\baplikacji lojalnościowej\b/gi, "loyalty app"],
  [/\bdodatkowy produkt\b/gi, "additional product"],
  [/\bprodukty\b/gi, "products"],
  [/\bdostępne\b/gi, "available"],
  [/\bczyste\b/gi, "clean"],
  [/\bprofesjonalnie\b/gi, "professionally"],
  [/\buprzejmie\b/gi, "politely"],
  [/\bsprawnie\b/gi, "efficiently"],
  [/\bpożegnaniem\b/gi, "farewell"],
  [/\bpowitanie\b/gi, "greeting"],
  [/\bzwrotu opakowań\b/gi, "package returns"],
  [/\bsamoobsługowe\b/gi, "self-checkout"],
  [/\bgotowe\b/gi, "ready"],
  [/\bKomentarz\b/g, "Comment"],
  [/\bZdjęcie\b/g, "Photo"],
  [/\bZdjęcia\b/g, "Photos"],
  [/\bNastępny\b/g, "Next"],
  [/\bPoprzedni\b/g, "Previous"],
];

function translateText(value: string) {
  if (!value || !/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(Czy|Wizy|Sklep|Rejon|Brak|Zapisz|Dalej|Wstecz|Hasło|Otwórz|Usuń|Wybierz|Rozpocznij|Zakończ|Pytanie|Odpowiedź)\b/.test(value)) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  let text = value.trim();
  if (EXACT[text]) return leading + EXACT[text] + trailing;
  for (const [pattern, replacement] of PHRASES) text = text.replace(pattern, replacement);
  return leading + text + trailing;
}

function translateElement(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) continue;
    const next = translateText(node.nodeValue ?? "");
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  if (root instanceof Element) {
    const elements = [root, ...Array.from(root.querySelectorAll("[placeholder],[title],[aria-label]"))];
    for (const element of elements) {
      for (const attr of ["placeholder", "title", "aria-label"]) {
        const value = element.getAttribute(attr);
        if (!value) continue;
        const next = translateText(value);
        if (next !== value) element.setAttribute(attr, next);
      }
    }
  }
}

export default function EnglishInterface() {
  useEffect(() => {
    document.documentElement.lang = "en";
    translateElement(document.body);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData" && record.target.nodeType === Node.TEXT_NODE) {
          const node = record.target as Text;
          const next = translateText(node.nodeValue ?? "");
          if (next !== node.nodeValue) node.nodeValue = next;
        }
        for (const added of Array.from(record.addedNodes)) {
          if (added.nodeType === Node.ELEMENT_NODE) translateElement(added as Element);
          if (added.nodeType === Node.TEXT_NODE) {
            const node = added as Text;
            const next = translateText(node.nodeValue ?? "");
            if (next !== node.nodeValue) node.nodeValue = next;
          }
        }
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });

    const originalConfirm = window.confirm.bind(window);
    const originalAlert = window.alert.bind(window);
    const originalPrompt = window.prompt.bind(window);
    window.confirm = message => originalConfirm(translateText(String(message)));
    window.alert = message => originalAlert(translateText(String(message)));
    window.prompt = (message, defaultValue) => originalPrompt(translateText(String(message)), defaultValue);

    return () => {
      observer.disconnect();
      window.confirm = originalConfirm;
      window.alert = originalAlert;
      window.prompt = originalPrompt;
    };
  }, []);

  return null;
}
