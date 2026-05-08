import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const saved = localStorage.getItem('i18nextLng');
const lng = saved === 'en' ? 'en' : 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng,
  fallbackLng: 'vi',
  supportedLngs: ['vi', 'en'],
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (l) => {
  localStorage.setItem('i18nextLng', l);
});

export default i18n;
