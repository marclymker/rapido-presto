import React from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = [
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ht', label: 'HT', flag: '🇭🇹' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.substring(0, 2) || 'fr';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LANGS.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
            current === lang.code
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title={lang.label}
        >
          <span>{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );
}