import { useSettingsStore } from '../store/settingsStore';
import { translations } from './translations';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations.en>;

export const useTranslation = () => {
  const { language } = useSettingsStore();
  
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        let fallback: any = translations.en;
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object') {
            fallback = fallback[fk];
          }
        }
        value = fallback;
        break;
      }
    }
    
    // If value is still not found, return the key
    if (!value || typeof value !== 'string') {
      return key;
    }
    
    // Replace parameters like {{days}} with actual values
    if (params) {
      return Object.entries(params).reduce((result, [param, val]) => {
        return result.replace(new RegExp(`{{${param}}}`, 'g'), String(val));
      }, value);
    }
    
    return value;
  };
  
  return { t, language };
};
