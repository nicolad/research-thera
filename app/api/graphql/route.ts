import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Lazy-initialize so Next.js HMR picks up resolver changes without a full restart
let handler: ReturnType<typeof startServerAndCreateNextHandler> | null = null;

function getHandler() {
  if (!handler) {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const apolloServer = new ApolloServer<GraphQLContext>({ schema });
    handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
      apolloServer,
      {
    context: async (req) => {
      // Get auth from Clerk
      const { userId } = await auth();

      // Get user email from Clerk
      let userEmail: string | undefined;
      if (userId) {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(userId);
          userEmail = user.emailAddresses[0]?.emailAddress;
        } catch (error) {
          console.error("Error fetching user from Clerk:", error);
        }
      }

      return {
        userId: userId || undefined,
        userEmail: userEmail,
      };
    },
  });
  }
  return handler;
}

export async function GET(request: NextRequest) {
  return getHandler()(request);
}

export async function POST(request: NextRequest) {
  return getHandler()(request);
}
