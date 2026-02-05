import "@radix-ui/themes/styles.css";
import type { Metadata } from "next";
import { ApolloProvider } from "./providers/ApolloProvider";

export const metadata: Metadata = {
  title: "ResearchThera.com",
  description: "Research-based therapeutic notes and reflections powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <ApolloProvider>{children}</ApolloProvider>
      </body>
    </html>
  );
}
