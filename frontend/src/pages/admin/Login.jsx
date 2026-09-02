import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@roadwise.in");
  const [password, setPassword] = useState("admin@roadwise");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginAdmin(email.trim(), password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Failed to sign in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail("admin@roadwise.in");
    setPassword("admin@roadwise");
    setError("");
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-brand">
          <div className="admin-logo">R</div>

          <div>
            <h1>RoadWise</h1>
            <span>Administration Portal</span>
          </div>
        </div>

        <div className="admin-login-heading">
          <p>MUNICIPAL ACCESS</p>
          <h2>Welcome back</h2>
          <span>Sign in to manage road damage reports & dispatch crews.</span>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(255, 77, 77, 0.12)",
              border: "1px solid rgba(255, 77, 77, 0.3)",
              color: "#ff6b6b",
              fontSize: "12px",
              marginBottom: "16px",
              textAlign: "left",
            }}
          >
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label>Email Address</label>

            <input
              type="email"
              placeholder="admin@roadwise.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="admin-field">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Authenticating..." : "Sign in to Dashboard"}
            <span>{loading ? "⏳" : "→"}</span>
          </button>
        </form>

        {/* Demo Credentials Quick-Fill Helper */}
        <div
          style={{
            marginTop: "16px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "rgba(34, 211, 238, 0.05)",
            border: "1px solid rgba(34, 211, 238, 0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            textAlign: "left",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", color: "#22d3ee", fontWeight: "800", textTransform: "uppercase" }}>
              DEMO CREDENTIALS
            </div>
            <div style={{ fontSize: "11px", color: "#8b9c9f", marginTop: "2px" }}>
              admin@roadwise.in / admin@roadwise
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickDemo}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(34, 211, 238, 0.15)",
              border: "1px solid rgba(34, 211, 238, 0.3)",
              color: "#22d3ee",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            ⚡ Auto Fill
          </button>
        </div>

        <p className="admin-login-note" style={{ marginTop: "14px" }}>
          Authorized RoadWise personnel and municipal supervisors only.
        </p>
      </div>
    </div>
  );
}

export default Login;