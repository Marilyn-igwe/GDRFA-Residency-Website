// A small compass/seal-inspired avatar standing in for the AI on the other
// side of the conversation. One shape, four states (idle / listening /
// thinking / speaking) driven almost entirely by CSS — see assistant.css —
// with an optional real-time `level` (0–1) layered on top so it visibly
// reacts to actual microphone input while listening, rather than just
// looping a canned animation.

export function AssistantOrb({ size = 64, state = 'idle', level = 0, label }) {
  const coreScale = state === 'listening' ? 1 + Math.min(level, 1) * 0.32 : undefined

  return (
    <div
      class={`assistant-orb assistant-orb--${state}`}
      style={{ '--orb-size': `${size}px` }}
      role="img"
      aria-label={label || 'GDRFA AI Assistant'}
    >
      <span class="assistant-orb-pulse" />
      <span class="assistant-orb-pulse assistant-orb-pulse--delay" />

      <svg class="assistant-orb-ring" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle class="assistant-orb-ring-track" cx="50" cy="50" r="45" fill="none" stroke-width="1.5" />
        <circle class="assistant-orb-ring-arc" cx="50" cy="50" r="45" fill="none" stroke-width="1.5" stroke-linecap="round" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const x1 = 50 + Math.cos(angle) * 40
          const y1 = 50 + Math.sin(angle) * 40
          const x2 = 50 + Math.cos(angle) * 35
          const y2 = 50 + Math.sin(angle) * 35
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} class="assistant-orb-tick" stroke-width="1.5" />
        })}
      </svg>

      <div class="assistant-orb-core" style={coreScale ? { transform: `scale(${coreScale})` } : undefined} />
    </div>
  )
}
