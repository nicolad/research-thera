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
  Box,
  Separator,
  Dialog,
  TextArea,
  TextField,
  Select,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  Pencil1Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  useGetJournalEntryQuery,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
} from "@/app/__generated__/hooks";

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

function JournalEntryContent() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string, 10);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMood, setEditMood] = useState("");
  const [editMoodScore, setEditMoodScore] = useState("");
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editTags, setEditTags] = useState("");

  const { data, loading, error } = useGetJournalEntryQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const [updateEntry, { loading: updating }] = useUpdateJournalEntryMutation({
    refetchQueries: ["GetJournalEntry"],
    onCompleted: () => setEditOpen(false),
  });

  const [deleteEntry, { loading: deleting }] = useDeleteJournalEntryMutation({
    onCompleted: () => router.push("/journal"),
  });

  const entry = data?.journalEntry;

  function openEditDialog() {
    if (!entry) return;
    setEditTitle(entry.title || "");
    setEditContent(entry.content);
    setEditMood(entry.mood || "");
    setEditMoodScore(entry.moodScore ? String(entry.moodScore) : "");
    setEditEntryDate(entry.entryDate);
    setEditTags(entry.tags?.join(", ") || "");
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editContent.trim()) return;

    await updateEntry({
      variables: {
        id,
        input: {
          title: editTitle.trim() || null,
          content: editContent.trim(),
          mood: editMood || null,
          moodScore: editMoodScore ? parseInt(editMoodScore, 10) : null,
          entryDate: editEntryDate,
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      },
    });
  }

  async function handleDelete() {
    await deleteEntry({ variables: { id } });
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !entry) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Journal entry not found"}
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-5))",
          marginRight: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--space-5)",
          paddingRight: "var(--space-5)",
        }}
      >
        <Flex
          py="4"
          align="center"
          gap="4"
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <Link href="/journal">
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Journal
              </Text>
            </Link>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Flex gap="2" align="center">
              {entry.mood && (
                <Text size="6">{getMoodEmoji(entry.mood)}</Text>
              )}
              <Heading size="7" weight="bold" truncate>
                {entry.title || "Journal Entry"}
              </Heading>
            </Flex>
          </Box>

          <Flex gap="2">
            <Button
              variant="soft"
              size="2"
              color="gray"
              onClick={openEditDialog}
            >
              <Pencil1Icon />
              Edit
            </Button>
            <Dialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
              <Dialog.Trigger>
                <Button variant="soft" size="2" color="red">
                  <TrashIcon />
                  Delete
                </Button>
              </Dialog.Trigger>
              <Dialog.Content maxWidth="400px">
                <Dialog.Title>Delete Journal Entry</Dialog.Title>
                <Dialog.Description size="2" color="gray" mb="4">
                  Are you sure you want to delete this journal entry? This
                  action cannot be undone.
                </Dialog.Description>
                <Flex gap="3" justify="end">
                  <Dialog.Close>
                    <Button variant="soft" color="gray">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button
                    color="red"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </Flex>
              </Dialog.Content>
            </Dialog.Root>
          </Flex>
        </Flex>
      </Box>

      {/* Entry Content */}
      <Box style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <Flex direction="column" gap="4">
          {/* Meta info */}
          <Flex gap="3" align="center" wrap="wrap">
            <Text size="2" color="gray">
              {new Date(entry.entryDate + "T00:00:00").toLocaleDateString(
                "en-GB",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </Text>
            {entry.mood && (
              <Badge
                variant="soft"
                color={getMoodColor(entry.mood)}
              >
                {getMoodEmoji(entry.mood)} {entry.mood}
              </Badge>
            )}
            {entry.moodScore && (
              <Badge variant="outline">Mood: {entry.moodScore}/10</Badge>
            )}
          </Flex>

          {/* Main content */}
          <Card>
            <Text
              size="3"
              style={{
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {entry.content}
            </Text>
          </Card>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <Flex gap="2" wrap="wrap">
              {entry.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline" size="2">
                  {tag}
                </Badge>
              ))}
            </Flex>
          )}

          {/* Linked Goal */}
          {entry.goal && (
            <Card>
              <Flex direction="column" gap="2">
                <Badge color="indigo" size="1" style={{ alignSelf: "start" }}>
                  Linked Goal
                </Badge>
                <Heading size="3">{entry.goal.title}</Heading>
                {entry.goal.description && (
                  <Text size="2" color="gray">
                    {entry.goal.description}
                  </Text>
                )}
              </Flex>
            </Card>
          )}

          {/* Linked Family Member */}
          {entry.familyMember && (
            <Card>
              <Flex direction="column" gap="1">
                <Badge
                  color="purple"
                  size="1"
                  style={{ alignSelf: "start" }}
                >
                  Family Member
                </Badge>
                <Text size="3" weight="medium">
                  {entry.familyMember.firstName}
                  {entry.familyMember.name
                    ? ` ${entry.familyMember.name}`
                    : ""}
                </Text>
              </Flex>
            </Card>
          )}

          {/* Timestamps */}
          <Flex gap="4">
            <Text size="1" color="gray">
              Created:{" "}
              {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {entry.updatedAt !== entry.createdAt && (
              <Text size="1" color="gray">
                Updated:{" "}
                {new Date(entry.updatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>Edit Journal Entry</Dialog.Title>

          <Flex direction="column" gap="4" mt="4">
            <label>
              <Text size="2" weight="medium" mb="1" as="p">
                Date
              </Text>
              <TextField.Root
                type="date"
                value={editEntryDate}
                onChange={(e) => setEditEntryDate(e.target.value)}
              />
            </label>

            <label>
              <Text size="2" weight="medium" mb="1" as="p">
                Title
              </Text>
              <TextField.Root
                placeholder="Give this entry a title..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </label>

            <label>
              <Text size="2" weight="medium" mb="1" as="p">
                Mood
              </Text>
              <Select.Root value={editMood} onValueChange={setEditMood}>
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
                value={editMoodScore}
                onChange={(e) => setEditMoodScore(e.target.value)}
              />
            </label>

            <label>
              <Text size="2" weight="medium" mb="1" as="p">
                Content
              </Text>
              <TextArea
                placeholder="Write your thoughts..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
              />
            </label>

            <label>
              <Text size="2" weight="medium" mb="1" as="p">
                Tags (comma-separated)
              </Text>
              <TextField.Root
                placeholder="e.g. therapy, mindfulness, progress"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
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
              onClick={handleUpdate}
              disabled={!editContent.trim() || updating}
            >
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

const DynamicJournalEntryContent = dynamic(
  () => Promise.resolve(JournalEntryContent),
  { ssr: false },
);

export default function JournalEntryPage() {
  return <DynamicJournalEntryContent />;
}
