import { useState } from "react";

function ReportForm() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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

  const getLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setError(
          "Location permission was denied. Please allow location access.",
        );
      },
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!image) {
      setError("Please upload a road damage image.");
      return;
    }

    if (!location) {
      setError("Please share your location.");
      return;
    }

    setError("");

    console.log({
      image,
      location,
      description,
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section className="report-section" id="report">
        <div className="success-card">
          <div className="success-icon">✓</div>

          <div className="success-label">REPORT RECEIVED</div>

          <h2>
            Thank you for
            <br />
            <span>making roads safer.</span>
          </h2>

          <p>
            Your road damage report has been recorded. Our system will analyze
            it and send it to the appropriate authorities.
          </p>

          <div className="success-id">
            <span>REPORT ID</span>
            <strong>RW-{Math.floor(Math.random() * 90000 + 10000)}</strong>
          </div>

          <button
            className="secondary-button"
            onClick={() => {
              setSubmitted(false);
              setImage(null);
              setPreview("");
              setLocation(null);
              setDescription("");
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
            >
              <span className="location-button-icon">
                {location ? "✓" : "⌖"}
              </span>

              <div>
                <strong>
                  {location ? "Location captured" : "Use my current location"}
                </strong>

                <small>
                  {location
                    ? `${location.latitude.toFixed(
                        5,
                      )}, ${location.longitude.toFixed(5)}`
                    : "We only use this to locate the issue"}
                </small>
              </div>

              {!location && <span className="button-arrow">→</span>}
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

          <button type="submit" className="submit-report">
            <span>Submit Road Report</span>
            <span className="submit-arrow">→</span>
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
