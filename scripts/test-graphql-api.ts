/**
 * Test the GraphQL API directly to verify it returns the correct data
 */

async function testGraphQL() {
  const query = `
    query GetNote($slug: String, $userId: String!) {
      note(slug: $slug, userId: $userId) {
        id
        entityId
        entityType
        userId
        slug
        goal {
          id
          title
          status
          priority
        }
      }
    }
  `;

  const variables = {
    slug: "state-of-remote-work",
    userId: "demo-user"
  };

  console.log("🔍 Testing GraphQL API...\n");
  console.log("Query:", query);
  console.log("\nVariables:", JSON.stringify(variables, null, 2));

  try {
    const response = await fetch("http://localhost:3002/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const result = await response.json();
    
    console.log("\n📊 Response:");
    console.log(JSON.stringify(result, null, 2));

    if (result.data?.note) {
      const note = result.data.note;
      console.log("\n✅ Note found:");
      console.log(`   ID: ${note.id}`);
      console.log(`   Entity Type: ${note.entityType}`);
      console.log(`   Entity ID: ${note.entityId}`);
      
      if (note.goal) {
        console.log(`\n🎯 Goal:`)
        console.log(`   Title: ${note.goal.title}`);
        console.log(`   Status: ${note.goal.status}`);
        console.log(`   Priority: ${note.goal.priority}`);
      } else {
        console.log("\n❌ Goal is null!");
      }
    } else {
      console.log("\n❌ No note found or error occurred");
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
  }
}

testGraphQL();
