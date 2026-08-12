
// The 6 languages this app actually ships real, hand-written UI text for.
// No live translation service involved — see src/language/translations.js
// for the copy itself. `dir` drives the page's text direction (Arabic and
// Urdu are right-to-left).
 
export const languages = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
  { code: 'tl', name: 'Filipino', native: 'Filipino', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', native: 'اردو', dir: 'rtl' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', dir: 'ltr' },
]
 
export function getLanguage(code) {
  return languages.find((l) => l.code === code) || languages[0]
}
 