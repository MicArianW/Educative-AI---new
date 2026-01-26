require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * In-memory game store
 * games = {
 *   [gameId]: {
 *     createdAt,
 *     hostId,
 *     hostName,
 *     gameName,
 *     topic,
 *     status: 'waiting' | 'playing' | 'finished',
 *     questions: [{ question, options, correctIndex }],
 *     currentQuestion: 0,
 *     questionStartTime: null,
 *     players: {
 *       [odplayerId]: {
 *         odname,
 *         odavatar,
 *         socketId,
 *         answers: [{ answer, time, correct }],
 *         score,
 *         isHost,
 *         isReady,
 *         finishedAt
 *       }
 *     }
 *   }
 * }
 */
const games = {};

// Track socket -> player mapping
const socketToPlayer = {}; // { socketId: { gameId, playerId } }

/** Helper: create 6-character alphanumeric game code */
function generateGameId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Helper: create simple player id */
function generatePlayerId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Helper: get avatar letter from name */
function getAvatar(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

/** Helper: get random color for player */
function getRandomColor() {
  const colors = ["#00f5d4", "#9b5de5", "#ff6b6b", "#ffd93d", "#4cc9f0", "#ff9f1c", "#2ec4b6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

/** Helper: safely parse JSON from model output */
function safeJsonParse(maybeJson) {
  try {
    return JSON.parse(maybeJson);
  } catch (_) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = maybeJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e) {}
    }
    
    const first = maybeJson.indexOf("{");
    const last = maybeJson.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      const sliced = maybeJson.slice(first, last + 1);
      try {
        return JSON.parse(sliced);
      } catch (err2) {
        console.error("❌ Failed to parse JSON even after slicing:", err2);
      }
    }
    throw new Error("Model returned non-JSON content");
  }
}

