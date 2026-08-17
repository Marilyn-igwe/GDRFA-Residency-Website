import { useEffect, useState } from 'preact/hooks'
import { useUaePass } from './UaePassContext'

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z M14 3v4h4 M9 12h6 M9 16h6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
}

export function UaePassBadge() {
  return <span class="up-badge"><span>✓</span>Provided by UAE PASS</span>
}

export function UaePassBanner() {
  const { profile, sharedDocuments } = useUaePass()
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('gdrfa_uaepass_welcome_seen') !== '1'
  })

  useEffect(() => {
    if (!visible || !profile) return undefined
    sessionStorage.setItem('gdrfa_uaepass_welcome_seen', '1')
    const timer = window.setTimeout(() => setVisible(false), 4500)
    return () => window.clearTimeout(timer)
  }, [visible, profile])

  if (!profile || !visible) return null
  return (
    <aside class="up-banner" role="status">
      <span class="up-banner-check">✓</span>
      <div><strong>Signed in with UAE PASS</strong><small>{profile.fullNameEnglish} · {sharedDocuments.length} documents available</small></div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss notification">×</button>
    </aside>
  )
}

export function UaePassDocumentList({ requirements = [], uploads = {}, onUpload, onRemoveUpload }) {
  const { matchDocument } = useUaePass()
  return (
    <div class="up-requirements">
      {requirements.map((requirement) => {
        const document = matchDocument(requirement)
        const upload = uploads[requirement]
        const complete = Boolean(document || upload)
        return (
          <article class={`up-requirement ${complete ? 'complete' : ''}`} key={requirement}>
            <span class="up-doc-icon"><DocumentIcon /></span>
            <div class="up-doc-copy">
              <strong>{requirement}</strong>
              {document ? <><span>Provided by UAE PASS</span><small>{document.fileName} · Expires {document.expiresOn}</small></> : upload ? <><span>Uploaded by applicant</span><small>{upload.name}</small></> : <span>Upload required</span>}
            </div>
            <div class="up-doc-actions">
              <label>{upload ? 'Replace' : document ? 'Replace' : 'Upload'}<input type="file" accept="image/*,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload?.(requirement, file); event.target.value = '' }} /></label>
              {upload && <button type="button" onClick={() => onRemoveUpload?.(requirement)}>Remove</button>}
            </div>
          </article>
        )
      })}
    </div>
  )
}
