"use client";

import { Box, Flex, Heading, Text, IconButton, Button } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/goals", label: "Goals" },
  { href: "/journal", label: "Journal" },
  { href: "/notes", label: "Notes" },
  { href: "/stories", label: "Stories" },
  { href: "/family", label: "Family" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <Box asChild>
      <header>
        <Flex justify="between" align="center" mb="6">
          <Flex direction="column" gap="2">
            <Link
              href="/"
              aria-label="ResearchThera — home"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Flex direction="column" gap="1">
                <Heading size="6">ResearchThera</Heading>
                <Text size="2" color="gray">
                  Your personal space for therapy notes, goals, and research-backed insights
                </Text>
              </Flex>
            </Link>
            <nav aria-label="Main navigation">
              <Flex gap="2">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Button
                      key={link.href}
                      variant={isActive ? "soft" : "ghost"}
                      size="2"
                      color={isActive ? "indigo" : "gray"}
                      asChild
                      style={
                        isActive
                          ? { borderBottom: "2px solid var(--indigo-9)" }
                          : undefined
                      }
                    >
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  );
                })}
              </Flex>
            </nav>
          </Flex>
          <Flex align="center" gap="4">
            <UserMenu />
            <IconButton
              asChild
              variant="ghost"
              size="3"
              color="gray"
              highContrast
              aria-label="View source on GitHub"
            >
              <a
                href="https://github.com/nicolad/research-thera"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GitHubLogoIcon width="20" height="20" />
              </a>
            </IconButton>
          </Flex>
        </Flex>
      </header>
    </Box>
  );
}
