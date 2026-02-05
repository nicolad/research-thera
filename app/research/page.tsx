"use client";

import {
  Theme,
  Container,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
} from "@radix-ui/themes";
import { Header } from "../components/Header";

export default function ResearchPage() {
  // Sample research papers - you can expand this list
  const researchPapers = [
    {
      title: "The Work-from-Home Wage Premium",
      year: 2026,
      source: "Federal Reserve Bank of San Francisco Working Paper 2026-02 / CEPR DP20996",
      authors: "Huiyu Li, Julien Sauvagnat, Tom Schmitz",
    },
    {
      title: "The Welfare Implications of Job Retention Schemes",
      year: 2026,
      source: "IMF Working Paper 2026/015",
      authors: "John Bluedorn, Jorge Mondragon, Ippei Shibata et al.",
    },
    {
      title: "Measuring the Ins and Outs of Remote Work: New Evidence from the Gallup Workplace Panel",
      year: 2026,
      source: "AEA Annual Meeting 2026 program paper",
      authors: "Christos Makridis",
    },
  ];

  // Sample claim cards
  const claimCards = [
    {
      id: 1,
      claim: "The COVID-19 pandemic forced many organizations to implement remote working without prior analysis of organizational processes or employee expectations about work flexibility.",
      verdict: "SUPPORTED",
      confidence: 79,
      sources: 8,
    },
    {
      id: 2,
      claim: "Effective remote work implementation in the post-COVID era requires organizational support structures including formal procedures, evaluation systems, self-management tools, blended training programs, and supportive leadership.",
      verdict: "SUPPORTED",
      confidence: 90,
      sources: 8,
    },
    {
      id: 3,
      claim: "Remote work research shows distinct differences between pre-COVID and post-COVID implementations and outcomes.",
      verdict: "SUPPORTED",
      confidence: 89,
      sources: 8,
    },
  ];

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case "SUPPORTED":
        return "green";
      case "CONTRADICTED":
        return "red";
      case "MIXED":
        return "orange";
      case "INSUFFICIENT":
        return "gray";
      default:
        return "blue";
    }
  };

  return (
    <Theme
      appearance="dark"
      accentColor="indigo"
      grayColor="slate"
      radius="medium"
      scaling="100%"
    >
      <Container size="4" style={{ padding: "2rem" }}>
        <Flex direction="column" gap="6">
          <Header />

          <Flex direction="column" gap="2">
            <Heading size="8">State Of Remote Work</Heading>
            <Text size="3" color="gray">
              Research-backed evidence on remote work trends and outcomes
            </Text>
          </Flex>

          {/* Linked Research Section */}
          <Flex direction="column" gap="4">
            <Heading size="6">Linked Research ({researchPapers.length})</Heading>
            <Flex direction="column" gap="3">
              {researchPapers.map((paper, index) => (
                <Card key={index}>
                  <Flex direction="column" gap="2">
                    <Heading size="4">{paper.title}</Heading>
                    <Text size="2" color="gray">
                      {paper.year}
                    </Text>
                    <Text size="2" color="gray">
                      {paper.source}
                    </Text>
                    <Text size="2">{paper.authors}</Text>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>

          {/* Claim Cards Section */}
          <Flex direction="column" gap="4">
            <Heading size="6">Claim Cards ({claimCards.length})</Heading>
            <Flex direction="column" gap="3">
              {claimCards.map((card) => (
                <Card key={card.id}>
                  <Flex direction="column" gap="3">
                    <Text size="3">{card.claim}</Text>
                    <Flex gap="3" align="center" wrap="wrap">
                      <Badge color={getVerdictColor(card.verdict)} variant="soft">
                        {card.verdict}
                      </Badge>
                      <Badge color="blue" variant="outline">
                        {card.confidence}% confidence
                      </Badge>
                      <Text size="2" color="gray">
                        {card.sources} sources
                      </Text>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Container>
    </Theme>
  );
}