/** Helper: call OpenAI to generate structured MCQ quiz */
async function generateStructuredQuizFromText(text, numQuestions = 10) {
  const clipped = text.replace(/\s+/g, " ").trim().slice(0, 8000);

  const prompt = `
You are an educational quiz generator.

Based ONLY on the text below, create EXACTLY ${numQuestions} multiple-choice questions.
Each question must have 4 options labeled A, B, C, D.
Make questions challenging but fair - test understanding, not memorization.

Return STRICT JSON with this shape (no markdown, no extra text):

{
  "questions": [
    {
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}

Rules:
- "questions" array must have exactly ${numQuestions} items
- "correctIndex" is 0-3 (index of correct answer in options array)
- Questions should cover different parts of the text
- Avoid trivial or obvious questions

TEXT:
${clipped}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a JSON-only quiz generator. Output valid JSON with no markdown formatting." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned empty content");

  const parsed = safeJsonParse(content);

  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("Model did not return a valid questions array");
  }

  // Validate and clean questions
  const questions = parsed.questions.slice(0, numQuestions).map((q, idx) => ({
    question: String(q.question || "").trim() || `Question ${idx + 1}`,
    options:
      Array.isArray(q.options) && q.options.length >= 4
        ? q.options.slice(0, 4).map((o) => String(o).trim())
        : ["Option A", "Option B", "Option C", "Option D"],
    correctIndex:
      typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4
        ? q.correctIndex
        : 0,
  }));

  return questions;
}

/** Helper: broadcast game state to all players in a game */
function broadcastGameState(gameId) {
  const game = games[gameId];
  if (!game) return;

  const playersData = Object.entries(game.players).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    score: p.score,
    isHost: p.isHost,
    isReady: p.isReady,
    currentAnswer: p.answers.length,
    finished: !!p.finishedAt,
  }));

  // Sort by score descending
  playersData.sort((a, b) => b.score - a.score);

  const state = {
    gameId,
    gameName: game.gameName,
    topic: game.topic,
    status: game.status,
    hostId: game.hostId,
    players: playersData,
    totalQuestions: game.questions?.length || 0,
    currentQuestion: game.currentQuestion,
  };

  io.to(gameId).emit("gameState", state);
}

/** Helper: send question to all players */
function sendQuestion(gameId, questionIndex) {
  const game = games[gameId];
  if (!game || !game.questions[questionIndex]) return;

  const q = game.questions[questionIndex];
  game.currentQuestion = questionIndex;
  game.questionStartTime = Date.now();

  // Send question WITHOUT correctIndex
  io.to(gameId).emit("question", {
    index: questionIndex,
    total: game.questions.length,
    question: q.question,
    options: q.options,
    timeLimit: 30, // 30 seconds per question
  });
}

/** Helper: calculate score based on time */
function calculateScore(timeMs, correct) {
  if (!correct) return 0;
  // Base 100 points, bonus for speed (max 30 seconds)
  const timeSec = Math.min(timeMs / 1000, 30);
  const timeBonus = Math.floor((1 - timeSec / 30) * 50); // 0-50 bonus points
  return 100 + timeBonus;
}

/* ==================== REST API ENDPOINTS ==================== */

/**
 * POST /game/create
 * multipart/form-data:
 *  - hostName (required)
 *  - gameName (required)
 *  - pdf (file, required)
 *  - numQuestions (optional, default 10)
 *
 * Returns: { gameId, playerId, gameName, topic, totalQuestions }
 */
app.post("/game/create", upload.single("pdf"), async (req, res) => {
  try {
    const { hostName, gameName, numQuestions = 10 } = req.body;

    if (!hostName) {
      return res.status(400).json({ error: "Host name is required" });
    }
    if (!gameName) {
      return res.status(400).json({ error: "Game name is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "PDF is required to create a game" });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = (pdfData.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    // Generate questions from PDF
    console.log("🤖 Generating questions from PDF...");
    const questions = await generateStructuredQuizFromText(text, parseInt(numQuestions) || 10);
    console.log(`✅ Generated ${questions.length} questions`);

    // Create game
    let gameId;
    do {
      gameId = generateGameId();
    } while (games[gameId]);

    const playerId = generatePlayerId();

    games[gameId] = {
      createdAt: Date.now(),
      hostId: playerId,
      hostName,
      gameName,
      topic: req.file.originalname || "Uploaded PDF",
      status: "waiting",
      questions,
      currentQuestion: -1,
      questionStartTime: null,
      players: {
        [playerId]: {
          name: hostName,
          avatar: getAvatar(hostName),
          color: getRandomColor(),
          socketId: null,
          answers: [],
          score: 0,
          isHost: true,
          isReady: true,
          finishedAt: null,
        },
      },
    };

    console.log(`🎮 Game ${gameId} created by ${hostName}`);

    res.json({
      gameId,
      playerId,
      gameName,
      topic: games[gameId].topic,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("❌ /game/create error:", error);
    res.status(500).json({ error: "Failed to create game", details: error.message });
  }
});

/**
 * POST /game/join
 * Body: { gameId, playerName }
 *
 * Returns: { gameId, playerId, gameName, topic, totalQuestions, players }
 */
app.post("/game/join", (req, res) => {
  try {
    const { gameId, playerName } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "Game code is required" });
    }

    const normalizedId = gameId.toUpperCase().trim();

    if (!games[normalizedId]) {
      return res.status(404).json({ error: "Game not found. Check the code and try again." });
    }

    const game = games[normalizedId];

    if (!playerName) {
      return res.status(400).json({ error: "Player name is required" });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({ error: "Game has already started" });
    }

    // Check if name already taken
    const nameExists = Object.values(game.players).some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameExists) {
      return res.status(400).json({ error: "Name already taken in this game" });
    }

    const playerId = generatePlayerId();

    game.players[playerId] = {
      name: playerName,
      avatar: getAvatar(playerName),
      color: getRandomColor(),
      socketId: null,
      answers: [],
      score: 0,
      isHost: false,
      isReady: false,
      finishedAt: null,
    };

    console.log(`👤 ${playerName} joined game ${normalizedId}`);

    // Get players list (without sensitive data)
    const players = Object.entries(game.players).map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      isHost: p.isHost,
      isReady: p.isReady,
    }));

    res.json({
      gameId: normalizedId,
      playerId,
      gameName: game.gameName,
      topic: game.topic,
      totalQuestions: game.questions.length,
      players,
    });
  } catch (error) {
    console.error("❌ /game/join error:", error);
    res.status(500).json({ error: "Failed to join game", details: error.message });
  }
});

/**
 * GET /game/:gameId
 * Returns game info (for reconnection or checking status)
 */
app.get("/game/:gameId", (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  const game = games[gameId];

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  const players = Object.entries(game.players).map(([id, p]) => ({
    id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    score: p.score,
    isHost: p.isHost,
    isReady: p.isReady,
  }));

  res.json({
    gameId,
    gameName: game.gameName,
    topic: game.topic,
    status: game.status,
    totalQuestions: game.questions.length,
    currentQuestion: game.currentQuestion,
    players,
  });
});

/**
 * GET /game/:gameId/results
 * Returns final results after game ends
 */
app.get("/game/:gameId/results", (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  const game = games[gameId];

  if (!game) {
    return res.status(404).json({ error: "Game not found" });
  }

  const results = Object.entries(game.players)
    .map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      score: p.score,
      correctAnswers: p.answers.filter((a) => a.correct).length,
      totalQuestions: game.questions.length,
      avgTime: p.answers.length > 0
        ? Math.round(p.answers.reduce((sum, a) => sum + a.time, 0) / p.answers.length)
        : 0,
    }))
    .sort((a, b) => b.score - a.score);

  res.json({
    gameId,
    gameName: game.gameName,
    topic: game.topic,
    results,
  });
});

/* ==================== SOCKET.IO EVENTS ==================== */

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  /**
   * Join game room (for real-time updates)
   * Data: { gameId, playerId }
   */
  socket.on("joinRoom", ({ gameId, playerId }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    if (!game.players[playerId]) {
      socket.emit("error", { message: "Player not found in this game" });
      return;
    }

    // Leave any previous rooms
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    // Join the game room
    socket.join(normalizedId);
    game.players[playerId].socketId = socket.id;
    socketToPlayer[socket.id] = { gameId: normalizedId, playerId };

    console.log(`🚪 ${game.players[playerId].name} joined room ${normalizedId}`);

    // Broadcast updated game state
    broadcastGameState(normalizedId);
  });

  /**
   * Player ready toggle
   */
  socket.on("playerReady", ({ gameId, playerId, ready }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game || !game.players[playerId]) return;

    game.players[playerId].isReady = ready;
    broadcastGameState(normalizedId);
  });

  /**
   * Host starts the game
   */
  socket.on("startGame", ({ gameId, playerId }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    if (game.hostId !== playerId) {
      socket.emit("error", { message: "Only the host can start the game" });
      return;
    }

    if (Object.keys(game.players).length < 1) {
      socket.emit("error", { message: "Need at least 1 player to start" });
      return;
    }

    // Start the game
    game.status = "playing";
    console.log(`🎮 Game ${normalizedId} started!`);

    io.to(normalizedId).emit("gameStarted", {
      totalQuestions: game.questions.length,
    });

    // Send first question after a short delay
    setTimeout(() => {
      sendQuestion(normalizedId, 0);
    }, 3000);
  });

  /**
   * Player submits an answer
   * Data: { gameId, playerId, questionIndex, answerIndex }
   */
  socket.on("submitAnswer", ({ gameId, playerId, questionIndex, answerIndex }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game || !game.players[playerId]) return;
    if (game.status !== "playing") return;
    if (questionIndex !== game.currentQuestion) return;

    const player = game.players[playerId];
    const question = game.questions[questionIndex];

    // Check if already answered this question
    if (player.answers[questionIndex] !== undefined) return;

    const timeMs = Date.now() - game.questionStartTime;
    const correct = answerIndex === question.correctIndex;
    const points = calculateScore(timeMs, correct);

    player.answers[questionIndex] = {
      answer: answerIndex,
      time: timeMs,
      correct,
      points,
    };
    player.score += points;

    console.log(
      `📝 ${player.name} answered Q${questionIndex + 1}: ${correct ? "✅" : "❌"} (+${points})`
    );

    // Send result to the player
    socket.emit("answerResult", {
      questionIndex,
      correct,
      correctIndex: question.correctIndex,
      points,
      totalScore: player.score,
    });

    // Broadcast updated scores
    broadcastGameState(normalizedId);

    // Check if all players have answered
    const allAnswered = Object.values(game.players).every(
      (p) => p.answers[questionIndex] !== undefined
    );

    if (allAnswered) {
      // Move to next question after delay
      setTimeout(() => {
        const nextIndex = questionIndex + 1;
        if (nextIndex < game.questions.length) {
          sendQuestion(normalizedId, nextIndex);
        } else {
          // Game finished
          game.status = "finished";
          Object.values(game.players).forEach((p) => {
            p.finishedAt = Date.now();
          });

          const finalResults = Object.entries(game.players)
            .map(([id, p]) => ({
              id,
              name: p.name,
              avatar: p.avatar,
              color: p.color,
              score: p.score,
              correctAnswers: p.answers.filter((a) => a?.correct).length,
            }))
            .sort((a, b) => b.score - a.score);

          io.to(normalizedId).emit("gameFinished", { results: finalResults });
          console.log(`🏁 Game ${normalizedId} finished!`);
        }
      }, 3000); // 3 second delay between questions
    }
  });

  /**
   * Time's up for a question (sent by host/any client when timer expires)
   */
  socket.on("timeUp", ({ gameId, questionIndex }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game || game.status !== "playing") return;
    if (questionIndex !== game.currentQuestion) return;

    // Mark all players who didn't answer as having missed
    Object.values(game.players).forEach((player) => {
      if (player.answers[questionIndex] === undefined) {
        player.answers[questionIndex] = {
          answer: -1,
          time: 30000,
          correct: false,
          points: 0,
        };
      }
    });

    // Reveal correct answer
    const question = game.questions[questionIndex];
    io.to(normalizedId).emit("questionEnded", {
      questionIndex,
      correctIndex: question.correctIndex,
    });

    // Move to next question
    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex < game.questions.length) {
        sendQuestion(normalizedId, nextIndex);
      } else {
        // Game finished
        game.status = "finished";
        const finalResults = Object.entries(game.players)
          .map(([id, p]) => ({
            id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            score: p.score,
            correctAnswers: p.answers.filter((a) => a?.correct).length,
          }))
          .sort((a, b) => b.score - a.score);

        io.to(normalizedId).emit("gameFinished", { results: finalResults });
        console.log(`🏁 Game ${normalizedId} finished!`);
      }
    }, 3000);
  });

  /**
   * Chat message (optional feature)
   */
  socket.on("chatMessage", ({ gameId, playerId, message }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game || !game.players[playerId]) return;

    io.to(normalizedId).emit("chatMessage", {
      playerId,
      playerName: game.players[playerId].name,
      message: message.slice(0, 200), // Limit message length
      timestamp: Date.now(),
    });
  });

  /**
   * Handle disconnection
   */
  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);

    const mapping = socketToPlayer[socket.id];
    if (mapping) {
      const { gameId, playerId } = mapping;
      const game = games[gameId];

      if (game && game.players[playerId]) {
        game.players[playerId].socketId = null;
        console.log(`👋 ${game.players[playerId].name} disconnected from ${gameId}`);

        // Broadcast to others
        broadcastGameState(gameId);
      }

      delete socketToPlayer[socket.id];
    }
  });
});

/* ==================== OLD ENDPOINT (kept for backward compatibility) ==================== */

app.post("/generate-quiz", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const text = (pdfData.text || "").trim();

    if (!text) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    const questions = await generateStructuredQuizFromText(text, 10);

    res.json({
      quiz: questions.map((q, i) => ({
        number: i + 1,
        question: q.question,
        options: q.options,
        answer: q.options[q.correctIndex],
      })),
    });
  } catch (error) {
    console.error("❌ /generate-quiz error:", error);
    res.status(500).json({ error: "Failed to generate quiz", details: error.message });
  }
});

/* ==================== START SERVER ==================== */

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});