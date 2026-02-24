"use client";

import { Flex, Heading, Text, IconButton, Button } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/goals", label: "Goals" },
  { href: "/notes", label: "Notes" },
  { href: "/family", label: "Family" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <Flex justify="between" align="start" mb="6">
      <Flex direction="column" gap="2">
        <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
          <Flex direction="column" gap="1" style={{ cursor: "pointer" }}>
            <Heading size="6">ResearchThera</Heading>
            <Text size="2" color="gray">
              Research-backed therapy notes and reflections powered by AI
            </Text>
          </Flex>
        </Link>
        <Flex gap="2">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant={pathname.startsWith(link.href) ? "soft" : "ghost"}
              size="1"
              color={pathname.startsWith(link.href) ? "indigo" : "gray"}
              asChild
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </Flex>
      </Flex>
      <Flex align="center" gap="4">
        <UserMenu />
        <IconButton asChild variant="ghost" size="3" color="gray" highContrast>
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
  );
}
