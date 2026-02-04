/**
 * Update the remote Turso database to link the note to the goal
 */

import { tursoTools } from "@/src/mastra/tools/turso.tools";

async function main() {
  const userId = "demo-user";
  const noteId = 1;
  const goalId = 1;

  console.log("🔄 Updating note in remote database...\n");

  // Update the note to link to the goal
  await tursoTools.updateNote(noteId, userId, {
    entityId: goalId,
    entityType: "Goal",
  });

  console.log("✅ Updated note to link to goal\n");

  // Verify the update
  const note = await tursoTools.getNoteById(noteId, userId);
  
  if (!note) {
    console.error("❌ Note not found!");
    return;
  }

  console.log("📝 Updated Note:");
  console.log(`   ID: ${note.id}`);
  console.log(`   Slug: ${note.slug}`);
  console.log(`   Entity: ${note.entityType}/${note.entityId}`);
  console.log(`   Tags: ${note.tags.join(", ")}`);

  if (note.entityType === "Goal") {
    const goal = await tursoTools.getGoal(note.entityId, userId);
    console.log(`\n🎯 Linked Goal:`);
    console.log(`   ID: ${goal.id}`);
    console.log(`   Title: ${goal.title}`);
    console.log(`   Status: ${goal.status}`);
    console.log(`   Priority: ${goal.priority}`);
  }

  console.log("\n✅ Remote database updated successfully!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
