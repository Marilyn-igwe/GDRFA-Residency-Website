import './family.css'

const RELATIONSHIP_ICON = { spouse: '💍', child: '🧒' }

function MemberNode({ member, label, selected, onSelect }) {
  const required = member.requiredCount
  const provided = member.providedCount
  const hasName = !!member.fullName?.trim()

  return (
    <div class="family-tree-branch">
      <div class="family-tree-branch-line" />
      <button
        type="button"
        class={`family-node family-node-member ${selected ? 'selected' : ''} ${!hasName ? 'incomplete-name' : ''}`}
        onClick={onSelect}
      >
        <span class="family-node-icon" aria-hidden="true">{RELATIONSHIP_ICON[member.relationship]}</span>
        <strong class="family-node-name">{member.fullName?.trim() || label}</strong>
        <span class={`family-node-badge ${provided >= required ? 'complete' : ''}`}>
          {provided}/{required} docs
        </span>
      </button>
    </div>
  )
}

export function FamilyTree({ sponsorName, members, selectedMemberId, onSelectMember, onAddSpouse, onAddChild, t }) {
  const hasSpouse = members.some((m) => m.relationship === 'spouse')

  return (
    <div class="family-tree">
      <div class="family-tree-sponsor-row">
        <div class="family-node family-node-sponsor">
          <span class="family-node-icon" aria-hidden="true">👤</span>
          <strong class="family-node-name">{sponsorName?.trim() || t.sponsorPlaceholder}</strong>
          <span class="family-node-tag">{t.sponsorTag}</span>
        </div>
      </div>

      <div class="family-tree-trunk" />

      <div class="family-tree-children-row">
        {members.map((m) => (
          <MemberNode
            key={m.id}
            member={m}
            label={m.relationship === 'spouse' ? t.spouseLabel : t.childLabel}
            selected={m.id === selectedMemberId}
            onSelect={() => onSelectMember(m.id)}
          />
        ))}

        {!hasSpouse && (
          <div class="family-tree-branch">
            <div class="family-tree-branch-line" />
            <button type="button" class="family-node family-node-add" onClick={onAddSpouse}>
              <span class="family-node-icon" aria-hidden="true">＋</span>
              {t.addSpouse}
            </button>
          </div>
        )}

        <div class="family-tree-branch">
          <div class="family-tree-branch-line" />
          <button type="button" class="family-node family-node-add" onClick={onAddChild}>
            <span class="family-node-icon" aria-hidden="true">＋</span>
            {t.addChild}
          </button>
        </div>
      </div>
    </div>
  )
}
