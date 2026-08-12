import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import { translations } from './translations'
import { chatText } from './chatTranslations'
import { bookingText } from './bookingTranslations'
import { humanitarianText } from './humanitarianTranslations'
import { assistantText } from './assistantTranslations'
import { getLanguage } from './languages'

export const LanguageContext = createContext({
  code: 'en',
  dir: 'ltr',
  t: translations.en,
  chat: chatText.en,
  booking: bookingText.en,
  humanitarian: humanitarianText.en,
  assistant: assistantText.en,
})

export function useLanguage() {
  return useContext(LanguageContext)
}

export function buildLanguageContextValue(code) {
  const lang = getLanguage(code)
  return {
    code: lang.code,
    dir: lang.dir,
    // Falls back to English for any key a translation file hasn't caught
    // up on yet, so a missing translation never breaks the page — it
    // just shows English for that one string until it's filled in.
    t: { ...translations.en, ...translations[lang.code] },
    chat: { ...chatText.en, ...chatText[lang.code] },
    booking: { ...bookingText.en, ...bookingText[lang.code] },
    humanitarian: { ...humanitarianText.en, ...humanitarianText[lang.code] },
    assistant: { ...assistantText.en, ...assistantText[lang.code] },
  }
}
