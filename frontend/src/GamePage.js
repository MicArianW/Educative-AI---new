import React, { useState } from "react";

export default function GamePage() {
  const [stage, setStage] = useState("menu"); // menu → host → join → quiz → results
  const [gameId, setGameId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");

  const [pdf, setPdf] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState(null);

  // ------------------------------------
  // CREATE GAME (HOST)
  // ------------------------------------
  const handleCreateGame = async () => {
    const res = await fetch("http://localhost:3001/game/create", {
      method: "POST",
    });
    const data = await res.json();
    setGameId(data.gameId);
    setStage("host");
  };

  // ------------------------------------
  // JOIN GAME
  // ------------------------------------
  const handleJoinGame = async () => {
    if (!pdf || !name || !gameId) {
      alert("Enter name, game code, and upload PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("gameId", gameId);
    formData.append("name", name);
    formData.append("pdf", pdf);

    const res = await fetch("http://localhost:3001/game/join", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }

    setPlayerId(data.playerId);
    setQuestions(data.questions);
    setAnswers(Array(data.total).fill(null));
    setStage("quiz");
  };

  // ------------------------------------
  // SELECT ANSWER
  // ------------------------------------
  const handleAnswer = (idx) => {
    const updated = [...answers];
    updated[currentIndex] = idx;
    setAnswers(updated);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinishQuiz(updated);
    }
  };

  // ------------------------------------
  // FINISH QUIZ
  // ------------------------------------
  const handleFinishQuiz = async (finalAnswers) => {
    const res = await fetch("http://localhost:3001/game/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        playerId,
        answers: finalAnswers,
      }),
    });

    const data = await res.json();
    setResults(data);
    setStage("results");
  };

  // ------------------------------------
  // UI SCREENS
  // ------------------------------------

  if (stage === "menu") {
    return (
      <div style={styles.page}>
        <h1>Multiplayer Game</h1>

        <button style={styles.button} onClick={handleCreateGame}>
          Create Game
        </button>

        <button
          style={{ ...styles.button, background: "#475569" }}
          onClick={() => setStage("join")}
        >
          Join Game
        </button>
      </div>
    );
  }

  if (stage === "host") {
    return (
      <div style={styles.page}>
        <h1>Game Created!</h1>
        <h2>Share this code with students:</h2>

        <div style={styles.codeBox}>{gameId}</div>

        <button style={styles.button} onClick={() => alert("Waiting for players…")}>
          Waiting for players…
        </button>
      </div>
    );
  }

  if (stage === "join") {
    return (
      <div style={styles.page}>
        <h1>Join Game</h1>

        <input
          type="text"
          placeholder="Enter Game Code"
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          style={styles.input}
        />

        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <input type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files[0])} />

        <button style={styles.button} onClick={handleJoinGame}>
          Join & Upload PDF
        </button>
      </div>
    );
  }

  if (stage === "quiz") {
    const q = questions[currentIndex];

    return (
      <div style={styles.page}>
        <h1>Question {currentIndex + 1} / {questions.length}</h1>
        <p style={styles.question}>{q.question}</p>

        {q.options.map((opt, idx) => (
          <button
            key={idx}
            style={styles.option}
            onClick={() => handleAnswer(idx)}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (stage === "results") {
    return (
      <div style={styles.page}>
        <h1>Your Results</h1>
        <h2>
          Score: {results.score} / {results.total}
        </h2>

        <h3>Incorrect Answers</h3>
        {results.incorrect.length === 0 ? (
          <p>You got everything correct! 🎉</p>
        ) : (
          results.incorrect.map((item, i) => (
            <div key={i} style={styles.incorrectBox}>
              <p><strong>Q:</strong> {item.question}</p>
              <p><strong>Your Answer:</strong> {item.options[item.yourAnswerIndex]}</p>
              <p><strong>Correct:</strong> {item.options[item.correctIndex]}</p>
            </div>
          ))
        )}

        <h2>Ranking</h2>
        {results.ranking.map((p, i) => (
          <div key={i} style={styles.rankItem}>
            #{i + 1} — {p.name}: {p.score}/{p.total}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

const styles = {
  page: { padding: 20, textAlign: "center" },
  button: {
    marginTop: 12,
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#4f46e5",
    color: "white",
    cursor: "pointer",
    fontSize: "1rem",
  },
  input: {
    display: "block",
    margin: "10px auto",
    padding: "10px",
    width: "80%",
    borderRadius: 6,
  },
  codeBox: {
    fontSize: "2rem",
    fontWeight: "bold",
    background: "#e2e8f0",
    padding: "12px 18px",
    borderRadius: 8,
    margin: "10px auto",
    width: "fit-content",
  },
  question: {
    fontSize: "1.2rem",
    marginBottom: 20,
  },
  option: {
    display: "block",
    margin: "10px auto",
    padding: "10px 14px",
    width: "80%",
    borderRadius: 8,
    background: "#334155",
    color: "white",
    cursor: "pointer",
  },
  incorrectBox: {
    background: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    textAlign: "left",
  },
  rankItem: {
    fontSize: "1.1rem",
    marginTop: 6,
  },
};
