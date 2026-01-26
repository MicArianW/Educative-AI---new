import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

// ==================== CONFIG ====================
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ==================== STYLES ====================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap');

  :root {
    --bg-primary: #f8fafc;
    --bg-secondary: #ffffff;
    --bg-card: #ffffff;
    --bg-card-hover: #f1f5f9;
    --bg-input: #f1f5f9;
    --accent-cyan: #06b6d4;
    --accent-purple: #8b5cf6;
    --accent-coral: #f43f5e;
    --accent-gold: #f59e0b;
    --accent-blue: #3b82f6;
    --accent-green: #10b981;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --border-color: #e2e8f0;
    --border-hover: #cbd5e1;
    --success: #10b981;
    --error: #ef4444;
    --gradient-main: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
    --gradient-warm: linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%);
    --gradient-cool: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Outfit', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
  }

  .app-container {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #e0f2fe 50%, #f0fdf4 100%);
    position: relative;
  }

  .app-container::before {
    content: '';
    position: fixed;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .app-container::after {
    content: '';
    position: fixed;
    bottom: -50%;
    left: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .font-display { font-family: 'Orbitron', sans-serif; }

  /* Navigation */
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 70px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    z-index: 1000;
    box-shadow: var(--shadow-sm);
  }

  .logo {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
  }

  .logo-icon {
    width: 44px;
    height: 44px;
    background: var(--gradient-main);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    -webkit-text-fill-color: white;
    box-shadow: var(--shadow-md);
  }

  .nav-user {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .user-name {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .user-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1.1rem;
    color: white;
    box-shadow: var(--shadow-md);
  }

  /* Main Content */
  .main-content {
    padding-top: 100px;
    padding-bottom: 40px;
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px;
  }

  .container-sm {
    max-width: 550px;
    margin: 0 auto;
    padding: 0 20px;
  }

  /* Page Header */
  .page-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .page-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 12px;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .page-subtitle {
    color: var(--text-secondary);
    font-size: 1.15rem;
  }

  /* Cards */
  .card {
    background: var(--bg-card);
    border-radius: 24px;
    border: 1px solid var(--border-color);
    padding: 32px;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-md);
  }

  .card:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .card-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  /* Buttons */
  .btn {
    padding: 14px 28px;
    border-radius: 14px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: 'Outfit', sans-serif;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--gradient-main);
    color: white;
    box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
  }

  .btn-secondary {
    background: var(--bg-input);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: var(--accent-cyan);
    background: white;
  }

  .btn-danger {
    background: var(--accent-coral);
    color: white;
  }

  .btn-lg {
    padding: 18px 36px;
    font-size: 1.1rem;
  }

  .btn-block {
    width: 100%;
  }

  /* Input Fields */
  .input-group {
    margin-bottom: 24px;
  }

  .input-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  .input {
    width: 100%;
    padding: 16px 20px;
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    border-radius: 14px;
    color: var(--text-primary);
    font-size: 1rem;
    font-family: 'Outfit', sans-serif;
    transition: all 0.3s ease;
  }

  .input:focus {
    outline: none;
    border-color: var(--accent-cyan);
    background: white;
    box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.1);
  }

  .input::placeholder {
    color: var(--text-muted);
  }

  .input-code {
    text-align: center;
    font-size: 2rem;
    letter-spacing: 12px;
    font-family: 'Orbitron', sans-serif;
    text-transform: uppercase;
    font-weight: 600;
  }

  /* File Upload */
  .file-upload {
    border: 2px dashed var(--border-color);
    border-radius: 20px;
    padding: 50px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: var(--bg-input);
  }

  .file-upload:hover {
    border-color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.05);
  }

  .file-upload.has-file {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.05);
    border-style: solid;
  }

  .file-upload-icon {
    font-size: 3.5rem;
    margin-bottom: 16px;
  }

  .file-upload-text {
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-weight: 500;
  }

  .file-upload-hint {
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .file-name {
    color: var(--success);
    font-weight: 600;
    margin-top: 12px;
  }

  /* Game Code Display */
  .game-code-display {
    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
    border: 2px solid rgba(6, 182, 212, 0.2);
    border-radius: 20px;
    padding: 36px;
    text-align: center;
    margin: 30px 0;
  }

  .game-code {
    font-family: 'Orbitron', sans-serif;
    font-size: 3.5rem;
    font-weight: 700;
    letter-spacing: 14px;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
  }

  .game-code-label {
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;
  }

  /* Lobby */
  .lobby-info {
    text-align: center;
    margin-bottom: 30px;
  }

  .lobby-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 2rem;
    margin-bottom: 8px;
    color: var(--text-primary);
  }

  .lobby-topic {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }

  .players-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
    margin: 30px 0;
  }

  .player-card {
    background: var(--bg-input);
    border-radius: 20px;
    padding: 24px;
    text-align: center;
    border: 2px solid var(--border-color);
    transition: all 0.3s ease;
  }

  .player-card.host {
    border-color: var(--accent-gold);
    background: rgba(245, 158, 11, 0.08);
  }

  .player-card.ready {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.08);
  }

  .player-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 auto 14px;
    color: white;
    box-shadow: var(--shadow-md);
  }

  .player-name {
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--text-primary);
  }

  .player-status {
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .player-status.host {
    color: var(--accent-gold);
  }

  .player-status.ready {
    color: var(--success);
  }

  /* Quiz Interface */
  .quiz-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .quiz-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 30px;
    padding: 20px 28px;
    background: white;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
  }

  .quiz-progress {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .progress-bar {
    width: 160px;
    height: 10px;
    background: var(--bg-input);
    border-radius: 5px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--gradient-main);
    border-radius: 5px;
    transition: width 0.5s ease;
  }

  .quiz-timer {
    font-family: 'Orbitron', sans-serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent-coral);
    min-width: 90px;
    text-align: center;
  }

  .quiz-timer.warning {
    animation: timerPulse 0.5s infinite;
  }

  @keyframes timerPulse {
    0%, 100% { color: var(--accent-coral); transform: scale(1); }
    50% { color: var(--accent-gold); transform: scale(1.1); }
  }

  .quiz-score {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--accent-gold);
  }

  .quiz-question-card {
    background: white;
    border-radius: 28px;
    border: 1px solid var(--border-color);
    padding: 44px;
    margin-bottom: 30px;
    box-shadow: var(--shadow-lg);
  }

  .question-number {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.9rem;
    color: var(--accent-cyan);
    margin-bottom: 18px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 600;
  }

  .question-text {
    font-size: 1.5rem;
    font-weight: 500;
    line-height: 1.6;
    color: var(--text-primary);
  }

  .answer-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .answer-option {
    padding: 22px 26px;
    background: white;
    border: 2px solid var(--border-color);
    border-radius: 18px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 18px;
    font-size: 1.1rem;
    text-align: left;
    box-shadow: var(--shadow-sm);
  }

  .answer-option:hover:not(.disabled) {
    border-color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.05);
    transform: translateX(8px);
    box-shadow: var(--shadow-md);
  }

  .answer-option.selected {
    border-color: var(--accent-cyan);
    background: rgba(6, 182, 212, 0.1);
  }

  .answer-option.correct {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.15);
  }

  .answer-option.incorrect {
    border-color: var(--error);
    background: rgba(239, 68, 68, 0.15);
  }

  .answer-option.disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .answer-letter {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--bg-input);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Orbitron', sans-serif;
    font-weight: 600;
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .answer-option.selected .answer-letter {
    background: var(--accent-cyan);
    color: white;
  }

  .answer-option.correct .answer-letter {
    background: var(--success);
    color: white;
  }

  .answer-option.incorrect .answer-letter {
    background: var(--error);
    color: white;
  }

  /* Live Scoreboard */
  .live-scoreboard {
    position: fixed;
    right: 30px;
    top: 100px;
    width: 300px;
    background: white;
    border-radius: 24px;
    border: 1px solid var(--border-color);
    padding: 24px;
    z-index: 100;
    box-shadow: var(--shadow-xl);
  }

  .scoreboard-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.85rem;
    color: var(--accent-purple);
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 600;
  }

  .live-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-coral);
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.9); }
  }

  .scoreboard-player {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    margin-bottom: 10px;
    transition: all 0.3s ease;
    background: var(--bg-input);
  }

  .scoreboard-player.you {
    background: rgba(6, 182, 212, 0.12);
    border: 2px solid rgba(6, 182, 212, 0.3);
  }

  .scoreboard-player.first {
    background: rgba(245, 158, 11, 0.12);
  }

  .scoreboard-rank {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    width: 30px;
    color: var(--text-muted);
  }

  .scoreboard-rank.gold { color: var(--accent-gold); }
  .scoreboard-rank.silver { color: #94a3b8; }
  .scoreboard-rank.bronze { color: #b45309; }

  .scoreboard-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    color: white;
  }

  .scoreboard-name {
    flex: 1;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .scoreboard-score {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    color: var(--accent-purple);
  }

  /* Results */
  .results-container {
    text-align: center;
    padding: 40px 20px;
  }

  .results-trophy {
    font-size: 7rem;
    margin-bottom: 24px;
    animation: bounce 1s ease infinite;
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px); }
  }

  .results-position {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.2rem;
    color: var(--accent-purple);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 4px;
    font-weight: 600;
  }

  .results-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 3rem;
    margin-bottom: 40px;
    color: var(--text-primary);
  }

  .results-score-display {
    font-family: 'Orbitron', sans-serif;
    font-size: 6rem;
    font-weight: 700;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 40px;
  }

  .results-stats {
    display: flex;
    justify-content: center;
    gap: 60px;
    margin-bottom: 50px;
  }

  .result-stat {
    text-align: center;
  }

  .result-stat-value {
    font-family: 'Orbitron', sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .result-stat-label {
    color: var(--text-secondary);
    font-size: 1rem;
    font-weight: 500;
  }

  .final-leaderboard {
    max-width: 500px;
    margin: 0 auto 40px;
  }

  .final-leaderboard-title {
    font-family: 'Orbitron', sans-serif;
    font-size: 1rem;
    color: var(--accent-purple);
    margin-bottom: 20px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 600;
  }

  /* Loading States */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-color);
    border-top-color: var(--accent-cyan);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    color: var(--text-secondary);
    font-size: 1.1rem;
    font-weight: 500;
  }

  /* Error States */
  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-radius: 14px;
    padding: 16px 20px;
    color: var(--error);
    margin-bottom: 20px;
    text-align: center;
    font-weight: 500;
  }

  /* Countdown */
  .countdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.98);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .countdown-number {
    font-family: 'Orbitron', sans-serif;
    font-size: 14rem;
    font-weight: 900;
    background: var(--gradient-main);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: countdownPulse 1s ease infinite;
  }

  @keyframes countdownPulse {
    0% { transform: scale(0.8); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }

  .countdown-text {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.8rem;
    color: var(--text-secondary);
    margin-top: 20px;
    font-weight: 600;
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .live-scoreboard { display: none; }
  }

  @media (max-width: 768px) {
    .navbar { padding: 0 20px; }
    .container { padding: 0 20px; }
    .page-title { font-size: 2rem; }
    .quiz-question-card { padding: 28px; }
    .question-text { font-size: 1.2rem; }
    .game-code { font-size: 2.5rem; letter-spacing: 10px; }
    .results-score-display { font-size: 4rem; }
    .results-stats { gap: 30px; }
    .countdown-number { font-size: 8rem; }
  }
`;

// ==================== SOCKET CONNECTION ====================
let socket = null;

function connectSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

// ==================== COMPONENTS ====================

// Navigation
const Navbar = ({ user, onLogoClick }) => (
  <nav className="navbar">
    <div className="logo" onClick={onLogoClick}>
      <div className="logo-icon">🧠</div>
      EDUCATIVE AI
    </div>
    {user && (
      <div className="nav-user">
        <span className="user-name">{user.name}</span>
        <div className="user-avatar" style={{ background: user.color || 'var(--gradient-main)' }}>
          {user.avatar}
        </div>
      </div>
    )}
  </nav>
);

// Home Screen - Choose Create or Join
const HomeScreen = ({ onCreateGame, onJoinGame }) => (
  <div className="container-sm">
    <div className="page-header">
      <h1 className="page-title">🧠 Educative AI</h1>
      <p className="page-subtitle">Challenge your friends to AI-powered quiz battles!</p>
    </div>

    <div className="card" style={{ marginBottom: '20px', cursor: 'pointer' }} onClick={onCreateGame}>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '20px' }}>🎯</div>
        <h3 className="card-title">Create Game</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Upload a PDF and invite friends to compete
        </p>
      </div>
    </div>

    <div className="card" style={{ cursor: 'pointer' }} onClick={onJoinGame}>
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '20px' }}>🚀</div>
        <h3 className="card-title">Join Game</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Enter a code to join a friend's game
        </p>
      </div>
    </div>
  </div>
);

// Create Game Screen
const CreateGameScreen = ({ onBack, onGameCreated }) => {
  const [hostName, setHostName] = useState('');
  const [gameName, setGameName] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hostName.trim() || !gameName.trim() || !pdfFile) {
      setError('Please fill in all fields and upload a PDF');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('hostName', hostName.trim());
      formData.append('gameName', gameName.trim());
      formData.append('pdf', pdfFile);

      const response = await fetch(`${API_URL}/game/create`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      onGameCreated({
        ...data,
        name: hostName.trim(),
        avatar: hostName.trim().charAt(0).toUpperCase(),
        isHost: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-sm">
      <div className="page-header">
        <h1 className="page-title">Create Game</h1>
        <p className="page-subtitle">Upload your study material and challenge friends</p>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              maxLength={20}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Game Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., Biology Chapter 5 Quiz"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              maxLength={50}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Upload Study Material (PDF)</label>
            <div
              className={`file-upload ${pdfFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="file-upload-icon">{pdfFile ? '✅' : '📄'}</div>
              <div className="file-upload-text">
                {pdfFile ? 'PDF Selected!' : 'Click to upload PDF'}
              </div>
              <div className="file-upload-hint">
                AI will generate quiz questions from this document
              </div>
              {pdfFile && <div className="file-name">{pdfFile.name}</div>}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading || !hostName.trim() || !gameName.trim() || !pdfFile}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 20, height: 20, marginBottom: 0, borderWidth: 3 }}></span>
                Generating Questions...
              </>
            ) : (
              <>🎮 Create Game</>
            )}
          </button>
        </form>

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: '16px' }}
          onClick={onBack}
          disabled={loading}
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

