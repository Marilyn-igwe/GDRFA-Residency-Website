import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'
import { AccessibilityProvider } from './accessibility/AccessibilityContext'

render(
  <AccessibilityProvider>
    <App />
  </AccessibilityProvider>,
  document.getElementById('app')
)
