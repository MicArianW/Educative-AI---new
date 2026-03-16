require("dotenv").config();
console.log("KEY last4:", process.env.OPENAI_API_KEY?.slice(-4));
console.log("KEY len:", process.env.OPENAI_API_KEY?.length);
console.log("DB URL:", process.env.DATABASE_URL ? "✅ Set" : "❌ Not set");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

// Import from flat structure
const pool = require("./db");
const authRoutes = require("./auth");
const { verifyToken, optionalAuth } = require("./auth");
const dashboardRoutes = require("./dashboard");
const { generateGameId, generatePlayerId, getAvatar, getRandomColor, calculateScore, safeJsonParse } = require("./game");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://educativeai.netlify.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ==================== MOUNT ROUTES ====================
app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);

// In-memory game store
const games = {};
const socketToPlayer = {};

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
  "topic": "Brief topic name (2-4 words)",
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

  const topic = parsed.topic || "Quiz";

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

  return { topic, questions };
}

/** Helper: broadcast game state */
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

  playersData.sort((a, b) => b.score - a.score);

  io.to(gameId).emit("gameState", {
    gameId,
    gameName: game.gameName,
    topic: game.topic,
    status: game.status,
    hostId: game.hostId,
    players: playersData,
    totalQuestions: game.questions?.length || 0,
    currentQuestion: game.currentQuestion,
  });
}

/** Helper: send question */
function sendQuestion(gameId, questionIndex) {
  const game = games[gameId];
  if (!game || !game.questions[questionIndex]) return;

  const q = game.questions[questionIndex];
  game.currentQuestion = questionIndex;
  game.questionStartTime = Date.now();

  io.to(gameId).emit("question", {
    index: questionIndex,
    total: game.questions.length,
    question: q.question,
    options: q.options,
    timeLimit: 30,
  });
}