// Join Game Screen
const JoinGameScreen = ({ onBack, onGameJoined }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || gameCode.length !== 6) {
      setError('Please enter your name and a valid 6-character game code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/game/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameCode.toUpperCase(),
          playerName: playerName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join game');
      }

      onGameJoined({
        ...data,
        name: playerName.trim(),
        avatar: playerName.trim().charAt(0).toUpperCase(),
        isHost: false,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-sm">
      <div className="page-header">
        <h1 className="page-title">Join Game</h1>
        <p className="page-subtitle">Enter the code shared by your friend</p>
      </div>

      <div className="card">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Your Name</label>
            <input
              type="text"
              className="input"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Game Code</label>
            <input
              type="text"
              className="input input-code"
              placeholder="ABC123"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={6}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading || !playerName.trim() || gameCode.length !== 6}
          >
            {loading ? 'Joining...' : '🚀 Join Game'}
          </button>
        </form>

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: '16px' }}
          onClick={onBack}
          disabled={loading}
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

// Game Lobby - Waiting for players
const GameLobby = ({ gameData, user, onStartGame, onLeave }) => {
  const [gameState, setGameState] = useState(null);
  const [isReady, setIsReady] = useState(user.isHost);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const socket = connectSocket();

    // Join the socket room
    socket.emit('joinRoom', {
      gameId: gameData.gameId,
      playerId: gameData.playerId,
    });

    // Listen for game state updates
    socket.on('gameState', (state) => {
      setGameState(state);
    });

    socket.on('gameStarted', () => {
      onStartGame();
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return () => {
      socket.off('gameState');
      socket.off('gameStarted');
      socket.off('error');
    };
  }, [gameData.gameId, gameData.playerId, onStartGame]);

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('playerReady', {
      gameId: gameData.gameId,
      playerId: gameData.playerId,
      ready: newReady,
    });
  };

  const handleStart = () => {
    socket.emit('startGame', {
      gameId: gameData.gameId,
      playerId: gameData.playerId,
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameData.gameId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const players = gameState?.players || gameData.players || [];

  // Color palette for players
  const playerColors = ['#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="container-sm">
      <div className="lobby-info">
        <h1 className="lobby-title">{gameData.gameName}</h1>
        <p className="lobby-topic">📚 {gameData.topic}</p>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>
          {gameData.totalQuestions} questions
        </p>
      </div>

      <div className="game-code-display">
        <div className="game-code">{gameData.gameId}</div>
        <div className="game-code-label">Share this code with friends</div>
        <button
          className="btn btn-secondary"
          style={{ marginTop: '20px' }}
          onClick={copyCode}
        >
          {copied ? '✓ Copied!' : '📋 Copy Code'}
        </button>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '20px', textAlign: 'center' }}>
          👥 Players ({players.length})
        </h3>

        <div className="players-grid">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`player-card ${player.isHost ? 'host' : ''} ${player.isReady ? 'ready' : ''}`}
            >
              <div
                className="player-avatar"
                style={{ background: player.color || playerColors[index % playerColors.length] }}
              >
                {player.avatar}
              </div>
              <div className="player-name">
                {player.name}
                {player.id === gameData.playerId && ' (You)'}
              </div>
              <div className={`player-status ${player.isHost ? 'host' : player.isReady ? 'ready' : ''}`}>
                {player.isHost ? '👑 Host' : player.isReady ? '✓ Ready' : '⏳ Waiting...'}
              </div>
            </div>
          ))}
        </div>

        {user.isHost ? (
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleStart}
            disabled={players.length < 1}
          >
            🎮 Start Game
          </button>
        ) : (
          <button
            className={`btn ${isReady ? 'btn-secondary' : 'btn-primary'} btn-lg btn-block`}
            onClick={handleReady}
          >
            {isReady ? '✓ Ready!' : '✋ Ready Up'}
          </button>
        )}

        <button
          className="btn btn-secondary btn-block"
          style={{ marginTop: '12px' }}
          onClick={onLeave}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
};

