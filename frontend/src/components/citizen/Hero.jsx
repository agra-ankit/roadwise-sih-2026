function Hero() {
  const scrollToReport = () => {
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <div className="status-pill">
          <span className="pulse-dot"></span>
          Building smarter roads together
        </div>

        <h1>
          Your road.
          <br />
          <span>Our responsibility.</span>
        </h1>

        <p className="hero-description">
          Spot a pothole or damaged road? Report it in seconds and help
          authorities build safer, smarter cities.
        </p>

        <div className="hero-buttons">
          <button className="primary-button" onClick={scrollToReport}>
            <span>📸</span>
            Report Road Damage
            <span className="arrow">→</span>
          </button>

          <button className="secondary-button" onClick={scrollToHowItWorks}>
            See how it works
            <span>↓</span>
          </button>
        </div>

        <div className="trust-row">
          <div className="avatars">
            <div>👨</div>
            <div>👩</div>
            <div>👨</div>
            <div>+</div>
          </div>

          <div>
            <strong>1,200+ citizens</strong>
            <p>already making roads better</p>
          </div>
        </div>
      </div>

      {/* AI VISUAL */}

      <div className="hero-visual">
        <div className="visual-grid"></div>

        <div className="radar-ring radar-one"></div>
        <div className="radar-ring radar-two"></div>
        <div className="radar-ring radar-three"></div>

        <div className="road-monitor">
          <div className="monitor-header">
            <div>
              <span className="live-indicator"></span>
              ROADWISE AI
            </div>

            <span className="monitor-status">LIVE</span>
          </div>

          <div className="road-scene">
            <div className="scan-line"></div>

            <div className="road-perspective">
              <div className="lane lane-one"></div>
              <div className="lane lane-two"></div>
            </div>

            <div className="damage-zone">
              <div className="corner top-left"></div>
              <div className="corner top-right"></div>
              <div className="corner bottom-left"></div>
              <div className="corner bottom-right"></div>

              <div className="target-pulse"></div>

              <span className="damage-label">POTHOLE · 94%</span>
            </div>
          </div>

          <div className="analysis-panel">
            <div className="analysis-item">
              <div className="analysis-icon">AI</div>

              <div>
                <small>DETECTED DAMAGE</small>
                <strong>Pothole</strong>
              </div>
            </div>

            <div className="severity-meter">
              <div className="meter-info">
                <span>SEVERITY</span>
                <strong>HIGH</strong>
              </div>

              <div className="meter">
                <div className="meter-fill"></div>
              </div>
            </div>
          </div>

          <div className="location-panel">
            <div className="location-icon">⌖</div>

            <div>
              <small>LOCATION DETECTED</small>
              <strong>MG Road, New Delhi</strong>
            </div>

            <div className="location-pulse"></div>
          </div>
        </div>

        <div className="floating-card priority-card">
          <div className="floating-icon">↑</div>

          <div>
            <small>PRIORITY SCORE</small>
            <strong>87 / 100</strong>
          </div>

          <div className="priority-bar">
            <span></span>
          </div>
        </div>

        <div className="floating-card report-card">
          <div className="report-icon">✓</div>

          <div>
            <small>REPORT STATUS</small>
            <strong>Sent to authorities</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
