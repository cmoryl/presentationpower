/**
 * Client-safe language list used by the demo translate control.
 *
 * Demo surfaces (homepage showreel, showcase gallery, print/social/event demos)
 * render content that never lands in the database, so they cannot use the
 * DB-backed `listLanguages` server function (which requires an authenticated
 * session). This static list mirrors the seeded `public.languages` rows.
 */
export type DemoLanguage = {
  id: string;
  label: string;
  native: string;
  rtl: boolean;
};

export const DEMO_LANGUAGES: DemoLanguage[] = [
  { id: "en", label: "English", native: "English", rtl: false },
  { id: "es", label: "Spanish", native: "Español", rtl: false },
  { id: "fr", label: "French", native: "Français", rtl: false },
  { id: "de", label: "German", native: "Deutsch", rtl: false },
  { id: "it", label: "Italian", native: "Italiano", rtl: false },
  { id: "pt-BR", label: "Portuguese (Brazil)", native: "Português", rtl: false },
  { id: "nl", label: "Dutch", native: "Nederlands", rtl: false },
  { id: "pl", label: "Polish", native: "Polski", rtl: false },
  { id: "sv", label: "Swedish", native: "Svenska", rtl: false },
  { id: "tr", label: "Turkish", native: "Türkçe", rtl: false },
  { id: "ja", label: "Japanese", native: "日本語", rtl: false },
  { id: "ko", label: "Korean", native: "한국어", rtl: false },
  { id: "zh-CN", label: "Chinese (Simplified)", native: "简体中文", rtl: false },
  { id: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文", rtl: false },
  { id: "ar", label: "Arabic", native: "العربية", rtl: true },
  { id: "he", label: "Hebrew", native: "עברית", rtl: true },
];

export function demoLanguage(id: string): DemoLanguage | undefined {
  return DEMO_LANGUAGES.find((l) => l.id === id);
}

export function isRtlDemoLanguage(id: string): boolean {
  return demoLanguage(id)?.rtl ?? false;
}