// Game Countdown
const GameCountdown = ({ onComplete }) => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  return (
    <div className="countdown-overlay">
      <div className="countdown-number">{count || 'GO!'}</div>
      <div className="countdown-text">Get Ready!</div>
    </div>
  );
};

// Active Quiz Game
const QuizGame = ({ gameData, user, onGameEnd }) => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(gameData.totalQuestions);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [players, setPlayers] = useState([]);
  const [showCountdown, setShowCountdown] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('question', (data) => {
      setCurrentQuestion(data);
      setQuestionIndex(data.index);
      setTotalQuestions(data.total);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setTimeLeft(data.timeLimit || 30);
    });

    socket.on('answerResult', (result) => {
      setAnswerResult(result);
      setScore(result.totalScore);
    });

    socket.on('questionEnded', (data) => {
      if (!answerResult) {
        setAnswerResult({
          correct: false,
          correctIndex: data.correctIndex,
          points: 0,
        });
      }
    });

    socket.on('gameState', (state) => {
      setPlayers(state.players || []);
    });

    socket.on('gameFinished', (data) => {
      onGameEnd(data.results);
    });

    return () => {
      socket.off('question');
      socket.off('answerResult');
      socket.off('questionEnded');
      socket.off('gameState');
      socket.off('gameFinished');
    };
  }, [onGameEnd, answerResult]);

  // Timer
  useEffect(() => {
    if (showCountdown || !currentQuestion || answerResult) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Notify server time's up
          socket.emit('timeUp', {
            gameId: gameData.gameId,
            questionIndex: questionIndex,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [currentQuestion, showCountdown, answerResult, gameData.gameId, questionIndex]);

  const handleAnswer = (answerIndex) => {
    if (selectedAnswer !== null || answerResult) return;

    setSelectedAnswer(answerIndex);
    clearInterval(timerRef.current);

    socket.emit('submitAnswer', {
      gameId: gameData.gameId,
      playerId: gameData.playerId,
      questionIndex: questionIndex,
      answerIndex: answerIndex,
    });
  };

  if (showCountdown) {
    return <GameCountdown onComplete={() => setShowCountdown(false)} />;
  }

  if (!currentQuestion) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Waiting for question...</div>
      </div>
    );
  }

  const getOptionClass = (idx) => {
    let className = 'answer-option';
    if (answerResult) {
      className += ' disabled';
      if (idx === answerResult.correctIndex) {
        className += ' correct';
      } else if (idx === selectedAnswer && !answerResult.correct) {
        className += ' incorrect';
      }
    } else if (selectedAnswer === idx) {
      className += ' selected';
    }
    return className;
  };

  // Color palette for players
  const playerColors = ['#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="container">
      <div className="quiz-container">
        <div className="quiz-header">
          <div className="quiz-progress">
            <span className="font-display" style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>
              {questionIndex + 1}/{totalQuestions}
            </span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>

          <div className={`quiz-timer ${timeLeft <= 10 ? 'warning' : ''}`}>
            {timeLeft}s
          </div>

          <div className="quiz-score">⭐ {score}</div>
        </div>

        <div className="quiz-question-card">
          <div className="question-number">Question {questionIndex + 1}</div>
          <h2 className="question-text">{currentQuestion.question}</h2>
        </div>

        <div className="answer-options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className={getOptionClass(idx)}
              onClick={() => handleAnswer(idx)}
              disabled={selectedAnswer !== null || answerResult}
            >
              <span className="answer-letter">{String.fromCharCode(65 + idx)}</span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        {answerResult && (
          <div style={{ textAlign: 'center', marginTop: '28px', padding: '20px', background: answerResult.correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '16px' }}>
            <div style={{
              fontSize: '1.4rem',
              fontWeight: '700',
              color: answerResult.correct ? 'var(--success)' : 'var(--error)',
              marginBottom: '8px'
            }}>
              {answerResult.correct ? '✅ Correct!' : '❌ Wrong!'}
            </div>
            <div style={{ color: 'var(--accent-gold)', fontWeight: '600', fontSize: '1.1rem' }}>
              +{answerResult.points} points
            </div>
          </div>
        )}
      </div>

      {/* Live Scoreboard */}
      <div className="live-scoreboard">
        <div className="scoreboard-title">
          <span className="live-indicator"></span>
          Live Scores
        </div>
        {players
          .sort((a, b) => b.score - a.score)
          .map((player, idx) => (
            <div
              key={player.id}
              className={`scoreboard-player ${player.id === gameData.playerId ? 'you' : ''} ${idx === 0 ? 'first' : ''}`}
            >
              <span className={`scoreboard-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                #{idx + 1}
              </span>
              <div className="scoreboard-avatar" style={{ background: player.color || playerColors[idx % playerColors.length] }}>
                {player.avatar}
              </div>
              <span className="scoreboard-name">
                {player.id === gameData.playerId ? 'You' : player.name}
              </span>
              <span className="scoreboard-score">{player.score}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

// Results Screen
const ResultsScreen = ({ results, user, gameData, onPlayAgain, onHome }) => {
  const myResult = results.find((r) => r.id === gameData.playerId);
  const myRank = results.findIndex((r) => r.id === gameData.playerId) + 1;

  const getTrophy = () => {
    if (myRank === 1) return '🏆';
    if (myRank === 2) return '🥈';
    if (myRank === 3) return '🥉';
    return '🎮';
  };

  const getPositionText = () => {
    if (myRank === 1) return '1st Place';
    if (myRank === 2) return '2nd Place';
    if (myRank === 3) return '3rd Place';
    return `${myRank}th Place`;
  };

  // Color palette for players
  const playerColors = ['#06b6d4', '#8b5cf6', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'];

  return (
    <div className="container">
      <div className="results-container">
        <div className="results-trophy">{getTrophy()}</div>
        <div className="results-position">{getPositionText()}</div>
        <h1 className="results-title">
          {myRank === 1 ? 'Victory!' : myRank <= 3 ? 'Great Job!' : 'Game Over!'}
        </h1>

        <div className="results-score-display">{myResult?.score || 0}</div>

        <div className="results-stats">
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--success)' }}>
              {myResult?.correctAnswers || 0}
            </div>
            <div className="result-stat-label">Correct</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--error)' }}>
              {(gameData.totalQuestions || 10) - (myResult?.correctAnswers || 0)}
            </div>
            <div className="result-stat-label">Wrong</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-value" style={{ color: 'var(--accent-purple)' }}>
              {myResult ? Math.round((myResult.correctAnswers / gameData.totalQuestions) * 100) : 0}%
            </div>
            <div className="result-stat-label">Accuracy</div>
          </div>
        </div>

        <div className="final-leaderboard">
          <div className="final-leaderboard-title">🏅 Final Standings</div>
          {results.map((player, idx) => (
            <div
              key={player.id}
              className={`scoreboard-player ${player.id === gameData.playerId ? 'you' : ''} ${idx === 0 ? 'first' : ''}`}
            >
              <span className={`scoreboard-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                #{idx + 1}
              </span>
              <div className="scoreboard-avatar" style={{ background: player.color || playerColors[idx % playerColors.length] }}>
                {player.avatar}
              </div>
              <span className="scoreboard-name">
                {player.name} {player.id === gameData.playerId && '(You)'}
              </span>
              <span className="scoreboard-score">{player.score}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={onHome}>
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
export default function App() {
  const [screen, setScreen] = useState('home'); // home, create, join, lobby, playing, results
  const [user, setUser] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [results, setResults] = useState(null);

  const handleCreateGame = () => setScreen('create');
  const handleJoinGame = () => setScreen('join');
  const handleBack = () => setScreen('home');

  const handleGameCreated = (data) => {
    setUser({
      name: data.name,
      avatar: data.avatar,
      color: '#06b6d4',
      isHost: true,
    });
    setGameData(data);
    setScreen('lobby');
  };

  const handleGameJoined = (data) => {
    setUser({
      name: data.name,
      avatar: data.avatar,
      color: '#8b5cf6',
      isHost: false,
    });
    setGameData(data);
    setScreen('lobby');
  };

  const handleStartGame = () => {
    setScreen('playing');
  };

  const handleGameEnd = (finalResults) => {
    setResults(finalResults);
    setScreen('results');
  };

  const handleLeave = () => {
    setUser(null);
    setGameData(null);
    setResults(null);
    setScreen('home');
  };

  const handleLogoClick = () => {
    if (screen === 'playing') return; // Don't allow leaving during game
    handleLeave();
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app-container">
        <Navbar user={user} onLogoClick={handleLogoClick} />

        <main className="main-content">
          {screen === 'home' && (
            <HomeScreen onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />
          )}

          {screen === 'create' && (
            <CreateGameScreen onBack={handleBack} onGameCreated={handleGameCreated} />
          )}

          {screen === 'join' && (
            <JoinGameScreen onBack={handleBack} onGameJoined={handleGameJoined} />
          )}

          {screen === 'lobby' && gameData && (
            <GameLobby
              gameData={gameData}
              user={user}
              onStartGame={handleStartGame}
              onLeave={handleLeave}
            />
          )}

          {screen === 'playing' && gameData && (
            <QuizGame gameData={gameData} user={user} onGameEnd={handleGameEnd} />
          )}

          {screen === 'results' && results && (
            <ResultsScreen
              results={results}
              user={user}
              gameData={gameData}
              onHome={handleLeave}
            />
          )}
        </main>
      </div>
    </>
  );
}

