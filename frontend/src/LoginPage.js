import React, { useState } from "react";

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onLogin === "function") {
      onLogin({ email });
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Educative AI</h1>
        <p style={styles.subtitle}>
          Log in as an educator to create AI-powered quizzes and multiplayer games.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
            />
          </label>

          <button type="submit" style={styles.button}>
            Continue
          </button>
        </form>

        <p style={styles.hint}>
          Prototype — authentication is simulated. Any email/password works.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(circle at top, #0f172a, #020617 55%, #000 100%)",
    color: "#e5e7eb",
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(15,23,42,0.92)",
    borderRadius: 20,
    padding: "28px 24px 24px",
    boxShadow: "0 24px 60px rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.3)",
  },
  title: {
    fontSize: "1.7rem",
    fontWeight: 700,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: "0.9rem",
    opacity: 0.8,
    marginBottom: 20,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    fontSize: "0.8rem",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1f2937",
    background: "#020617",
    color: "#e5e7eb",
    fontSize: "0.9rem",
  },
  button: {
    marginTop: 10,
    padding: "10px 14px",
    borderRadius: 999,
    border: "none",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed, #ec4899)",
    color: "#f9fafb",
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: {
    marginTop: 16,
    fontSize: "0.75rem",
    opacity: 0.7,
    textAlign: "center",
  },
};

export default LoginPage;

