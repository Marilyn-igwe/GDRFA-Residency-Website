import { useState, useEffect, useRef } from 'preact/hooks'
import { languages } from './languages'
import governmentLogo from '../assets/government-dubai-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'
import './language.css'

const SETTLE_DELAY_MS = 400
const ROTATE_MS = 2600

// Self-contained copy for THIS screen only, in every language the app
// ships — so the very first thing a person sees already proves the
// platform speaks their language, instead of a screen that's English
// no matter what you're about to pick.
const COPY = {
  en: { eyebrow: 'GDRFA DUBAI • AI PLATFORM', title: 'Welcome to the GDRFA AI Platform', subtitle: 'Choose your language to continue.', placeholder: 'Type a language — English, Arabic, Hindi...', noMatch: "That language isn't available yet — pick one of the options below instead.", spherePlaceholder: 'Start typing or choose below', searching: 'Searching…', continueLabel: 'Continue in {name} →', chooseLabel: 'Choose a language to continue' },
  ar: { eyebrow: 'جي دي آر إف إيه دبي • منصة الذكاء الاصطناعي', title: 'مرحباً بك في منصة جي دي آر إف إيه الذكية', subtitle: 'اختر لغتك للمتابعة.', placeholder: 'اكتب اسم لغة — العربية، الإنجليزية، الهندية...', noMatch: 'هذه اللغة غير متاحة بعد — اختر إحدى الخيارات أدناه.', spherePlaceholder: 'ابدأ الكتابة أو اختر أدناه', searching: 'جارِ البحث…', continueLabel: 'المتابعة باللغة {name} ←', chooseLabel: 'اختر لغة للمتابعة' },
  hi: { eyebrow: 'जीडीआरएफए दुबई • एआई प्लेटफॉर्म', title: 'जीडीआरएफए एआई प्लेटफॉर्म में आपका स्वागत है', subtitle: 'जारी रखने के लिए अपनी भाषा चुनें।', placeholder: 'एक भाषा टाइप करें — हिन्दी, अंग्रेज़ी, अरबी...', noMatch: 'यह भाषा अभी उपलब्ध नहीं है — नीचे दिए गए विकल्पों में से एक चुनें।', spherePlaceholder: 'टाइप करना शुरू करें या नीचे चुनें', searching: 'खोजा जा रहा है…', continueLabel: '{name} में जारी रखें →', chooseLabel: 'जारी रखने के लिए एक भाषा चुनें' },
  tl: { eyebrow: 'GDRFA DUBAI • AI PLATFORM', title: 'Maligayang pagdating sa GDRFA AI Platform', subtitle: 'Piliin ang iyong wika para magpatuloy.', placeholder: 'Mag-type ng wika — Filipino, English, Arabic...', noMatch: 'Hindi pa available ang wikang iyon — pumili na lang sa mga opsyon sa ibaba.', spherePlaceholder: 'Simulan ang pag-type o pumili sa ibaba', searching: 'Naghahanap…', continueLabel: 'Magpatuloy sa {name} →', chooseLabel: 'Pumili ng wika para magpatuloy' },
  ur: { eyebrow: 'جی ڈی آر ایف اے دبئی • اے آئی پلیٹ فارم', title: 'جی ڈی آر ایف اے اے آئی پلیٹ فارم میں خوش آمدید', subtitle: 'جاری رکھنے کے لیے اپنی زبان منتخب کریں۔', placeholder: 'زبان لکھیں — اردو، انگریزی، عربی...', noMatch: 'یہ زبان ابھی دستیاب نہیں ہے — نیچے دیے گئے اختیارات میں سے کوئی ایک منتخب کریں۔', spherePlaceholder: 'لکھنا شروع کریں یا نیچے سے منتخب کریں', searching: 'تلاش کیا جا رہا ہے…', continueLabel: '{name} میں جاری رکھیں ←', chooseLabel: 'جاری رکھنے کے لیے ایک زبان منتخب کریں' },
  bn: { eyebrow: 'জিডিআরএফএ দুবাই • এআই প্ল্যাটফর্ম', title: 'জিডিআরএফএ এআই প্ল্যাটফর্মে স্বাগতম', subtitle: 'চালিয়ে যেতে আপনার ভাষা বেছে নিন।', placeholder: 'একটি ভাষা লিখুন — বাংলা, ইংরেজি, আরবি...', noMatch: 'এই ভাষাটি এখনও উপলব্ধ নয় — নিচের বিকল্পগুলি থেকে একটি বেছে নিন।', spherePlaceholder: 'টাইপ করা শুরু করুন অথবা নিচে থেকে বেছে নিন', searching: 'অনুসন্ধান করা হচ্ছে…', continueLabel: '{name}-এ চালিয়ে যান →', chooseLabel: 'চালিয়ে যেতে একটি ভাষা বেছে নিন' },
}

