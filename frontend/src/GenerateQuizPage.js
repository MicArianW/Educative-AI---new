import React, { useState } from "react";

export default function GenerateQuizPage() {
  const [file, setFile] = useState(null);
  const [quizText, setQuizText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = (e) => {
    setFile(e.target.files[0] || null);
    setQuizText("");
  };

  const handleGenerate = async () => {
    if (!file) {
      alert("Please upload a PDF first.");
      return;
    }

    setLoading(true);
    setQuizText("");

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("http://localhost:3001/generate-quiz", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Request failed");
      }

      const data = await res.json();
      setQuizText(data.quiz || "No questions generated.");
    } catch (err) {
      console.error("Client error:", err);
      setQuizText("❌ Error generating quiz. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Generate AI Quiz</h1>
        <p style={styles.subheading}>
          Upload a PDF and let Educative AI generate multi-choice questions for your class.
        </p>

        <div style={styles.uploadRow}>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            style={styles.fileInput}
          />
        </div>

        <button
          onClick={handleGenerate}
          style={loading ? styles.buttonDisabled : styles.button}
          disabled={loading}
        >
          {loading ? "Generating…" : "Generate Quiz"}
        </button>

        <div style={styles.output}>
          {quizText || "No questions generated."}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: "80px",
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
  },
  card: {
    width: "720px",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "24px",
    boxShadow: "0 30px 80px rgba(15,23,42,0.18)",
  },
  heading: {
    fontSize: "2.1rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "10px",
  },
  subheading: {
    fontSize: "1rem",
    color: "#475569",
    marginBottom: "30px",
  },
  uploadRow: {
    marginBottom: "24px",
  },
  fileInput: {
    fontSize: "0.95rem",
  },
  button: {
    width: "100%",
    padding: "15px",
    background: "#2563eb",
    color: "white",
    fontWeight: 600,
    fontSize: "1rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    marginBottom: "24px",
  },
  buttonDisabled: {
    width: "100%",
    padding: "15px",
    background: "#94a3b8",
    color: "white",
    fontWeight: 600,
    fontSize: "1rem",
    borderRadius: "999px",
    border: "none",
    cursor: "not-allowed",
    marginBottom: "24px",
  },
  output: {
    background: "#f1f5f9",
    padding: "20px",
    borderRadius: "16px",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    color: "#0f172a",
    minHeight: "80px",
  },
};
