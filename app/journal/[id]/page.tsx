"use client";

import { useState, useEffect } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Spinner,
  TextField,
  TextArea,
  Select,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import {
  useGetJournalEntryQuery,
  useUpdateJournalEntryMutation,
  useDeleteJournalEntryMutation,
} from "@/app/__generated__/hooks";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

const MOOD_OPTIONS = [
  { value: "happy", label: "😊 Happy" },
  { value: "sad", label: "😢 Sad" },
  { value: "anxious", label: "😰 Anxious" },
  { value: "calm", label: "😌 Calm" },
  { value: "angry", label: "😠 Angry" },
  { value: "hopeful", label: "🌟 Hopeful" },
  { value: "neutral", label: "😐 Neutral" },
];

export default function JournalEntryPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { data, loading, error } = useGetJournalEntryQuery({
    variables: { id },
    skip: !id,
  });

  const [updateJournalEntry, { loading: saving }] =
    useUpdateJournalEntryMutation();
  const [deleteJournalEntry, { loading: deleting }] =
    useDeleteJournalEntryMutation({
      onCompleted: () => router.push("/journal"),
    });

  const entry = data?.journalEntry;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string>("");
  const [moodScore, setMoodScore] = useState<string>("");
  const [entryDate, setEntryDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");
      setContent(entry.content || "");
      setMood(entry.mood || "");
      setMoodScore(
        entry.moodScore !== null && entry.moodScore !== undefined
          ? String(entry.moodScore)
          : "",
      );
      setEntryDate(entry.entryDate || "");
      setIsPrivate(entry.isPrivate);
    }
  }, [entry]);

  const handleSave = async () => {
    if (!id) return;
    await updateJournalEntry({
      variables: {
        id,
        input: {
          title: title || null,
          content,
          mood: mood || null,
          moodScore: moodScore ? Number(moodScore) : null,
          entryDate,
          isPrivate,
        },
      },
    });
    setIsDirty(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this journal entry? This cannot be undone.")) return;
    await deleteJournalEntry({ variables: { id } });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" p="9">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex direction="column" align="center" p="9" gap="2">
        <Text color="red">Error loading journal entry</Text>
        <Text size="1" color="gray">
          {error.message}
        </Text>
        <Button variant="ghost" asChild>
          <NextLink href="/journal">
            <ArrowLeftIcon /> Back to Journal
          </NextLink>
        </Button>
      </Flex>
    );
  }

  if (!entry) {
    return (
      <Flex direction="column" align="center" p="9" gap="2">
        <Text>Journal entry not found</Text>
        <Button variant="ghost" asChild>
          <NextLink href="/journal">
            <ArrowLeftIcon /> Back to Journal
          </NextLink>
        </Button>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="6">
      <Breadcrumbs
        items={[
          { label: "Journal", href: "/journal" },
          { label: entry.title || "Untitled Entry" },
        ]}
      />

      <Flex justify="between" align="center">
        <Flex align="center" gap="3">
          <Button variant="ghost" size="2" asChild>
            <NextLink href="/journal">
              <ArrowLeftIcon /> Back
            </NextLink>
          </Button>
          <Heading size="6">{entry.title || "Untitled Entry"}</Heading>
          {entry.isPrivate && (
            <Badge variant="soft" color="gray" size="1">
              Private
            </Badge>
          )}
        </Flex>
        <Flex gap="2">
          {isDirty && (
            <Button onClick={handleSave} disabled={saving} size="2">
              {saving ? <Spinner size="2" /> : null}
              Save
            </Button>
          )}
          <Button
            variant="soft"
            color="red"
            size="2"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Spinner size="2" /> : <TrashIcon />}
            Delete
          </Button>
        </Flex>
      </Flex>

      <Card>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" color="gray">
              Title
            </Text>
            <TextField.Root
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Entry title (optional)"
              size="3"
            />
          </Flex>

          <Flex gap="4" wrap="wrap">
            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 160 }}>
              <Text size="2" weight="medium" color="gray">
                Entry Date
              </Text>
              <TextField.Root
                type="date"
                value={entryDate}
                onChange={(e) => {
                  setEntryDate(e.target.value);
                  setIsDirty(true);
                }}
                size="2"
              />
            </Flex>

            <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 160 }}>
              <Text size="2" weight="medium" color="gray">
                Mood
              </Text>
              <Select.Root
                value={mood}
                onValueChange={(val) => {
                  setMood(val);
                  setIsDirty(true);
                }}
              >
                <Select.Trigger placeholder="Select mood" />
                <Select.Content>
                  <Select.Item value="">No mood</Select.Item>
                  {MOOD_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>

            {mood && (
              <Flex
                direction="column"
                gap="2"
                style={{ flex: 1, minWidth: 120 }}
              >
                <Text size="2" weight="medium" color="gray">
                  Mood Score (1-10)
                </Text>
                <TextField.Root
                  type="number"
                  min="1"
                  max="10"
                  value={moodScore}
                  onChange={(e) => {
                    setMoodScore(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="1-10"
                  size="2"
                />
              </Flex>
            )}
          </Flex>

          <Separator size="4" />

          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" color="gray">
              Content
            </Text>
            <TextArea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Write your thoughts, reflections, or observations..."
              rows={12}
              size="3"
            />
          </Flex>

          {entry.goal && (
            <>
              <Separator size="4" />
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium" color="gray">
                  Related Goal
                </Text>
                <Badge variant="soft" color="indigo" size="2">
                  {entry.goal.title}
                </Badge>
                {entry.goal.description && (
                  <Text size="2" color="gray">
                    {entry.goal.description}
                  </Text>
                )}
              </Flex>
            </>
          )}

          {entry.familyMember && (
            <>
              <Separator size="4" />
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium" color="gray">
                  Family Member
                </Text>
                <Badge variant="soft" color="purple" size="2">
                  {entry.familyMember.firstName}
                  {entry.familyMember.name &&
                    entry.familyMember.name !== entry.familyMember.firstName &&
                    ` (${entry.familyMember.name})`}
                </Badge>
              </Flex>
            </>
          )}

          <Separator size="4" />

          <Flex justify="between" align="center">
            <Flex gap="4">
              <Text size="1" color="gray">
                Created:{" "}
                {new Date(entry.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
              {entry.updatedAt !== entry.createdAt && (
                <Text size="1" color="gray">
                  Updated:{" "}
                  {new Date(entry.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              )}
            </Flex>
            {isDirty && (
              <Button onClick={handleSave} disabled={saving} size="2">
                {saving ? <Spinner size="2" /> : null}
                Save Changes
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
