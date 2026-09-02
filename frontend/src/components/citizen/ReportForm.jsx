import { useState, useRef } from "react";
import { createReport, SERVER_BASE_URL } from "../../services/api";
import LocationPicker from "./LocationPicker";

const SERVER_BASE = SERVER_BASE_URL;

// Contextual Road Domain Speech Sanitizer
function sanitizeRoadSpeech(text) {
  if (!text) return "";
  let clean = text.trim();

  // Auto-correct common speech engine mishearings in Indian English / Hinglish
  clean = clean.replace(/\b(deep\s+)?(bethel|battle|path\s*hole|port\s*hole|pot\s+hole|pot\s*hol)\b/gi, "deep pothole");
  clean = clean.replace(/\b(bethel|battle|path\s*hole|port\s*hole|pot\s+hole|pot\s*hol)\b/gi, "pothole");
  clean = clean.replace(/\b(main\s*hole|men\s*hole|man\s*hall|men\s*hall)\b/gi, "manhole");
  clean = clean.replace(/\b(open\s+)?(main\s*hole|men\s*hole)\b/gi, "open manhole");
  clean = clean.replace(/\b(water\s+logging|water\s+log|water\s*lock)\b/gi, "waterlogging");
  clean = clean.replace(/\b(street\s*light|street\s*lite)\b/gi, "street light");

  return clean;
}

