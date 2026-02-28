"use client";

import { useState, useEffect } from "react";
import { Box, Container, Flex, Heading, IconButton, Button, Separator } from "@radix-ui/themes";
import { GitHubLogoIcon, HamburgerMenuIcon, Cross1Icon } from "@radix-ui/react-icons";
import { usePathname } from "next/navigation";
import Link from "next/link";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { href: "/goals", label: "Goals" },
  { href: "/notes", label: "Notes" },
  { href: "/stories", label: "Stories" },
  { href: "/family", label: "Family" },
  { href: "/journal", label: "Journal" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <Box
      asChild
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10, 10, 18, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--gray-a4)",
        marginBottom: "var(--space-5)",
      }}
    >
      <header>
        <Container size="3" px="5">
          <Flex justify="between" align="center" py="3">
            {/* Left: logo + divider + nav */}
            <Flex align="center" gap="4">
              <Link
                href="/"
                aria-label="ResearchThera — home"
                style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}
              >
                <Heading
                  size="4"
                  style={{ letterSpacing: "-0.025em", whiteSpace: "nowrap" }}
                >
                  ResearchThera
                </Heading>
              </Link>

              {/* Desktop navigation */}
              <Separator
                orientation="vertical"
                className="desktop-only"
                style={{ height: "16px", opacity: 0.4 }}
              />

              <nav aria-label="Main navigation" className="desktop-nav">
                <Flex gap="5">
                  {NAV_LINKS.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <Button
                        key={link.href}
                        variant="ghost"
                        size="2"
                        color={isActive ? "indigo" : "gray"}
                        highContrast={isActive}
                        asChild
                        style={
                          isActive
                            ? { boxShadow: "inset 0 -2px 0 var(--indigo-9)" }
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

            {/* Right: user controls */}
            <Flex align="center" gap="3">
              <UserMenu />
              <IconButton
                asChild
                variant="ghost"
                size="2"
                color="gray"
                aria-label="View source on GitHub"
                className="desktop-only"
              >
                <a
                  href="https://github.com/nicolad/research-thera"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubLogoIcon width="16" height="16" />
                </a>
              </IconButton>

              {/* Mobile menu toggle */}
              <IconButton
                variant="ghost"
                size="2"
                color="gray"
                className="mobile-only"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <Cross1Icon width="18" height="18" />
                ) : (
                  <HamburgerMenuIcon width="18" height="18" />
                )}
              </IconButton>
            </Flex>
          </Flex>
        </Container>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <Box
            className="mobile-nav"
            style={{
              borderTop: "1px solid var(--gray-a4)",
              background: "rgba(10, 10, 18, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <Container size="3" px="5" py="4">
              <Flex direction="column" gap="2">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Button
                      key={link.href}
                      variant={isActive ? "soft" : "ghost"}
                      size="3"
                      color={isActive ? "indigo" : "gray"}
                      highContrast={isActive}
                      asChild
                      style={{ justifyContent: "flex-start", width: "100%" }}
                    >
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  );
                })}
                <Separator size="4" my="2" />
                <Button
                  variant="ghost"
                  size="3"
                  color="gray"
                  asChild
                  style={{ justifyContent: "flex-start", width: "100%" }}
                >
                  <a
                    href="https://github.com/nicolad/research-thera"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitHubLogoIcon width="16" height="16" />
                    View on GitHub
                  </a>
                </Button>
              </Flex>
            </Container>
          </Box>
        )}

        <style jsx global>{`
          @media (min-width: 769px) {
            .mobile-only {
              display: none !important;
            }
            .mobile-nav {
              display: none !important;
            }
          }
          @media (max-width: 768px) {
            .desktop-only {
              display: none !important;
            }
            .desktop-nav {
              display: none !important;
            }
          }
        `}</style>
      </header>
    </Box>
  );
}
