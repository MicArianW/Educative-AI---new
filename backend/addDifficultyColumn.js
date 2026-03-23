// addDifficultyColumn.js
// Run this once to add the difficulty column to your games table
// Usage: node addDifficultyColumn.js

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log("🔧 Adding difficulty column to games table...");
  
  try {
    // Add the column (IF NOT EXISTS makes it safe to run multiple times)
    await pool.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) DEFAULT 'medium'
    `);
    
    console.log("✅ Difficulty column added successfully!");
    
    // Verify
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'games' AND column_name = 'difficulty'
    `);
    
    if (result.rows.length > 0) {
      console.log("📋 Column details:", result.rows[0]);
    }
    
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();