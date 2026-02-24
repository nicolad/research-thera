"use client";
import { Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { ChevronRightIcon } from "@radix-ui/react-icons";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

export function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  return (
    <Flex align="center" gap="1" wrap="wrap">
      {crumbs.map((crumb, i) => (
        <Flex key={i} align="center" gap="1">
          {i > 0 && (
            <ChevronRightIcon width="12" height="12" color="var(--gray-9)" />
          )}
          {crumb.href ? (
            <Link href={crumb.href} style={{ textDecoration: "none" }}>
              <Text size="1" color="indigo">
                {crumb.label}
              </Text>
            </Link>
          ) : (
            <Text size="1" color="gray">
              {crumb.label}
            </Text>
          )}
        </Flex>
      ))}
    </Flex>
  );
}
