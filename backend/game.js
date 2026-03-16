// Game helper functions
// These are used by server.js for game logic

/** Helper: create 6-character alphanumeric game code */
function generateGameId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
  
  /** Helper: calculate score based on time */
  function calculateScore(timeMs, correct) {
    if (!correct) return 0;
    const timeSec = Math.min(timeMs / 1000, 30);
    const timeBonus = Math.floor((1 - timeSec / 30) * 50);
    return 100 + timeBonus;
  }
  
  /** Helper: safely parse JSON from model output */
  function safeJsonParse(maybeJson) {
    try {
      return JSON.parse(maybeJson);
    } catch (_) {
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
  
  module.exports = {
    generateGameId,
    generatePlayerId,
    getAvatar,
    getRandomColor,
    calculateScore,
    safeJsonParse
  };