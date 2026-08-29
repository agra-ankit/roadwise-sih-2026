import { useState, useEffect, useRef } from "react";
import { createReport } from "../../services/api";

const SERVER_BASE = "http://localhost:5000";

function ReportForm() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportResult, setReportResult] = useState(null);

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

  const [locating, setLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");
  const [bestAccuracy, setBestAccuracy] = useState(null);

  const watchIdRef = useRef(null);
  const timeoutIdRef = useRef(null);

  const stopGpsWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopGpsWatch();
    };
  }, []);

  const getLocation = () => {
    setError("");
    stopGpsWatch();

    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      return;
    }

    setLocating(true);
    setGpsStatus("Finding your precise location...");
    setBestAccuracy(null);

    let readings = [];
    let currentBest = null;

    const finalizeLocation = (bestReading) => {
      stopGpsWatch();
      setLocating(false);

      if (bestReading) {
        setLocation({
          latitude: bestReading.latitude,
          longitude: bestReading.longitude,
          accuracy: bestReading.accuracy,
        });

        if (bestReading.accuracy > 30) {
          setGpsStatus(`Low GPS accuracy (~${Math.round(bestReading.accuracy)}m). Outdoor view recommended.`);
        } else {
          setGpsStatus(`✓ High-accuracy location found (±${Math.round(bestReading.accuracy)}m)`);
        }
      } else {
        setError("Unable to acquire location reading. Please try again.");
      }
    };

    // 10-second acquisition timeout safeguard
    timeoutIdRef.current = setTimeout(() => {
      finalizeLocation(currentBest);
    }, 10000);

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const reading = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          readings.push(reading);

          if (!currentBest || reading.accuracy < currentBest.accuracy) {
            currentBest = reading;
            setBestAccuracy(Math.round(reading.accuracy));
            setGpsStatus(`Improving location... Best accuracy: ±${Math.round(reading.accuracy)}m`);
          }

          // Early success: accuracy <= 12m or 5 valid readings collected
          if (reading.accuracy <= 12 || readings.length >= 5) {
            finalizeLocation(currentBest);
          }
        },
        (err) => {
          stopGpsWatch();
          setLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setError("Location permission denied. Please allow location access in your browser.");
          } else if (err.code === err.TIMEOUT) {
            if (currentBest) {
              finalizeLocation(currentBest);
            } else {
              setError("GPS location request timed out. Please try again or check location settings.");
            }
          } else {
            setError("Unable to determine your location. Please try again.");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        }
      );

      watchIdRef.current = watchId;
    } catch (e) {
      stopGpsWatch();
      setLocating(false);
      setError("Failed to initiate GPS location acquisition.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!image) {
      setError("Please upload a road damage image.");
      return;
    }

    if (!location) {
      setError("Please share your location.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("latitude", String(location.latitude));
      formData.append("longitude", String(location.longitude));

      if (typeof location.accuracy === "number") {
        formData.append("locationAccuracy", String(location.accuracy));
      }

      if (description && description.trim()) {
        formData.append("description", description.trim());
      }

      const response = await createReport(formData);
      setReportResult(response);
      setSubmitted(true);
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
    const reportId =
      report._id || `RW-${Math.floor(Math.random() * 90000 + 10000)}`;
    const displayImg = getImageUrl(report.imageUrl);

    return (
      <section className="report-section" id="report">
        <div className="success-card">
          <div className="success-icon">✓</div>

          <div className="success-label">REPORT RECEIVED & AI ANALYZED</div>

          <h2>
            Thank you for
            <br />
            <span>making roads safer.</span>
          </h2>

          <p>
            Your road damage report has been analyzed by AI and stored
            securely in the database.
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
              background: "rgba(34, 211, 238, 0.04)",
              border: "1px solid rgba(34, 211, 238, 0.2)",
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
                    border: "1px solid rgba(34, 211, 238, 0.3)",
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#22d3ee",
                    fontWeight: "700",
                    letterSpacing: "1px",
                    marginBottom: "4px",
                  }}
                >
                  AI DETECTED ISSUE
                </div>
                <h4 style={{ margin: 0, fontSize: "18px", color: "#f0f6f8" }}>
                  {damageText}
                </h4>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#8b9c9f",
                    marginTop: "4px",
                  }}
                >
                  Status:{" "}
                  <span style={{ color: "#22d3ee", fontWeight: "600" }}>
                    {statusText}
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
              Location
              <span>Required</span>
            </label>

            <button
              type="button"
              className={`location-button ${
                location ? "location-success" : ""
              }`}
              onClick={getLocation}
              disabled={locating}
            >
              <span className="location-button-icon">
                {locating ? "⏳" : location ? "✓" : "⌖"}
              </span>

              <div>
                <strong>
                  {locating
                    ? "Capturing GPS location..."
                    : location
                    ? "Location captured"
                    : "Use my current location"}
                </strong>

                <small>
                  {locating
                    ? "Requesting high-accuracy positioning..."
                    : location
                    ? `${location.latitude.toFixed(
                        5,
                      )}, ${location.longitude.toFixed(5)}${
                        typeof location.accuracy === "number"
                          ? ` (±${Math.round(location.accuracy)}m)`
                          : ""
                      }`
                    : "We only use this to locate the issue"}
                </small>
              </div>

              {!location && !locating && <span className="button-arrow">→</span>}
            </button>
          </div>

          {/* DESCRIPTION */}

          <div className="form-group">
            <label>
              Description
              <span>Optional</span>
            </label>

            <textarea
              placeholder="Anything authorities should know? For example: traffic is affected, near school, very deep pothole..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="4"
              maxLength="500"
            />

            <div className="character-count">{description.length}/500</div>
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
