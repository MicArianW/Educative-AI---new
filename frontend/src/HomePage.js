import React from "react";

export default function HomePage({
  user,
  onStartGame,
  onGenerateQuiz,
  onLogout,
}) {
  const displayName = user?.email?.split("@")[0] ?? "Educator";

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.logo}>🧠</span>
          <div>
            <div style={styles.title}>Educative AI</div>
            <div style={styles.subtitle}>Generative Quiz & Classroom Play</div>
          </div>
        </div>

        <nav style={styles.nav}>
          <button style={styles.navBtn}>Dashboard</button>
          <button style={styles.navBtn}>Play</button>
          <button style={styles.navBtn}>Create</button>
          <button style={styles.navBtn}>Classes</button>
          <button style={styles.navBtn}>Leaderboard</button>

          <div
            style={{
              width: 1,
              height: 24,
              background: "#334155",
              marginInline: 12,
            }}
          />

          <div style={styles.userChip}>
            <span style={{ opacity: 0.85 }}>Hi,&nbsp;</span>
            <strong>{displayName}</strong>
          </div>

          <button style={styles.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      {/* MAIN SECTION */}
      <main style={styles.main}>
        <section style={styles.hero}>
          <div>
            <h1 style={styles.h1}>
              Turn any topic into a playable quiz in seconds
            </h1>
            <p style={styles.lead}>
              Students upload a PDF on their favourite topic. Our AI generates
              questions, auto-grades answers, and ranks everyone in a live game.
            </p>

            <div style={styles.ctaRow}>
              <button style={styles.primary} onClick={onStartGame}>
                ➕ New Game
              </button>

              <button style={styles.secondary} onClick={onGenerateQuiz}>
                📄 Generate Quiz
              </button>

              <button style={styles.tertiary}>🏫 Join Classroom</button>
            </div>

            <div style={styles.badges}>
              <span style={styles.badge}>MCQ • Explanations</span>
              <span style={styles.badge}>Adaptive difficulty</span>
              <span style={styles.badge}>Live ranking</span>
            </div>
          </div>

          {/* RIGHT SIDE QUICK ACTIONS */}
          <div style={styles.heroCard}>
            <div style={styles.heroCardHeader}>Quick start</div>
            <div style={styles.quickGrid}>
              {quickItems.map((q, i) => (
                <button key={i} style={styles.quickItem}>
                  <div style={styles.quickIcon}>{q.icon}</div>
                  <div style={styles.quickTitle}>{q.title}</div>
                  <div style={styles.quickDesc}>{q.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <div>© {new Date().getFullYear()} Educative AI</div>
        <div style={{ opacity: 0.7 }}>Prototype build • v0.2</div>
      </footer>
    </div>
  );
}

/* ------------------------ QUICK ACTION BOXES ------------------------ */
const quickItems = [
  {
    icon: "📚",
    title: "Upload chapter PDF",
    desc: "Turn textbook sections into instant quizzes.",
  },
  {
    icon: "📝",
    title: "Exam review game",
    desc: "Students compete on past exam questions.",
  },
  {
    icon: "🎨",
    title: "Passion topics",
    desc: "Let students bring their own PDFs and learn together.",
  },
];

/* ----------------------------- STYLES ------------------------------ */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "Inter, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 40px",
    background: "#1e293b",
    borderBottom: "1px solid #334155",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  logo: {
    fontSize: "2rem",
  },

  title: {
    fontSize: "1.3rem",
    fontWeight: 600,
    marginBottom: -4,
  },

  subtitle: {
    fontSize: "0.8rem",
    opacity: 0.7,
  },

  nav: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },

  navBtn: {
    background: "transparent",
    border: "none",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "0.9rem",
    opacity: 0.8,
  },

  userChip: {
    padding: "6px 12px",
    borderRadius: 30,
    background: "#334155",
    color: "#f1f5f9",
    fontSize: "0.85rem",
  },

  logoutBtn: {
    background: "#ef4444",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },

  main: {
    padding: "40px",
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
  },

  h1: {
    fontSize: "2rem",
    fontWeight: 700,
    marginBottom: 12,
  },

  lead: {
    fontSize: "1rem",
    opacity: 0.8,
    marginBottom: 22,
    maxWidth: "480px",
  },

  ctaRow: {
    display: "flex",
    gap: 12,
    marginBottom: 22,
  },

  primary: {
    padding: "10px 18px",
    background: "#4f46e5",
    color: "white",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },

  secondary: {
    padding: "10px 18px",
    background: "#334155",
    color: "white",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },

  tertiary: {
    padding: "10px 18px",
    background: "#475569",
    color: "white",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
  },

  badges: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },

  badge: {
    padding: "6px 10px",
    borderRadius: 8,
    background: "#1e293b",
    border: "1px solid #334155",
    fontSize: "0.75rem",
  },

  heroCard: {
    width: "320px",
    background: "#1e293b",
    padding: 20,
    borderRadius: 12,
    border: "1px solid #334155",
  },

  heroCardHeader: {
    fontSize: "1rem",
    marginBottom: 14,
    fontWeight: 600,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  quickItem: {
    background: "#334155",
    padding: 12,
    borderRadius: 10,
    cursor: "pointer",
    border: "none",
    textAlign: "left",
    color: "white",
  },

  quickIcon: {
    fontSize: "1.4rem",
    marginBottom: 6,
  },

  quickTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
  },

  quickDesc: {
    fontSize: "0.75rem",
    opacity: 0.7,
  },

  footer: {
    padding: "20px",
    textAlign: "center",
    opacity: 0.6,
    fontSize: "0.85rem",
  },
};
