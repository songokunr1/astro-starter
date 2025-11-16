export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "pl", label: "Polish (pl)" },
  { value: "en", label: "English (en)" },
  { value: "de", label: "German (de)" },
  { value: "es", label: "Spanish (es)" },
  { value: "fr", label: "French (fr)" },
  { value: "it", label: "Italian (it)" },
];

export function getLanguageLabel(value: string | undefined | null) {
  if (!value) {
    return "—";
  }

  const option = LANGUAGE_OPTIONS.find((item) => item.value === value);
  return option ? option.label : value;
}

export function getQuestionPrefix(languageCode: string) {
  const normalized = languageCode.trim().slice(0, 2).toLowerCase();

  switch (normalized) {
    case "pl":
      return "Jakie jest kluczowe zagadnienie";
    case "es":
      return "¿Cuál es el punto clave";
    case "de":
      return "Was ist der Kernpunkt";
    case "fr":
      return "Quel est le point clé";
    case "it":
      return "Qual è il punto chiave";
    default:
      return "What is the key point";
  }
}

