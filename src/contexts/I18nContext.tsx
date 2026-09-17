import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ALLOWED_LANGUAGES, dictionaries, type Language } from '@/i18n/dictionaries';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = 'erp-language';

function resolveInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ALLOWED_LANGUAGES.includes(saved as Language)) return saved as Language;
    const browser = navigator.language?.toLowerCase() ?? '';
    if (browser.startsWith('en')) return 'en';
  } catch {
    // ignore
  }
  return 'pt';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const persistLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[language];
      let value = dict[key] ?? dictionaries.pt[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replaceAll(`{{${k}}}`, String(v));
        });
      }
      return value;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage: persistLanguage, t }),
    [language, persistLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}