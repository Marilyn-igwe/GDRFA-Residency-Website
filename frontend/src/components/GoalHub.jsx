import { useState, useRef, useEffect } from 'preact/hooks'
import './goalhub.css'

// The "front door" of the whole app. One question, six answers, done.
//
// v2: instead of six equal-weight boxes competing for attention at once,
// this is a single featured panel (icon, title, full description, one
// clear "Continue" button) driven by a horizontal selector strip below
// it. Tapping or scrolling to a card in the strip makes it the featured
// one; tapping it again (or the strip already showing it selected)
// actually goes there. Arrow buttons and dot indicators exist so this
// works without ever needing to swipe/drag — direct tap on any card
// still works exactly like before, this is additive, not a trade-off.
//
// `t` is the translations object for the active language (t.goalHub).
// `onNavigate(action)` is called with one of:
//   'visa' | 'appointment' | 'family' | 'humanitarian' | 'status' | 'chat'
// The parent (App) decides what each of those actually opens.
export function GoalHub({ t, onNavigate }) {
  const gh = t.goalHub
  const [notSureOpen, setNotSureOpen] = useState(false)
  const [step, setStep] = useState(1) // 1 = who, 2 = what
  const [who, setWho] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const trackRef = useRef(null)
  const cardRefs = useRef([])

  const activeCard = gh.cards[activeIndex]

  function goToAction(action, originEl) {
    if (action === 'notsure') {
      setStep(1)
      setWho(null)
      setNotSureOpen(true)
      return
    }
    onNavigate(action)
  }

  function selectCard(i, e) {
    if (i === activeIndex) {
      goToAction(gh.cards[i].action, e?.currentTarget)
      return
    }
    setActiveIndex(i)
    cardRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  function step_(delta) {
    const next = Math.max(0, Math.min(gh.cards.length - 1, activeIndex + delta))
    setActiveIndex(next)
    cardRefs.current[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  function pickWho(value) {
    setWho(value)
    setStep(2)
  }

  function pickWhat(value) {
    let action = 'appointment'
    if (value === 'new' || value === 'renew') {
      action = who === 'family' ? 'family' : 'appointment'
    } else if (value === 'cancel') {
      action = 'appointment'
    } else {
      action = 'chat'
    }
    setNotSureOpen(false)
    onNavigate(action)
  }

  function closeModal() {
    setNotSureOpen(false)
  }

  return (
    <section class="goal-hub">
      <div class="goal-hub-inner">
        <p class="goal-hub-eyebrow">{gh.eyebrow}</p>
        <h1 class="goal-hub-title">{gh.title}</h1>
        <p class="goal-hub-subtitle">{gh.subtitle}</p>

        {/* Featured panel — reflects whichever card is currently active */}
        <div class="goal-featured" key={activeCard.action}>
          <span class={`goal-featured-badge ${activeIndex % 2 === 0 ? 'badge-gold' : 'badge-maroon'}`}>
            <span aria-hidden="true">{activeCard.icon}</span>
          </span>
          <div class="goal-featured-copy">
            <strong>{activeCard.title}</strong>
            <p>{activeCard.description}</p>
          </div>
          <button type="button" class="goal-featured-cta" onClick={(e) => goToAction(activeCard.action, e.currentTarget)}>
            {gh.continueLabel || 'Continue'}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* Selector strip */}
        <div class="goal-carousel">
          <button
            type="button"
            class="goal-carousel-nav prev"
            onClick={() => step_(-1)}
            disabled={activeIndex === 0}
            aria-label={gh.previous || 'Previous'}
          >
            ‹
          </button>

          <div class="goal-carousel-track" ref={trackRef} role="listbox" aria-label={gh.title}>
            {gh.cards.map((card, i) => (
              <button
                type="button"
                key={card.action}
                ref={(el) => (cardRefs.current[i] = el)}
                role="option"
                aria-selected={i === activeIndex}
                class={`goal-chip ${i === activeIndex ? 'active' : ''} ${card.action === 'notsure' ? 'goal-chip-muted' : ''}`}
                onClick={(e) => selectCard(i, e)}
              >
                <span class={`goal-chip-badge ${i % 2 === 0 ? 'badge-gold' : 'badge-maroon'}`}>
                  <span aria-hidden="true">{card.icon}</span>
                </span>
                <span class="goal-chip-title">{card.title}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            class="goal-carousel-nav next"
            onClick={() => step_(1)}
            disabled={activeIndex === gh.cards.length - 1}
            aria-label={gh.next || 'Next'}
          >
            ›
          </button>
        </div>

        <div class="goal-dots">
          {gh.cards.map((card, i) => (
            <button
              type="button"
              key={card.action}
              class={`goal-dot-nav ${i === activeIndex ? 'active' : ''}`}
              aria-label={card.title}
              onClick={() => selectCard(i)}
            />
          ))}
        </div>
      </div>

      {notSureOpen && (
        <div class="goal-modal-backdrop" onClick={closeModal}>
          <div
            class="goal-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" class="goal-modal-close" onClick={closeModal} aria-label={gh.notSure.close}>
              ×
            </button>

            <div class="goal-modal-dots">
              <span class={`goal-dot ${step >= 1 ? 'active' : ''}`} />
              <span class={`goal-dot ${step >= 2 ? 'active' : ''}`} />
            </div>

            {step === 1 && (
              <div class="goal-modal-step" key="step1">
                <h2>{gh.notSure.whoQuestion}</h2>
                <div class="goal-modal-options">
                  {gh.notSure.whoOptions.map((opt) => (
                    <button
                      type="button"
                      class="goal-modal-option"
                      key={opt.value}
                      onClick={() => pickWho(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div class="goal-modal-step" key="step2">
                <button type="button" class="goal-modal-back" onClick={() => setStep(1)}>
                  {gh.notSure.back}
                </button>
                <h2>{gh.notSure.whatQuestion}</h2>
                <div class="goal-modal-options">
                  {gh.notSure.whatOptions.map((opt) => (
                    <button
                      type="button"
                      class="goal-modal-option"
                      key={opt.value}
                      onClick={() => pickWhat(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
