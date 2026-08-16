import { useState } from 'preact/hooks'
import './goalhub.css'

// The "front door" of the whole app. One question, six answers, done.
// Replaces the old hero + quick-actions combo, which showed a title, a
// paragraph, two buttons AND four tiles before the person had done
// anything — all doing roughly the same job of "where do I click".
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

  function handleCardClick(action) {
    if (action === 'notsure') {
      setStep(1)
      setWho(null)
      setNotSureOpen(true)
      return
    }
    onNavigate(action)
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

        <div class="goal-hub-grid">
          {gh.cards.map((card, i) => (
            <button
              type="button"
              class={`goal-card ${card.action === 'notsure' ? 'goal-card-muted' : ''}`}
              key={card.action}
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => handleCardClick(card.action)}
            >
              <span class="goal-card-icon-badge">
                <span class="goal-card-icon" aria-hidden="true">{card.icon}</span>
              </span>
              <span class="goal-card-title">{card.title}</span>
              <span class="goal-card-arrow" aria-hidden="true">→</span>
            </button>
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
