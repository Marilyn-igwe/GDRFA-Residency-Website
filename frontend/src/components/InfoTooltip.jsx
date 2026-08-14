import './info-tooltip.css'

// IRCC/USCIS-style "ⓘ" popover: click or focus the icon to reveal a
// plain-language explainer next to a term the applicant might not know
// (e.g. "Humanitarian case", "Medical Hardship"). CSS-only show/hide via
// :focus, same mechanism as the existing booking-tooltip pattern, so it
// works the same on tap (mobile) and hover/keyboard focus (desktop).
//
// The trigger is a <span>, not a <button>, so this can be nested inside
// another clickable element (e.g. a category selection card) without
// invalid HTML. stopPropagation on click keeps tapping the icon from also
// triggering the parent's onClick.
export function InfoTooltip({ label = 'More info', title, align = 'center', children }) {
  return (
    <span class={`gd-tooltip-wrap gd-tooltip-align-${align}`}>
      <span
        class="gd-tooltip-trigger"
        tabIndex={0}
        role="button"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Space/Enter shouldn't bubble to a parent card's click handler.
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
        }}
      >
        ⓘ
      </span>
      <span class="gd-tooltip-bubble" role="tooltip">
        {title && <strong class="gd-tooltip-title">{title}</strong>}
        <span class="gd-tooltip-body">{children}</span>
      </span>
    </span>
  )
}
