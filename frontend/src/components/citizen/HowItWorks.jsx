function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: "📸",
      title: "Capture",
      text: "Take a photo of the damaged road using your phone.",
    },
    {
      number: "02",
      icon: "🤖",
      title: "AI detects",
      text: "Our AI identifies the damage and estimates its severity.",
    },
    {
      number: "03",
      icon: "🛠️",
      title: "Authorities act",
      text: "The issue is prioritized and assigned for repair.",
    },
  ];

  return (
    <section className="how-section" id="how-it-works">
      <div className="section-heading">
        <div className="mini-label">HOW ROADWISE WORKS</div>

        <h2>
          From road damage
          <span> to resolution.</span>
        </h2>

        <p>
          A simple reporting process powered by AI and real-time location
          intelligence.
        </p>
      </div>

      <div className="steps">
        {steps.map((step, index) => (
          <div className="step-wrapper" key={step.number}>
            <div className="step-card">
              <div className="step-number">{step.number}</div>

              <div className="step-icon">{step.icon}</div>

              <h3>{step.title}</h3>

              <p>{step.text}</p>
            </div>

            {index < steps.length - 1 && <div className="step-arrow">→</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