/** Helper: Save game results to database */
async function saveGameResults(gameId) {
  const game = games[gameId];
  if (!game || !game.dbGameId) return;

  try {
    await pool.query(
      `UPDATE games SET status = 'finished', finished_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [game.dbGameId]
    );

    const results = Object.entries(game.players)
      .map(([id, p]) => ({
        id,
        userId: p.userId,
        name: p.name,
        score: p.score,
        correctAnswers: p.answers.filter((a) => a?.correct).length,
      }))
      .sort((a, b) => b.score - a.score);

    for (let i = 0; i < results.length; i++) {
      const playerResult = results[i];
      const rank = i + 1;
      const isWinner = rank === 1;

      await pool.query(
        `UPDATE game_players 
         SET score = $1, correct_answers = $2, total_answers = $3, final_rank = $4
         WHERE game_id = $5 AND player_id = $6`,
        [playerResult.score, playerResult.correctAnswers, game.questions.length, rank, game.dbGameId, playerResult.id]
      );

      if (playerResult.userId) {
        await pool.query(
          `UPDATE users SET 
            total_points = total_points + $1,
            games_played = games_played + 1,
            games_won = games_won + $2,
            correct_answers = correct_answers + $3,
            total_answers = total_answers + $4
           WHERE id = $5`,
          [playerResult.score, isWinner ? 1 : 0, playerResult.correctAnswers, game.questions.length, playerResult.userId]
        );
      }
    }

    console.log(`💾 Game ${gameId} results saved to database`);
  } catch (error) {
    console.error("❌ Failed to save game results:", error);
  }
}

/* ==================== REST API ENDPOINTS ==================== */

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Educative AI Backend" });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

/**
 * POST /game/create
 * REQUIRES LOGIN - verifyToken middleware
 */
app.post("/game/create", verifyToken, upload.single("pdf"), async (req, res) => {
  try {
    const { hostName, gameName, numQuestions = 10 } = req.body;
    const userId = req.user.id;

    if (!hostName) return res.status(400).json({ error: "Host name is required" });
    if (!gameName) return res.status(400).json({ error: "Game name is required" });
    if (!req.file) return res.status(400).json({ error: "PDF is required to create a game" });

    const pdfData = await pdfParse(req.file.buffer);
    const text = (pdfData.text || "").trim();
    if (!text) return res.status(400).json({ error: "Could not extract text from PDF" });

    console.log("🤖 Generating questions from PDF...");
    const { topic, questions } = await generateStructuredQuizFromText(text, parseInt(numQuestions) || 10);
    console.log(`✅ Generated ${questions.length} questions about "${topic}"`);

    let gameId;
    do { gameId = generateGameId(); } while (games[gameId]);

    const playerId = generatePlayerId();

    // Save to database
    let dbGameId = null;
    try {
      const gameResult = await pool.query(
        `INSERT INTO games (game_code, name, topic, host_id, host_name, total_questions)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [gameId, gameName, topic, userId, hostName, questions.length]
      );
      dbGameId = gameResult.rows[0].id;

      for (let i = 0; i < questions.length; i++) {
        await pool.query(
          `INSERT INTO questions (game_id, question_index, question_text, options, correct_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [dbGameId, i, questions[i].question, JSON.stringify(questions[i].options), questions[i].correctIndex]
        );
      }

      await pool.query(
        `INSERT INTO game_players (game_id, user_id, player_name, player_id, is_host)
         VALUES ($1, $2, $3, $4, true)`,
        [dbGameId, userId, hostName, playerId]
      );

      await pool.query('UPDATE users SET games_hosted = games_hosted + 1 WHERE id = $1', [userId]);
      console.log(`💾 Game ${gameId} saved to database`);
    } catch (dbError) {
      console.error("⚠️ Database save failed:", dbError.message);
    }

    games[gameId] = {
      dbGameId,
      createdAt: Date.now(),
      hostId: playerId,
      hostName,
      gameName,
      topic,
      status: "waiting",
      questions,
      currentQuestion: -1,
      questionStartTime: null,
      players: {
        [playerId]: {
          userId,
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

    console.log(`🎮 Game ${gameId} created by ${hostName} (user: ${userId})`);

    res.json({ gameId, playerId, gameName, topic, totalQuestions: questions.length });
  } catch (error) {
    console.error("❌ /game/create error:", error);
    res.status(500).json({ error: "Failed to create game", details: error.message });
  }
});

/**
 * POST /game/join
 * Optional auth - logged in users get their stats tracked
 */
app.post("/game/join", optionalAuth, async (req, res) => {
  try {
    const { gameId, playerName } = req.body;
    const userId = req.user?.id || null;

    if (!gameId) return res.status(400).json({ error: "Game code is required" });

    const normalizedId = gameId.toUpperCase().trim();

    if (!games[normalizedId]) {
      return res.status(404).json({ error: "Game not found. Check the code and try again." });
    }

    const game = games[normalizedId];

    if (!playerName) return res.status(400).json({ error: "Player name is required" });
    if (game.status !== "waiting") return res.status(400).json({ error: "Game has already started" });

    const nameExists = Object.values(game.players).some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    );
    if (nameExists) return res.status(400).json({ error: "Name already taken in this game" });

    const playerId = generatePlayerId();

    // Save to database if game has dbGameId
    if (game.dbGameId) {
      try {
        await pool.query(
          `INSERT INTO game_players (game_id, user_id, player_name, player_id, is_host)
           VALUES ($1, $2, $3, $4, false)`,
          [game.dbGameId, userId, playerName, playerId]
        );
      } catch (dbError) {
        console.error("⚠️ Failed to save player to database:", dbError.message);
      }
    }

    game.players[playerId] = {
      userId,
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

    console.log(`👤 ${playerName} joined game ${normalizedId}${userId ? ` (user: ${userId})` : ''}`);

    const players = Object.entries(game.players).map(([id, p]) => ({
      id, name: p.name, avatar: p.avatar, color: p.color, isHost: p.isHost, isReady: p.isReady,
    }));

    res.json({
      gameId: normalizedId, playerId, gameName: game.gameName, topic: game.topic,
      totalQuestions: game.questions.length, players,
    });
  } catch (error) {
    console.error("❌ /game/join error:", error);
    res.status(500).json({ error: "Failed to join game", details: error.message });
  }
});

// GET /game/:gameId
app.get("/game/:gameId", (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  const game = games[gameId];

  if (!game) return res.status(404).json({ error: "Game not found" });

  const players = Object.entries(game.players).map(([id, p]) => ({
    id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, isHost: p.isHost, isReady: p.isReady,
  }));

  res.json({
    gameId, gameName: game.gameName, topic: game.topic, status: game.status,
    totalQuestions: game.questions.length, currentQuestion: game.currentQuestion, players,
  });
});

// GET /game/:gameId/results
app.get("/game/:gameId/results", (req, res) => {
  const gameId = req.params.gameId.toUpperCase();
  const game = games[gameId];

  if (!game) return res.status(404).json({ error: "Game not found" });

  const results = Object.entries(game.players)
    .map(([id, p]) => ({
      id, name: p.name, avatar: p.avatar, color: p.color, score: p.score,
      correctAnswers: p.answers.filter((a) => a.correct).length,
      totalQuestions: game.questions.length,
      avgTime: p.answers.length > 0 ? Math.round(p.answers.reduce((sum, a) => sum + a.time, 0) / p.answers.length) : 0,
    }))
    .sort((a, b) => b.score - a.score);

  res.json({ gameId, gameName: game.gameName, topic: game.topic, results });
});

/* ==================== SOCKET.IO EVENTS ==================== */

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("joinRoom", ({ gameId, playerId }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game) { socket.emit("error", { message: "Game not found" }); return; }
    if (!game.players[playerId]) { socket.emit("error", { message: "Player not found in this game" }); return; }

    socket.rooms.forEach((room) => { if (room !== socket.id) socket.leave(room); });
    socket.join(normalizedId);
    game.players[playerId].socketId = socket.id;
    socketToPlayer[socket.id] = { gameId: normalizedId, playerId };

    console.log(`🚪 ${game.players[playerId].name} joined room ${normalizedId}`);
    broadcastGameState(normalizedId);
  });

  socket.on("playerReady", ({ gameId, playerId, ready }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];
    if (!game || !game.players[playerId]) return;

    game.players[playerId].isReady = ready;
    broadcastGameState(normalizedId);
  });

  socket.on("startGame", ({ gameId, playerId }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game) { socket.emit("error", { message: "Game not found" }); return; }
    if (game.hostId !== playerId) { socket.emit("error", { message: "Only the host can start the game" }); return; }

    game.status = "playing";
    console.log(`🎮 Game ${normalizedId} started!`);

    // Update database
    if (game.dbGameId) {
      pool.query(`UPDATE games SET status = 'playing', started_at = CURRENT_TIMESTAMP WHERE id = $1`, [game.dbGameId])
        .catch(err => console.error("Failed to update game status:", err));
    }

    io.to(normalizedId).emit("gameStarted", { totalQuestions: game.questions.length });

    setTimeout(() => { sendQuestion(normalizedId, 0); }, 3000);
  });

  socket.on("submitAnswer", async ({ gameId, playerId, questionIndex, answerIndex }) => {
    try {
      const normalizedId = gameId?.toUpperCase();
      const game = games[normalizedId];
  
      if (!game || !game.players[playerId]) return;
      if (game.status !== "playing") return;
      if (questionIndex !== game.currentQuestion) return;
  
      const player = game.players[playerId];
      const question = game.questions[questionIndex];
  
      if (player.answers[questionIndex] !== undefined) return;
  
      const timeMs = Date.now() - game.questionStartTime;
      const correct = answerIndex === question.correctIndex;
      const points = calculateScore(timeMs, correct);
  
      player.answers[questionIndex] = { answer: answerIndex, time: timeMs, correct, points };
      player.score += points;
  
      console.log(`📝 ${player.name} answered Q${questionIndex + 1}: ${correct ? "✅" : "❌"} (+${points})`);
  
      socket.emit("answerResult", {
        questionIndex, correct, correctIndex: question.correctIndex, points, totalScore: player.score,
      });
  
      broadcastGameState(normalizedId);
  
      const allAnswered = Object.values(game.players).every((p) => p.answers[questionIndex] !== undefined);
  
      if (allAnswered) {
        setTimeout(() => {
          const nextIndex = questionIndex + 1;
          if (nextIndex < game.questions.length) {
            sendQuestion(normalizedId, nextIndex);
          } else {
            game.status = "finished";
            Object.values(game.players).forEach((p) => { p.finishedAt = Date.now(); });
  
            const finalResults = Object.entries(game.players)
              .map(([id, p]) => ({
                id, name: p.name, avatar: p.avatar, color: p.color, score: p.score,
                correctAnswers: p.answers.filter((a) => a?.correct).length,
              }))
              .sort((a, b) => b.score - a.score);
  
            io.to(normalizedId).emit("gameFinished", { results: finalResults });
            saveGameResults(normalizedId);
            console.log(`🏁 Game ${normalizedId} finished!`);
          }
        }, 3000);
      }
    } catch (error) {
      console.error("❌ submitAnswer error:", error);
    }
  });

  socket.on("timeUp", ({ gameId, questionIndex }) => {
    const normalizedId = gameId?.toUpperCase();
    const game = games[normalizedId];

    if (!game || game.status !== "playing") return;
    if (questionIndex !== game.currentQuestion) return;

    Object.values(game.players).forEach((player) => {
      if (player.answers[questionIndex] === undefined) {
        player.answers[questionIndex] = { answer: -1, time: 30000, correct: false, points: 0 };
      }
    });

    const question = game.questions[questionIndex];
    io.to(normalizedId).emit("questionEnded", { questionIndex, correctIndex: question.correctIndex });

    setTimeout(() => {
      const nextIndex = questionIndex + 1;
      if (nextIndex < game.questions.length) {
        sendQuestion(normalizedId, nextIndex);
      } else {
        game.status = "finished";
        const finalResults = Object.entries(game.players)
          .map(([id, p]) => ({
            id, name: p.name, avatar: p.avatar, color: p.color, score: p.score,
            correctAnswers: p.answers.filter((a) => a?.correct).length,
          }))
          .sort((a, b) => b.score - a.score);

        io.to(normalizedId).emit("gameFinished", { results: finalResults });
        saveGameResults(normalizedId);
        console.log(`🏁 Game ${normalizedId} finished!`);
      }
    }, 3000);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    const mapping = socketToPlayer[socket.id];
    if (mapping) {
      const { gameId, playerId } = mapping;
      const game = games[gameId];
      if (game && game.players[playerId]) {
        game.players[playerId].socketId = null;
        console.log(`👋 ${game.players[playerId].name} disconnected from ${gameId}`);
        broadcastGameState(gameId);
      }
      delete socketToPlayer[socket.id];
    }
  });
});

/* ==================== OLD ENDPOINT (backward compatibility) ==================== */

app.post("/generate-quiz", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF uploaded" });

    const pdfData = await pdfParse(req.file.buffer);
    const text = (pdfData.text || "").trim();
    if (!text) return res.status(400).json({ error: "Could not extract text from PDF" });

    const { questions } = await generateStructuredQuizFromText(text, 10);

    res.json({
      quiz: questions.map((q, i) => ({
        number: i + 1, question: q.question, options: q.options, answer: q.options[q.correctIndex],
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