function matchLanguage(query) {
  const q = query.trim().toLowerCase()
  if (!q) return null
  return languages.find(
    (l) => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q)
  )
}

export function LanguageWelcomeScreen({ onConfirm }) {
  const [query, setQuery] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [matched, setMatched] = useState(null)
  const [noMatch, setNoMatch] = useState(false)
  const [rotateIndex, setRotateIndex] = useState(0)
  const settleTimer = useRef(null)

  // Cycle the headline through every language this app actually ships,
  // so it's visibly multilingual from the very first second — not a
  // static English screen with a dropdown buried in it.
  useEffect(() => {
    if (matched || query.trim()) return
    const id = setInterval(() => {
      setRotateIndex((i) => (i + 1) % languages.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [matched, query])

  const activeCode = matched ? matched.code : languages[rotateIndex].code
  const activeLang = matched || languages[rotateIndex]
  const copy = COPY[activeCode] || COPY.en

  useEffect(() => {
    if (!query.trim()) {
      setSpinning(false)
      setMatched(null)
      setNoMatch(false)
      return
    }

    setSpinning(true)
    setNoMatch(false)
    clearTimeout(settleTimer.current)

    settleTimer.current = setTimeout(() => {
      const result = matchLanguage(query)
      setMatched(result)
      setNoMatch(!result)
      setSpinning(false)
    }, SETTLE_DELAY_MS)

    return () => clearTimeout(settleTimer.current)
  }, [query])

  function selectLanguage(lang) {
    setQuery(lang.name)
    setMatched(lang)
    setNoMatch(false)
    setSpinning(false)
  }

  function handleConfirm() {
    if (matched) onConfirm(matched)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && matched) handleConfirm()
  }

  return (
    <div class="lw-page">
      <div class="lw-header">
        <img src={governmentLogo} alt="Government of Dubai" class="lw-header-logo" />
        <img src={gdrfaLogo} alt="GDRFA Dubai" class="lw-header-logo" />
      </div>

      <div class="lw-body">
        <div class="lw-left" dir={activeLang.dir}>
          <p class="lw-eyebrow lw-rotate" key={`eyebrow-${activeCode}`}>{copy.eyebrow}</p>
          <h1 class="lw-rotate" key={`title-${activeCode}`}>{copy.title}</h1>
          <p class="lw-subtitle lw-rotate" key={`subtitle-${activeCode}`}>{copy.subtitle}</p>

          <input
            type="text"
            class="lw-input"
            dir="auto"
            placeholder={copy.placeholder}
            value={query}
            onInput={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {noMatch && (
            <p class="lw-no-match">{copy.noMatch}</p>
          )}

          <div class="lw-tile-grid">
            {languages.map((lang) => (
              <button
                type="button"
                key={lang.code}
                class={`lw-tile ${matched?.code === lang.code ? 'active' : ''}`}
                onClick={() => selectLanguage(lang)}
              >
                <strong>{lang.native}</strong>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>

          <button type="button" class="lw-confirm" disabled={!matched} onClick={handleConfirm}>
            {matched ? copy.continueLabel.replace('{name}', matched.name) : copy.chooseLabel}
          </button>
        </div>

        <div class="lw-right">
          <div class={`lw-sphere ${spinning ? 'spinning' : ''}`}>
            <div class="lw-sphere-inner" dir={activeLang.dir}>
              {spinning ? (
                <span class="lw-sphere-searching">{copy.searching}</span>
              ) : matched ? (
                <>
                  <strong>{matched.native}</strong>
                  <span>{matched.name}</span>
                </>
              ) : (
                <span class="lw-sphere-placeholder lw-rotate" key={`sphere-${activeCode}`}>
                  {languages[rotateIndex].native} · {copy.spherePlaceholder}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
