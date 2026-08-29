import { useState } from "react";

function BeforeAfterSlider({ beforeImage, afterImage, beforeLabel = "Before (Damage Reported)", afterLabel = "After (Repaired & Fixed)" }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState("slider");

  const handleSliderChange = (e) => {
    setSliderPosition(Number(e.target.value));
  };

  if (!beforeImage && !afterImage) return null;

  if (!afterImage) {
    return (
      <div className="single-evidence-box">
        <img src={beforeImage} alt="Report Evidence" style={{ width: "100%", height: "260px", objectFit: "cover", borderRadius: "10px" }} />
      </div>
    );
  }

  return (
    <div className="before-after-wrapper" style={{ margin: "16px 0", background: "#050b0d", border: "1px solid rgba(34, 211, 238, 0.2)", borderRadius: "14px", padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "800", letterSpacing: "1px", textTransform: "uppercase" }}>
          🔍 Repair Verification Proof
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setViewMode("slider")}
            style={{
              background: viewMode === "slider" ? "rgba(34, 211, 238, 0.25)" : "transparent",
              color: viewMode === "slider" ? "#22d3ee" : "#8b9c9f",
              border: "1px solid rgba(34, 211, 238, 0.3)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Split Slider
          </button>
          <button
            type="button"
            onClick={() => setViewMode("side-by-side")}
            style={{
              background: viewMode === "side-by-side" ? "rgba(34, 211, 238, 0.25)" : "transparent",
              color: viewMode === "side-by-side" ? "#22d3ee" : "#8b9c9f",
              border: "1px solid rgba(34, 211, 238, 0.3)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {viewMode === "slider" ? (
        <div style={{ position: "relative", width: "100%", height: "280px", overflow: "hidden", borderRadius: "10px", userSelect: "none" }}>
          {/* Background image (After / Repaired) */}
          <img
            src={afterImage}
            alt={afterLabel}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          <span style={{ position: "absolute", bottom: "10px", right: "12px", background: "rgba(16, 185, 129, 0.85)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", zIndex: 2 }}>
            ✓ {afterLabel}
          </span>

          {/* Foreground image (Before / Defect) clipped by sliderPosition */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "hidden",
              clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
            }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <span style={{ position: "absolute", bottom: "10px", left: "12px", background: "rgba(239, 68, 68, 0.85)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", zIndex: 2 }}>
              ⚠ {beforeLabel}
            </span>
          </div>

          {/* Slider divider line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${sliderPosition}%`,
              width: "3px",
              background: "#22d3ee",
              boxShadow: "0 0 10px #22d3ee",
              pointerEvents: "none",
              zIndex: 3,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "#080e10",
                border: "2px solid #22d3ee",
                color: "#22d3ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "900",
                boxShadow: "0 0 10px rgba(34, 211, 238, 0.6)",
              }}
            >
              ↔
            </div>
          </div>

          {/* Range input overlay */}
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={handleSliderChange}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "ew-resize",
              zIndex: 4,
              margin: 0,
            }}
          />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ position: "relative" }}>
            <img src={beforeImage} alt={beforeLabel} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }} />
            <span style={{ position: "absolute", bottom: "8px", left: "8px", background: "rgba(239, 68, 68, 0.85)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>
              ⚠ {beforeLabel}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <img src={afterImage} alt={afterLabel} style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }} />
            <span style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(16, 185, 129, 0.85)", color: "#fff", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "4px" }}>
              ✓ {afterLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeforeAfterSlider;
