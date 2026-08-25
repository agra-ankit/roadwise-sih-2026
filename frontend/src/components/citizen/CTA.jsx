function CTA() {
  const scrollToReport = () => {
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="cta-section">
      <div className="cta-card">
        <div className="cta-content">
          <div className="mini-label">MAKE AN IMPACT</div>

          <h2>
            See a damaged road?
            <br />
            <span>Don't just drive past it.</span>
          </h2>

          <p>
            One report can help make an entire road safer for thousands of
            people.
          </p>

          <button className="primary-button" onClick={scrollToReport}>
            <span>📸</span>
            Report a Road Issue
            <span className="arrow">→</span>
          </button>
        </div>

        <div className="cta-orb">🚗</div>
      </div>
    </section>
  );
}

export default CTA;