function ReportForm() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const baseDescriptionRef = useRef("");
  const [citizenContact, setCitizenContact] = useState(() => {
    return localStorage.getItem("roadwise_citizen_contact") || "";
  });
  const [citizenName, setCitizenName] = useState(() => {
    return localStorage.getItem("roadwise_citizen_name") || "";
  });
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportResult, setReportResult] = useState(null);

  // Multilingual Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-IN");
  const [speechSupported] = useState(() => {
    return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  });
  const [speechStatus, setSpeechStatus] = useState("");

  const handleToggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus("Speech recognition is not supported on this browser.");
      return;
    }

    if (isListening) {
      if (window._roadwiseSpeechRec) {
        window._roadwiseSpeechRec.stop();
      }
      setIsListening(false);
      setSpeechStatus("");
      return;
    }

    try {
      baseDescriptionRef.current = description;
      const recognition = new SpeechRecognition();
      recognition.lang = speechLang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus(speechLang === "hi-IN" ? "🎙️ सुन रहा हूँ... बोलिए" : "🎙️ Listening... Speak clearly");
      };

      recognition.onresult = (event) => {
        let rawTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal || event.results[i][0]) {
            rawTranscript += event.results[i][0].transcript;
          }
        }

        const cleanTranscript = sanitizeRoadSpeech(rawTranscript);
        if (cleanTranscript) {
          setDescription(cleanTranscript);
          setSpeechStatus(`✓ Transcribed: "${cleanTranscript}"`);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setSpeechStatus(event.error === "no-speech" ? "No speech detected. Try again." : `Mic: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      window._roadwiseSpeechRec = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech error:", err);
      setIsListening(false);
      setSpeechStatus("Unable to access microphone.");
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    setError("");
    setImage(file);

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!image) {
      setError("Please upload a road damage image.");
      return;
    }

    if (!location) {
      setError("Please search or select the location on the map.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let citizenId = localStorage.getItem("roadwise_citizen_id");
      if (!citizenId) {
        citizenId = `CIT-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
        localStorage.setItem("roadwise_citizen_id", citizenId);
      }

      const formData = new FormData();
      formData.append("image", image);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));
      formData.append("citizenId", citizenId);

      if (citizenContact && citizenContact.trim()) {
        formData.append("citizenContact", citizenContact.trim());
      }

      if (citizenName && citizenName.trim()) {
        formData.append("citizenName", citizenName.trim());
      }

      if (typeof location.accuracy === "number") {
        formData.append("locationAccuracy", String(location.accuracy));
      }

      if (address && address.trim()) {
        formData.append("address", address.trim());
      }

      if (description && description.trim()) {
        formData.append("description", description.trim());
      }

      const response = await createReport(formData);
      setReportResult(response);
      setSubmitted(true);

      const currentCount = parseInt(
        localStorage.getItem("roadwise_user_report_count") || "0",
        10
      );
      localStorage.setItem("roadwise_user_report_count", String(currentCount + 1));
    } catch (err) {
      setError(
        err.message ||
          "Failed to submit report. Please verify backend service is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDamageType = (type) => {
    if (!type) return "Other Damage";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getImageUrl = (relUrl) => {
    if (!relUrl) return preview;
    return relUrl.startsWith("http") ? relUrl : `${SERVER_BASE}${relUrl}`;
  };

  if (submitted && reportResult) {
    const report = reportResult.report || {};
    const ai = reportResult.ai_analysis || {};
    const damageText = formatDamageType(report.damageType || ai.damage_type);
    const severityText = (
      report.severity ||
      ai.severity ||
      "LOW"
    ).toUpperCase();
    const confidencePct =
      typeof report.confidence === "number"
        ? (report.confidence * 100).toFixed(1) + "%"
        : typeof ai.confidence === "number"
        ? (ai.confidence * 100).toFixed(1) + "%"
        : "N/A";
    const priority = report.priorityScore ?? ai.priority_score ?? 0;
    const statusText = report.status
      ? report.status.charAt(0).toUpperCase() + report.status.slice(1)
      : "Reported";
    const isRejected = reportResult?.isRejected === true || report.status === "rejected";
    const reportId = report._id
      ? report._id.slice(-6).toUpperCase()
      : "SUBMITTED";
    const displayImg = getImageUrl(report.imageUrl);

    return (
      <section className="report-section" id="report">
        <div className="success-card">
          <div className="success-icon" style={{ background: isRejected ? "rgba(239, 68, 68, 0.15)" : undefined, color: isRejected ? "#ff4d4d" : undefined, border: isRejected ? "1px solid rgba(239, 68, 68, 0.3)" : undefined }}>
            {isRejected ? "⚠️" : "✓"}
          </div>

          <div className="success-label" style={{ color: isRejected ? "#ffaa00" : undefined }}>
            {isRejected ? "AI VALIDATION · NO ROAD HAZARD FOUND" : "REPORT RECEIVED & AI ANALYZED"}
          </div>

          <h2>
            {isRejected ? (
              <>
                No Road Hazard
                <br />
                <span style={{ color: "#ffaa00" }}>Detected in Image.</span>
              </>
            ) : (
              <>
                Thank you for
                <br />
                <span>making roads safer.</span>
              </>
            )}
          </h2>

          <p>
            {isRejected
              ? "Our AI vision analyzed this photo and found 0 potholes or open manholes (Confidence: 0%). This report is flagged as unverified to prevent false dispatches."
              : "Your road damage report has been analyzed by AI and stored securely in the database."}
          </p>

          <div className="success-id">
            <span>REPORT ID</span>
            <strong>{reportId}</strong>
          </div>

          <div
            className="ai-summary-box"
            style={{
              margin: "24px 0",
              padding: "20px",
              borderRadius: "14px",
              background: isRejected ? "rgba(239, 68, 68, 0.04)" : "rgba(34, 211, 238, 0.04)",
              border: isRejected ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(34, 211, 238, 0.2)",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "18px",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              {displayImg && (
                <img
                  src={displayImg}
                  alt="Analyzed Road Damage"
                  style={{
                    width: "110px",
                    height: "85px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: isRejected ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 211, 238, 0.3)",
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: isRejected ? "#ffaa00" : "#22d3ee",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    marginBottom: "4px",
                  }}
                >
                  {isRejected ? "AI VALIDATION STATUS" : "AI DETECTED ISSUE"}
                </div>
                <h4 style={{ margin: 0, fontSize: "18px", color: isRejected ? "#ff9b9b" : "#f0f6f8" }}>
                  {isRejected ? "No Hazard / Unverified" : damageText}
                </h4>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#8b9c9f",
                    marginTop: "4px",
                  }}
                >
                  Status:{" "}
                  <span style={{ color: isRejected ? "#ff4d4d" : "#22d3ee", fontWeight: "700" }}>
                    {isRejected ? "Rejected (No Defect)" : statusText}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: "12px",
                paddingTop: "15px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    color: "#647478",
                    textTransform: "uppercase",
                  }}
                >
                  Severity
                </span>
                <strong
                  style={{
                    fontSize: "13px",
                    color:
                      severityText === "HIGH"
                        ? "#ff4d4d"
                        : severityText === "MEDIUM"
                        ? "#ffaa00"
                        : "#22d3ee",
                  }}
                >
                  {severityText}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    color: "#647478",
                    textTransform: "uppercase",
                  }}
                >
                  AI Confidence
                </span>
                <strong style={{ fontSize: "13px", color: "#f0f6f8" }}>
                  {confidencePct}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    color: "#647478",
                    textTransform: "uppercase",
                  }}
                >
                  Priority Score
                </span>
                <strong style={{ fontSize: "13px", color: "#22d3ee" }}>
                  {priority} / 100
                </strong>
              </div>
            </div>

            {report.contextTags && report.contextTags.length > 0 && (
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {report.contextTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: "rgba(234, 179, 8, 0.12)",
                      color: "#facc15",
                      border: "1px solid rgba(234, 179, 8, 0.3)",
                      padding: "3px 8px",
                      borderRadius: "5px",
                      fontSize: "10px",
                      fontWeight: "700",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {location &&
            typeof location.latitude === "number" &&
            typeof location.longitude === "number" &&
            (location.latitude !== 0 || location.longitude !== 0) && (
              <a
                href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  margin: "0 0 20px 0",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  background: "rgba(34, 211, 238, 0.12)",
                  color: "#22d3ee",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: "600",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                📍 Open Location in Google Maps ↗
              </a>
            )}

          <button
            className="secondary-button"
            onClick={() => {
              setSubmitted(false);
              setReportResult(null);
              setImage(null);
              setPreview("");
              setLocation(null);
              setDescription("");
              setError("");
            }}
          >
            Submit another report →
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="report-section" id="report">
      <div className="report-container">
        <div className="report-heading">
          <span className="section-tag">ROAD DAMAGE REPORT</span>

          <h2>
            Report a problem.
            <br />
            <span>Make roads safer.</span>
          </h2>

          <p>
            Upload a photo, share your location and let RoadWise handle the
            rest.
          </p>

          <div className="report-points">
            <div>
              <span>01</span>
              AI analyzes the damage
            </div>

            <div>
              <span>02</span>
              Location is automatically captured
            </div>

            <div>
              <span>03</span>
              Authorities receive the report
            </div>
          </div>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <span>NEW REPORT</span>
              <h3>Road damage details</h3>
            </div>

            <div className="secure-badge">🔒 Secure</div>
          </div>

          {/* IMAGE */}

          <div className="form-group">
            <label>
              Road damage photo
              <span>Required</span>
            </label>

            <label className="upload-box">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />

              {preview ? (
                <div className="image-preview">
                  <img src={preview} alt="Road damage preview" />

                  <div className="image-overlay">
                    <span>✓ Image selected</span>
                    <small>Click to replace</small>
                  </div>
                </div>
              ) : (
                <div className="upload-content">
                  <div className="upload-icon">↑</div>

                  <strong>Upload road image</strong>

                  <small>JPG, PNG or WEBP · Max 10MB</small>
                </div>
              )}
            </label>
          </div>

          {/* LOCATION */}

          <div className="form-group">
            <label>
              Road Hazard Location
              <span>Required</span>
            </label>

            <LocationPicker
              location={location}
              onChangeLocation={setLocation}
              address={address}
              onChangeAddress={setAddress}
              setError={setError}
            />
          </div>

          {/* DESCRIPTION & MULTILINGUAL VOICE INPUT */}

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
              <label style={{ margin: 0 }}>
                Description
                <span style={{ marginLeft: "6px" }}>Optional</span>
              </label>

              {/* Voice-to-Text Bar */}
              {speechSupported && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* Language Selector */}
                  <select
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(10, 18, 22, 0.9)",
                      border: "1px solid rgba(34, 211, 238, 0.25)",
                      color: "#22d3ee",
                      fontSize: "10px",
                      fontWeight: "700",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="en-IN">🌐 English (India)</option>
                    <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
                  </select>

                  {/* Mic Trigger Button */}
                  <button
                    type="button"
                    onClick={handleToggleListening}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: isListening ? "rgba(255, 77, 77, 0.2)" : "rgba(34, 211, 238, 0.12)",
                      border: `1px solid ${isListening ? "#ff4d4d" : "rgba(34, 211, 238, 0.35)"}`,
                      color: isListening ? "#ff6b6b" : "#22d3ee",
                      fontSize: "11px",
                      fontWeight: "800",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      animation: isListening ? "pulse 1.2s infinite" : "none",
                    }}
                  >
                    <span>{isListening ? "🔴" : "🎙️"}</span>
                    <span>{isListening ? "Stop Listening" : "Speak to Dictate"}</span>
                  </button>
                </div>
              )}
            </div>

            {speechStatus && (
              <div
                style={{
                  fontSize: "11px",
                  color: isListening ? "#22d3ee" : speechStatus.startsWith("✓") ? "#10b981" : "#ff9b9b",
                  marginBottom: "6px",
                  fontWeight: "600",
                }}
              >
                {speechStatus}
              </div>
            )}

            <textarea
              placeholder="Anything authorities should know? Or click 'Speak to Dictate' to speak in Hindi or English..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="4"
              maxLength="500"
            />

            <div className="character-count">{description.length}/500</div>
          </div>

          {/* CITIZEN REWARD & SYNC INFO */}
          <div
            style={{
              background: "rgba(34, 211, 238, 0.04)",
              border: "1px dashed rgba(34, 211, 238, 0.25)",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <span style={{ fontSize: "14px" }}>🏆</span>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Civic Karma & Certificate Sync (Optional)
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "10px", color: "#8b9c9f", display: "block", marginBottom: "4px" }}>
                  Your Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ankit Kumar"
                  value={citizenName}
                  onChange={(e) => {
                    setCitizenName(e.target.value);
                    localStorage.setItem("roadwise_citizen_name", e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "rgba(10, 18, 22, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#f0f6f8",
                    fontSize: "12px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "#8b9c9f", display: "block", marginBottom: "4px" }}>
                  Mobile Number / Email
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={citizenContact}
                  onChange={(e) => {
                    setCitizenContact(e.target.value);
                    localStorage.setItem("roadwise_citizen_contact", e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    background: "rgba(10, 18, 22, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#f0f6f8",
                    fontSize: "12px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "#647478", marginTop: "6px" }}>
              Syncs your karma points and printable municipal certificate across all your devices.
            </div>
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <button
            type="submit"
            className="submit-report"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            <span>{loading ? "Analyzing & Submitting..." : "Submit Road Report"}</span>
            <span className="submit-arrow">{loading ? "⏳" : "→"}</span>
          </button>

          <p className="form-note">
            By submitting, you help authorities identify and prioritize road
            problems.
          </p>
        </form>
      </div>
    </section>
  );
}

export default ReportForm;
