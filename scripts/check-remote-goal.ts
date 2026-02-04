/**
 * Check if goal exists in the remote Turso database
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const turso = createClient({ url, authToken });

async function checkGoal() {
  try {
    console.log("🎯 Checking for goal with ID 1...\n");
    
    const result = await turso.execute({
      sql: `SELECT * FROM goals WHERE id = ? AND user_id = ?`,
      args: [1, "demo-user"],
    });

    if (result.rows.length === 0) {
      console.log("❌ Goal #1 not found in remote database!");
      console.log("\n📋 All goals for user 'demo-user':");
      
      const allGoals = await turso.execute({
        sql: `SELECT id, title, status, priority, user_id FROM goals WHERE user_id = ?`,
        args: ["demo-user"],
      });
      
      if (allGoals.rows.length === 0) {
        console.log("   No goals found!");
      } else {
        allGoals.rows.forEach(row => {
          console.log(`   - ID ${row.id}: ${row.title} (${row.status}, ${row.priority})`);
        });
      }
    } else {
      const goal = result.rows[0];
      console.log("✅ Goal found!");
      console.log(`   ID: ${goal.id}`);
      console.log(`   Title: ${goal.title}`);
      console.log(`   Description: ${goal.description}`);
      console.log(`   Status: ${goal.status}`);
      console.log(`   Priority: ${goal.priority}`);
      console.log(`   User ID: ${goal.user_id}`);
      console.log(`   Created: ${goal.created_at}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkGoal();
