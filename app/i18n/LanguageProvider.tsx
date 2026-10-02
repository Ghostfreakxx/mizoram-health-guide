"use client";

import { createContext, useContext, useState } from "react";
import type { Locale } from "./index";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };
const LanguageContext = createContext<Ctx>({ locale: "en", setLocale: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
