/**
 * Create the goal in the remote Turso database
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

async function createGoal() {
  try {
    console.log("🎯 Creating goal in remote database...\n");
    
    const result = await turso.execute({
      sql: `INSERT INTO goals (family_member_id, user_id, title, description, status, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            RETURNING id, title, status, priority`,
      args: [
        1, // family_member_id
        "demo-user", // user_id
        "Strengthen Resilience in a Tough Job Search", // title
        "Build emotional resilience and maintain motivation during a challenging job search process, focusing on coping strategies and maintaining a positive mindset despite setbacks.", // description
        "active", // status
        "high", // priority
      ],
    });

    if (result.rows.length > 0) {
      const goal = result.rows[0];
      console.log("✅ Goal created successfully!");
      console.log(`   ID: ${goal.id}`);
      console.log(`   Title: ${goal.title}`);
      console.log(`   Status: ${goal.status}`);
      console.log(`   Priority: ${goal.priority}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

createGoal();
