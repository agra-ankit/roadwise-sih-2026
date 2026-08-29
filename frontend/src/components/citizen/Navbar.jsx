import { useState } from "react";
import CivicKarmaModal from "./CivicKarmaModal";

function Navbar() {
  const [karmaOpen, setKarmaOpen] = useState(false);

  const scrollToReport = () => {
    document.getElementById("report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <nav className="navbar">
        <a href="#home" className="logo">
          <div className="logo-icon">R</div>

          <span>
            Road<span>Wise</span>
          </span>
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How it works</a>
          <a href="#track">Track Status</a>
          <a href="#impact">Impact</a>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setKarmaOpen(true)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              background: "rgba(34, 211, 238, 0.12)",
              border: "1px solid rgba(34, 211, 238, 0.35)",
              color: "#22d3ee",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            <span>🏆</span> Civic Karma & Certificate
          </button>

          <button className="nav-button" onClick={scrollToReport}>
            Report Issue
          </button>
        </div>
      </nav>

      <CivicKarmaModal
        isOpen={karmaOpen}
        onClose={() => setKarmaOpen(false)}
      />
    </>
  );
}

export default Navbar;
