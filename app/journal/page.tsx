"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  Dialog,
  TextArea,
  TextField,
  Select,
  Switch,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import {
  useGetJournalEntriesQuery,
  useCreateJournalEntryMutation,
} from "../__generated__/hooks";

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy", emoji: "\u{1F60A}" },
  { value: "calm", label: "Calm", emoji: "\u{1F60C}" },
  { value: "grateful", label: "Grateful", emoji: "\u{1F64F}" },
  { value: "anxious", label: "Anxious", emoji: "\u{1F630}" },
  { value: "sad", label: "Sad", emoji: "\u{1F622}" },
  { value: "frustrated", label: "Frustrated", emoji: "\u{1F624}" },
  { value: "hopeful", label: "Hopeful", emoji: "\u{1F31F}" },
  { value: "reflective", label: "Reflective", emoji: "\u{1F914}" },
];

function getMoodEmoji(mood: string | null | undefined): string {
  if (!mood) return "";
  const found = MOOD_OPTIONS.find((m) => m.value === mood);
  return found ? found.emoji : "";
}

function getMoodColor(
  mood: string | null | undefined,
): "green" | "blue" | "yellow" | "orange" | "red" | "purple" | "gray" {
  switch (mood) {
    case "happy":
      return "green";
    case "calm":
      return "blue";
    case "grateful":
      return "purple";
    case "anxious":
      return "orange";
    case "sad":
      return "blue";
    case "frustrated":
      return "red";
    case "hopeful":
      return "yellow";
    case "reflective":
      return "purple";
    default:
      return "gray";
  }
}

export default function JournalPage() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterMood, setFilterMood] = useState<string>("");

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [moodScore, setMoodScore] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [tags, setTags] = useState("");

  const { data, loading, error } = useGetJournalEntriesQuery({
    variables: filterMood ? { mood: filterMood } : {},
  });

  const [createEntry, { loading: creating }] = useCreateJournalEntryMutation({
    refetchQueries: ["GetJournalEntries"],
    onCompleted: () => {
      setDialogOpen(false);
      resetForm();
    },
  });

  function resetForm() {
    setTitle("");
    setContent("");
    setMood("");
    setMoodScore("");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setTags("");
  }

  async function handleCreate() {
    if (!content.trim()) return;

    await createEntry({
      variables: {
        input: {
          title: title.trim() || null,
          content: content.trim(),
          mood: mood || null,
          moodScore: moodScore ? parseInt(moodScore, 10) : null,
          entryDate,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      },
    });
  }

  const entries = data?.journalEntries || [];

  // Group entries by date
  const grouped = entries.reduce(
    (acc: Record<string, typeof entries>, entry) => {
      const date = entry.entryDate;
      if (!acc[date]) acc[date] = [];
      acc[date].push(entry);
      return acc;
    },
    {},
  );

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" gap="1">
        <Flex justify="between" align="center">
          <Heading size="8">Journal</Heading>
          <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
            <Dialog.Trigger>
              <Button size="3">
                <PlusIcon />
                New Entry
              </Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="500px">
              <Dialog.Title>New Journal Entry</Dialog.Title>
              <Dialog.Description size="2" color="gray" mb="4">
                Record your thoughts, feelings, and reflections.
              </Dialog.Description>

              <Flex direction="column" gap="4">
                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    Date
                  </Text>
                  <TextField.Root
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </label>

                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    Title (optional)
                  </Text>
                  <TextField.Root
                    placeholder="Give this entry a title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    How are you feeling?
                  </Text>
                  <Select.Root value={mood} onValueChange={setMood}>
                    <Select.Trigger placeholder="Select mood..." />
                    <Select.Content>
                      {MOOD_OPTIONS.map((m) => (
                        <Select.Item key={m.value} value={m.value}>
                          {m.emoji} {m.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </label>

                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    Mood score (1-10)
                  </Text>
                  <TextField.Root
                    type="number"
                    min="1"
                    max="10"
                    placeholder="Rate your mood 1-10"
                    value={moodScore}
                    onChange={(e) => setMoodScore(e.target.value)}
                  />
                </label>

                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    What&apos;s on your mind?
                  </Text>
                  <TextArea
                    placeholder="Write your thoughts here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                  />
                </label>

                <label>
                  <Text size="2" weight="medium" mb="1" as="p">
                    Tags (comma-separated)
                  </Text>
                  <TextField.Root
                    placeholder="e.g. therapy, mindfulness, progress"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </label>
              </Flex>

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={!content.trim() || creating}
                >
                  {creating ? "Saving..." : "Save Entry"}
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
        <Text size="3" color="gray">
          Track your therapeutic journey through daily reflections
        </Text>
      </Flex>

      {/* Mood filter */}
      <Flex gap="2" align="center" wrap="wrap">
        <Text size="2" color="gray">
          Filter:
        </Text>
        <Button
          size="1"
          variant={filterMood === "" ? "solid" : "soft"}
          color="gray"
          onClick={() => setFilterMood("")}
        >
          All
        </Button>
        {MOOD_OPTIONS.map((m) => (
          <Button
            key={m.value}
            size="1"
            variant={filterMood === m.value ? "solid" : "soft"}
            color={getMoodColor(m.value)}
            onClick={() =>
              setFilterMood(filterMood === m.value ? "" : m.value)
            }
          >
            {m.emoji} {m.label}
          </Button>
        ))}
      </Flex>

      {loading && (
        <Flex justify="center" align="center" p="6">
          <Spinner size="3" />
        </Flex>
      )}

      {error && (
        <Card>
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading journal entries</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        </Card>
      )}

      {!loading && !error && entries.length === 0 && (
        <Card>
          <Flex direction="column" align="center" p="6" gap="3">
            <Text size="6">
              {"\u{1F4D3}"}
            </Text>
            <Text size="4" weight="bold">
              {filterMood
                ? "No entries with this mood"
                : "Start your journal"}
            </Text>
            <Text size="2" color="gray">
              {filterMood
                ? "Try a different filter or create a new entry"
                : "Click \"New Entry\" to write your first journal entry"}
            </Text>
          </Flex>
        </Card>
      )}

      {!loading &&
        !error &&
        sortedDates.map((date) => (
          <Flex direction="column" gap="3" key={date}>
            <Text size="2" weight="bold" color="gray">
              {new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>

            {grouped[date].map((entry) => (
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
                    <Flex gap="2" align="center">
                      {entry.mood && (
                        <Text size="4">{getMoodEmoji(entry.mood)}</Text>
                      )}
                      <Heading size="3">
                        {entry.title || "Untitled Entry"}
                      </Heading>
                    </Flex>
                    <Flex gap="2" align="center">
                      {entry.mood && (
                        <Badge
                          variant="soft"
                          color={getMoodColor(entry.mood)}
                          size="1"
                        >
                          {entry.mood}
                        </Badge>
                      )}
                      {entry.moodScore && (
                        <Badge variant="outline" size="1">
                          {entry.moodScore}/10
                        </Badge>
                      )}
                    </Flex>
                  </Flex>

                  <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
                    {entry.content.slice(0, 200)}
                    {entry.content.length > 200 && "..."}
                  </Text>

                  <Flex gap="2" align="center" wrap="wrap">
                    {entry.tags?.map((tag, idx) => (
                      <Badge key={idx} variant="outline" size="1">
                        {tag}
                      </Badge>
                    ))}
                    {entry.goal && (
                      <Badge variant="soft" color="indigo" size="1">
                        Goal: {entry.goal.title}
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
        ))}
    </Flex>
  );
}
