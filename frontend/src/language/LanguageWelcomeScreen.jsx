import { useState, useEffect } from 'preact/hooks'
import { languages } from './languages'
import governmentLogo from '../assets/government-dubai-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'
import './language.css'

const ROTATE_MS = 2600

// Self-contained copy for THIS screen only, in every language the app
// ships — so the very first thing a person sees already proves the
// platform speaks their language, instead of a screen that's English
// no matter what you're about to pick.
const COPY = {
  en: { eyebrow: 'GDRFA DUBAI • AI PLATFORM', title: 'Welcome to the GDRFA AI Platform', subtitle: 'Choose your language to continue.', continueLabel: 'Continue in {name} →', chooseLabel: 'Choose a language to continue' },
  ar: { eyebrow: 'جي دي آر إف إيه دبي • منصة الذكاء الاصطناعي', title: 'مرحباً بك في منصة جي دي آر إف إيه الذكية', subtitle: 'اختر لغتك للمتابعة.', continueLabel: 'المتابعة باللغة {name} ←', chooseLabel: 'اختر لغة للمتابعة' },
  hi: { eyebrow: 'जीडीआरएफए दुबई • एआई प्लेटफॉर्म', title: 'जीडीआरएफए एआई प्लेटफॉर्म में आपका स्वागत है', subtitle: 'जारी रखने के लिए अपनी भाषा चुनें।', continueLabel: '{name} में जारी रखें →', chooseLabel: 'जारी रखने के लिए एक भाषा चुनें' },
  tl: { eyebrow: 'GDRFA DUBAI • AI PLATFORM', title: 'Maligayang pagdating sa GDRFA AI Platform', subtitle: 'Piliin ang iyong wika para magpatuloy.', continueLabel: 'Magpatuloy sa {name} →', chooseLabel: 'Pumili ng wika para magpatuloy' },
  ur: { eyebrow: 'جی ڈی آر ایف اے دبئی • اے آئی پلیٹ فارم', title: 'جی ڈی آر ایف اے اے آئی پلیٹ فارم میں خوش آمدید', subtitle: 'جاری رکھنے کے لیے اپنی زبان منتخب کریں۔', continueLabel: '{name} میں جاری رکھیں ←', chooseLabel: 'جاری رکھنے کے لیے ایک زبان منتخب کریں' },
  bn: { eyebrow: 'জিডিআরএফএ দুবাই • এআই প্ল্যাটফর্ম', title: 'জিডিআরএফএ এআই প্ল্যাটফর্মে স্বাগতম', subtitle: 'চালিয়ে যেতে আপনার ভাষা বেছে নিন।', continueLabel: '{name}-এ চালিয়ে যান →', chooseLabel: 'চালিয়ে যেতে একটি ভাষা বেছে নিন' },
}

export function LanguageWelcomeScreen({ onConfirm }) {
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [rotateIndex, setRotateIndex] = useState(0)

  // Cycle the headline through every language this app actually ships,
  // so it's visibly multilingual from the very first second — not a
  // static English screen with a picker buried in it. Stops once
  // someone has actually picked a language.
  useEffect(() => {
    if (selected) return
    const id = setInterval(() => {
      setRotateIndex((i) => (i + 1) % languages.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [selected])

  const activeCode = selected ? selected.code : languages[rotateIndex].code
  const activeLang = selected || languages[rotateIndex]
  const copy = COPY[activeCode] || COPY.en

  function toggleOpen() {
    setOpen((o) => !o)
  }

  function selectLanguage(lang) {
    setSelected(lang)
    setOpen(false)
  }

  function handleConfirm() {
    if (selected) onConfirm(selected)
  }

  return (
    <div class="lw-page">
      <div class="lw-header">
        <img src={governmentLogo} alt="Government of Dubai" class="lw-header-logo" />
        <img src={gdrfaLogo} alt="GDRFA Dubai" class="lw-header-logo" />
      </div>

      <div class="lw-body">
        {/* Always-visible, never-rotating label — so it's obvious at a
            glance that this is the language-selection screen, no matter
            which language the headline below happens to be cycling
            through at that moment. */}
        <p class="lw-badge">🌐 Select Your Language</p>

        <div class="lw-intro" dir={activeLang.dir}>
          <p class="lw-eyebrow lw-rotate" key={`eyebrow-${activeCode}`}>{copy.eyebrow}</p>
          <h1 class="lw-rotate" key={`title-${activeCode}`}>{copy.title}</h1>
          <p class="lw-subtitle lw-rotate" key={`subtitle-${activeCode}`}>{copy.subtitle}</p>
        </div>

        <div class="lw-picker">
          <div
            class={`lw-sphere ${open ? 'split' : ''} ${selected ? 'chosen' : ''}`}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label={selected ? selected.name : 'Click me'}
            onClick={toggleOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleOpen()
              }
            }}
          >
            <div class="lw-sphere-inner">
              {selected ? (
                <>
                  <strong>{selected.native}</strong>
                  <span>{selected.name}</span>
                </>
              ) : (
                <span class="lw-sphere-click">Click me</span>
              )}
            </div>
          </div>

          {/* Buttons open downward in normal document flow — two per
              row, three rows — so nothing needs to scroll and it
              doesn't float over the heading above. */}
          {open && (
            <div class="lw-button-grid">
              {languages.map((lang) => (
                <button
                  type="button"
                  key={lang.code}
                  class={`lw-lang-button ${selected?.code === lang.code ? 'active' : ''}`}
                  onClick={() => selectLanguage(lang)}
                >
                  <span class="lw-lang-names">
                    <strong>{lang.native}</strong>
                    <span>{lang.name}</span>
                  </span>
                  <span class="lw-lang-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" class="lw-confirm" disabled={!selected} onClick={handleConfirm}>
          {selected ? copy.continueLabel.replace('{name}', selected.name) : copy.chooseLabel}
        </button>
      </div>
    </div>
  )
}
