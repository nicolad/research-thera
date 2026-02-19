import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { NextRequest } from "next/server";
import { typeDefs } from "../../../schema/typeDefs.generated";
import { resolvers } from "../../../schema/resolvers.generated";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLContext } from "../../apollo/context";
import { auth, clerkClient } from "@clerk/nextjs/server";

const schema = makeExecutableSchema({ typeDefs, resolvers });
const apolloServer = new ApolloServer<GraphQLContext>({ schema });

// Cache user emails to avoid hitting Clerk rate limits
const emailCache = new Map<string, { email: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getUserEmail(userId: string): Promise<string | undefined> {
  const cached = emailCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.email;
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      emailCache.set(userId, { email, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return email;
  } catch (error) {
    // On rate limit, return stale cache if available
    if (cached) return cached.email;
    console.error("Error fetching user from Clerk:", error);
    return undefined;
  }
}

const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  apolloServer,
  {
    context: async (req) => {
      const { userId } = await auth();

      const userEmail = userId ? await getUserEmail(userId) : undefined;

      return {
        userId: userId || undefined,
        userEmail,
      };
    },
  },
);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
