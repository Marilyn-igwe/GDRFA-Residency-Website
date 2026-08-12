import governmentLogo from '../assets/government-dubai-logo.png'
import proudUaeLogo from '../assets/proud-of-uae-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'

export default function Welcome({ onStart }) {

  return (
    <div class="welcome-page">

      {/* Government Logos */}
      <div class="welcome-header">

        <img 
          class="gov-logo"
          src={governmentLogo}
          alt="Government of Dubai"
        />

        <img
          class="uae-logo"
          src={proudUaeLogo}
          alt="Proud of UAE"
        />

        <img
          class="gdrfa-logo"
          src={gdrfaLogo}
          alt="GDRFA Dubai"
        />

      </div>


      {/* Main Hero */}
      <div class="welcome-content">

        <p class="welcome-label">
          GDRFA DUBAI • AI DIGITAL SERVICES
        </p>


        <h1>
          Welcome to the
          <br />
          GDRFA AI Platform
        </h1>


        <p class="welcome-description">
          Your intelligent gateway for residency,
          entry permits, applications and government
          services in Dubai.
        </p>


        <button
          class="start-button"
          onClick={onStart}
        >
          Get Started →
        </button>


      </div>


      {/* Animated Background */}
      <div class="dubai-animation">
        <div></div>
        <div></div>
        <div></div>
      </div>


    </div>
  )
}