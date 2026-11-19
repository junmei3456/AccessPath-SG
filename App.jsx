
import { useState } from 'react'
import './App.css'
import RouteMap from './RouteMap'

export default function App() {
  
const [screen, setScreen] = useState('home')
const [facilityFilter, setFacilityFilter] = useState('Rest')
  const [start, setStart] = useState('20 Jalan Membina')
  const [destination, setDestination] = useState('131 Jalan Bukit Merah')
  const [preference, setPreference] = useState('Most Accessible')
  const [guidance, setGuidance] = useState(false)
const hasAnalysedRoute =
  start === '20 Jalan Membina' &&
  destination === '131 Jalan Bukit Merah'
  const goHome = () => {
    setScreen('home')
    setGuidance(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo" onClick={goHome}>✳ AccessPath SG</button>
        <span className="edition">ELDERLY EDITION</span>
      </header>

      <main>
        {screen === 'home' && (
          <section className="screen home">
            

<div className="welcome-art">
  <div className="welcome-scenery">
    <img
      src="/elderly-couple.png"
      alt="Two older adults walking together in a park"
      className="welcome-image"
    />
  </div>
</div>

            <p className="eyebrow">WELCOME TO ACCESSPATH SG</p>
            <h1>Travel with confidence.</h1>
            <p className="subtitle">
              Find a more comfortable way to get around your neighbourhood.
            </p>

            <button className="main-button" onClick={() => setScreen('choose')}>
              🧭 Find a Route <span>→</span>
            </button>
            <button className="menu-button" onClick={() => setScreen('saved')}>
              ⭐ Saved Routes <span>→</span>
            </button>
            <button className="menu-button" onClick={() => setScreen('facilities')}>
              🪑 Nearby Facilities <span>→</span>
            </button>
            <button className="menu-button" onClick={() => setScreen('about')}>
              ℹ️ About AccessPath <span>→</span>
            </button>
          </section>
        )}

        {screen === 'choose' && (
          <section className="screen">
            <button className="back" onClick={goHome}>← Back to Home</button>
            <p className="eyebrow">PLAN YOUR JOURNEY</p>
            <h1>Where are you going?</h1>
            <p className="subtitle">Choose your starting point and destination.</p>

<label className="field-label">Starting Point</label>
<select value={start} onChange={(e) => setStart(e.target.value)}>
  <option value="20 Jalan Membina">20 Jalan Membina</option>
</select>

<label className="field-label">Destination</label>
<select value={destination} onChange={(e) => setDestination(e.target.value)}>
  <option value="131 Jalan Bukit Merah">131 Jalan Bukit Merah</option>
</select>

            <h2>What matters most to you?</h2>
            <div className="preferences">
              {['Most Accessible', 'More Sheltered', 'Shortest Route'].map(item => (
                <button
                  key={item}
                  className={preference === item ? 'preference selected' : 'preference'}
                  onClick={() => setPreference(item)}
                >
                  {item === 'Most Accessible' ? '♿' : item === 'More Sheltered' ? '☂️' : '🚶'}
                  {' '}{item}
                </button>
              ))}
            </div>

            <button
              className="main-button"
              disabled={start === destination}
              onClick={() => {
                setGuidance(false)
                setScreen('route')
              }}
            >
              Show My Route →
            </button>
            {start === destination && (
              <p className="notice">Please choose two different locations.</p>
            )}
          </section>
        )}

        {screen === 'route' && (
          <section className="screen">
            <button className="back" onClick={() => setScreen('choose')}>← Change Route</button>
            <p className="eyebrow">YOUR JOURNEY</p>
            <h1>Let's get you there.</h1>
            <p className="subtitle">{start} → {destination}</p>

           {hasAnalysedRoute ? (
  <div className="map-demo">
<RouteMap start={start} destination={destination} />
  </div>
) : (
  <div className="journey-card">
    <h2>🗺️ Route Not Yet Available</h2>
    <p>
      Accessibility analysis is not yet available
      for this journey.
    </p>
    <p>
      Try selecting 20 Jalan Membina to
      131 Jalan Bukit Merah.
    </p>
  </div>
)}
    

<div className="journey-card">
  <p className="journey-heading">YOUR JOURNEY</p>
  <h2>🚶 Route Overview</h2>

  <div className="journey-locations">
    <div>
      <span className="location-dot start-dot">A</span>
      <span>{start}</span>
    </div>

    <div className="location-connector" />

    <div>
      <span className="location-dot end-dot">B</span>
      <span>{destination}</span>
    </div>
  </div>

  {hasAnalysedRoute ? (
    <>
      <div className="journey-stats">
        <div className="stat-card">
          <span>📏 Distance</span>
          <strong>996 m</strong>
        </div>

        <div className="stat-card">
          <span>⏱️ Walking Time</span>
          <strong>~20 min</strong>
        </div>
      </div>

      <div className="route-info">
        <strong>♿ Accessibility Information</strong>
        <p>
          AI observations are shown on the map.
          Please check your surroundings while walking.
        </p>
      </div>

      <div className="accessibility-legend">
        <strong>🗺️ Map Guide</strong>

        <div>
          <span className="legend-dot red"></span>
          Possible obstacle
        </div>

        <div>
          <span className="legend-dot green"></span>
          Helpful feature
        </div>

        <div>
          <span className="legend-dot amber"></span>
          Needs checking
        </div>
      </div>
    </>
  ) : (
    <p>Accessibility information is not available for this route.</p>
  )}
</div>

<p className="notice">
  ⚠️ This is a university project prototype.
  Route accessibility and safety have not been
  independently verified. This is not live navigation.
</p>

            
{guidance && (
  <div className="guidance-panel">
    <p className="eyebrow">JOURNEY GUIDANCE DEMO</p>
    <h2>Follow Your Journey</h2>

    <div className="guidance-step">
      <span className="step-number">1</span>
      <div>
        <strong>Start at {start}</strong>
        <p>Check your surroundings before setting off.</p>
      </div>
    </div>

    <div className="guidance-step">
      <span className="step-number">2</span>
      <div>
        <strong>Check the walking route</strong>
        <p>Use pedestrian crossings and check for steps or obstacles.</p>
      </div>
    </div>

    <div className="guidance-step">
      <span className="step-number">3</span>
      <div>
        <strong>Arrive at {destination}</strong>
        <p>Confirm that you have reached your destination.</p>
      </div>
    </div>

    <button
      className="voice-button"
      onClick={() => {
        if (!('speechSynthesis' in window)) {
          alert('Voice guidance is not supported in this browser.')
          return
        }

        window.speechSynthesis.cancel()

        const message = new SpeechSynthesisUtterance(
          `Journey demonstration. Start at ${start}. ` +
          `Check your surroundings. ` +
          `Use pedestrian crossings and check for obstacles. ` +
          `Your destination is ${destination}.`
        )

        message.lang = 'en-SG'
        message.rate = 0.85
        window.speechSynthesis.speak(message)
      }}
    >
      🔊 Listen to Guidance
    </button>

    <p className="notice">
      Demonstration only. These are general safety reminders,
      not live walking directions.
    </p>
  </div>
)}


            <button className="main-button" onClick={() => setGuidance(!guidance)}>
              {guidance ? 'Hide Guidance' : '▶ Start Guidance Demo'}
            </button>
          </section>
        )}

        
{screen === 'facilities' && (
  <section className="screen facilities-screen">
    <button className="back" onClick={goHome}>
      ← Back to Home
    </button>

    <p className="eyebrow">EXPLORE YOUR NEIGHBOURHOOD</p>
    <h1>Nearby Facilities</h1>
    <p className="subtitle">
      Find useful places for a more comfortable journey.
    </p>

    <div className="facility-tabs">
      {[
        ['Rest', '🪑'],
        ['Toilet', '🚻'],
        ['Lift', '🛗'],
        ['F&B', '☕']
      ].map(([name, symbol]) => (
        <button
          key={name}
          className={
            facilityFilter === name
              ? 'facility-tab selected'
              : 'facility-tab'
          }
          onClick={() => setFacilityFilter(name)}
        >
          <span>{symbol}</span>
          {name}
        </button>
      ))}
    </div>

    <div className="facility-results">
      {facilityFilter === 'Rest' && (
        <>
          <div className="facility-card">
            <span className="facility-card-icon">🪑</span>
            <div>
              <h2>Seating Areas</h2>
              <p>Places to sit and take a break.</p>
            </div>
          </div>

          <div className="facility-card">
            <span className="facility-card-icon">🌳</span>
            <div>
              <h2>Shaded Rest Areas</h2>
              <p>Rest away from direct sunlight.</p>
            </div>
          </div>
        </>
      )}

      {facilityFilter === 'Toilet' && (
        <div className="facility-card">
          <span className="facility-card-icon">🚻</span>
          <div>
            <h2>Accessible Toilets</h2>
            <p>Find toilets with accessible facilities.</p>
          </div>
        </div>
      )}

      {facilityFilter === 'Lift' && (
        <div className="facility-card">
          <span className="facility-card-icon">🛗</span>
          <div>
            <h2>Public Lifts</h2>
            <p>Step-free connections between levels.</p>
          </div>
        </div>
      )}

      {facilityFilter === 'F&B' && (
        <div className="facility-card">
          <span className="facility-card-icon">☕</span>
          <div>
            <h2>Food & Drinks</h2>
            <p>Places to eat, drink and take a break.</p>
          </div>
        </div>
      )}
    </div>

    <p className="notice">
      Demonstration categories only. Actual facility
      locations and accessibility have not been verified.
    </p>
  </section>
)}

        {screen === 'saved' && (
          <section className="screen">
            <button className="back" onClick={goHome}>← Back to Home</button>
            <h1>Saved Routes</h1>
            <p className="subtitle">Your favourite journeys will appear here.</p>
            <button className="main-button" onClick={() => setScreen('choose')}>
              Find a Route →
            </button>
          </section>
        )}

        {screen === 'about' && (
          <section className="screen">
            <button className="back" onClick={goHome}>← Back to Home</button>
            <h1>About AccessPath SG</h1>
            <p className="subtitle">
              AccessPath SG explores how pedestrian accessibility information
              can help older adults navigate the Tiong Bahru–Havelock neighbourhood.
            </p>
            <p className="notice">
              This is a university project prototype, not a verified navigation service.
            </p>
          </section>
        )}
      </main>

      

<nav className="bottom-nav" aria-label="Main navigation">
  <button
    className={screen === 'home' ? 'nav-item active' : 'nav-item'}
    onClick={goHome}
    aria-label="Home"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10L12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </svg>
    Home
  </button>

  <button
    className={
      screen === 'choose' || screen === 'route'
        ? 'nav-item active'
        : 'nav-item'
    }
    onClick={() => setScreen('choose')}
    aria-label="Route"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h5a5 5 0 0 0 5-5v-5" />
    </svg>
    Route
  </button>

  <button
    className={screen === 'saved' ? 'nav-item active' : 'nav-item'}
    onClick={() => setScreen('saved')}
    aria-label="Saved Routes"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
    Saved
  </button>

  <button
    className={screen === 'about' ? 'nav-item active' : 'nav-item'}
    onClick={() => setScreen('about')}
    aria-label="About"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </svg>
    About
  </button>
</nav>


    </div>
  )
}
