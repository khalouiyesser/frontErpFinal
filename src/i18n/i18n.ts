import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

export type Lang = 'fr' | 'en' | 'ar';

// ── Applique la font selon la langue ──────────────────────────────────────────
const applyLangSettings = (lang: Lang) => {
    const isAr = lang === 'ar';

    document.documentElement.lang = lang;
    document.documentElement.dir  = isAr ? 'rtl' : 'ltr';

    // Outfit pour FR/EN, Noto Sans Arabic pour AR
    if (isAr) {
        document.body.classList.add('font-arabic');
        document.body.classList.remove('font-latin');
        // Injection dynamique de la Google Font arabe si pas déjà chargée
        if (!document.getElementById('font-arabic-link')) {
            const link = document.createElement('link');
            link.id   = 'font-arabic-link';
            link.rel  = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&family=Cairo:wght@400;500;600;700;800&display=swap';
            document.head.appendChild(link);
        }
    } else {
        document.body.classList.add('font-latin');
        document.body.classList.remove('font-arabic');
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en },
            ar: { translation: ar },
        },
        fallbackLng: 'fr',
        lng: localStorage.getItem('kypro_lang') || 'fr',
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'kypro_lang',
        },
    });

export const setLanguage = (lang: Lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('kypro_lang', lang);
    applyLangSettings(lang);
};

// ── Applique au chargement initial ───────────────────────────────────────────
const storedLang = (localStorage.getItem('kypro_lang') || 'fr') as Lang;
applyLangSettings(storedLang);

export default i18n;