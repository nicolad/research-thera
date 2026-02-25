"use client";

import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Spinner,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useGetJournalEntriesQuery,
  useCreateJournalEntryMutation,
} from "../__generated__/hooks";

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  anxious: "😰",
  calm: "😌",
  angry: "😠",
  hopeful: "🌟",
  neutral: "😐",
};

export default function JournalPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const { data, loading, error, refetch } = useGetJournalEntriesQuery({
    fetchPolicy: "cache-and-network",
  });

  const [createJournalEntry] = useCreateJournalEntryMutation({
    onCompleted: (data) => {
      refetch();
      router.push(`/journal/${data.createJournalEntry.id}`);
    },
  });

  const entries = data?.journalEntries || [];

  const handleNewEntry = async () => {
    setCreating(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      await createJournalEntry({
        variables: {
          input: {
            content: "",
            entryDate: today,
            isPrivate: true,
          },
        },
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Flex direction="column" gap="6">
      <Flex justify="between" align="center">
        <Flex direction="column" gap="1">
          <Heading size="8">Journal</Heading>
          <Text size="3" color="gray">
            Track your thoughts, moods, and reflections
          </Text>
        </Flex>
        <Button
          onClick={handleNewEntry}
          disabled={creating}
          size="3"
        >
          {creating ? (
            <Spinner size="2" />
          ) : (
            <PlusIcon />
          )}
          New Entry
        </Button>
      </Flex>

      <Card>
        {loading && (
          <Flex justify="center" align="center" p="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading journal entries</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && entries.length === 0 && (
          <Flex direction="column" align="center" p="6" gap="3">
            <Text size="4" weight="bold">
              No journal entries yet
            </Text>
            <Text color="gray">
              Start writing your thoughts and reflections
            </Text>
            <Button onClick={handleNewEntry} disabled={creating}>
              {creating ? <Spinner size="2" /> : <PlusIcon />}
              Create First Entry
            </Button>
          </Flex>
        )}

        {!loading && !error && entries.length > 0 && (
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Heading size="4">Entries ({entries.length})</Heading>
            </Flex>

            <Flex direction="column" gap="3">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  onClick={() => router.push(`/journal/${entry.id}`)}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-2)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Flex justify="between" align="start">
                      <Flex align="center" gap="2">
                        {entry.mood && (
                          <Text size="4">
                            {MOOD_EMOJI[entry.mood] || "📝"}
                          </Text>
                        )}
                        <Heading size="3">
                          {entry.title || "Untitled Entry"}
                        </Heading>
                      </Flex>
                      <Flex gap="2" align="center">
                        {entry.isPrivate && (
                          <Badge variant="soft" color="gray" size="1">
                            Private
                          </Badge>
                        )}
                        <Text size="1" color="gray">
                          {new Date(entry.entryDate).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </Text>
                      </Flex>
                    </Flex>

                    {entry.content && (
                      <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
                        {entry.content.slice(0, 150)}
                        {entry.content.length > 150 && "..."}
                      </Text>
                    )}

                    <Flex gap="2" align="center" wrap="wrap">
                      {entry.mood && (
                        <Badge variant="soft" size="1">
                          {entry.mood}
                          {entry.moodScore !== null &&
                            entry.moodScore !== undefined &&
                            ` (${entry.moodScore}/10)`}
                        </Badge>
                      )}
                      {entry.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="outline" size="1">
                          {tag}
                        </Badge>
                      ))}
                      {entry.goal && (
                        <Badge variant="soft" color="indigo" size="1">
                          {entry.goal.title}
                        </Badge>
                      )}
                      {entry.familyMember && (
                        <Badge variant="soft" color="purple" size="1">
                          {entry.familyMember.firstName}
                        </Badge>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        )}
      </Card>
    </Flex>
  );
}
