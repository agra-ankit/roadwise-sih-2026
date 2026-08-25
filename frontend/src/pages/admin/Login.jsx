import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Temporary MVP login.
    // Backend authentication will be connected later.
    navigate("/admin/dashboard");
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
          <p>ADMIN ACCESS</p>
          <h2>Welcome back</h2>
          <span>Sign in to manage road damage reports.</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-field">
            <label>Email</label>

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

          <button type="submit" className="admin-login-button">
            Sign in
            <span>→</span>
          </button>
        </form>

        <p className="admin-login-note">
          Authorized RoadWise personnel only.
        </p>
      </div>
    </div>
  );
}

export default Login;