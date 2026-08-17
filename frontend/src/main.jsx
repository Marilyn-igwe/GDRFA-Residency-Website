import { render } from 'preact'
import './index.css'
import { App } from './app.jsx'
import { AccessibilityProvider } from './accessibility/AccessibilityContext'
import { UaePassProvider } from './uaepass/UaePassContext'

render(
  <AccessibilityProvider>
    <UaePassProvider>
      <App />
    </UaePassProvider>
  </AccessibilityProvider>,
  document.getElementById('app')
)
