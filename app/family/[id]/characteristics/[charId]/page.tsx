"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  TextField,
  TextArea,
  Select,
  Dialog,
  AlertDialog,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetFamilyMemberCharacteristicQuery,
  useUpdateFamilyMemberCharacteristicMutation,
  useDeleteFamilyMemberCharacteristicMutation,
  CharacteristicCategory,
} from "@/app/__generated__/hooks";

const CATEGORY_COLORS: Record<
  CharacteristicCategory,
  "gray" | "orange" | "red"
> = {
  [CharacteristicCategory.Trait]: "gray",
  [CharacteristicCategory.Issue]: "orange",
  [CharacteristicCategory.Problem]: "red",
};

const CATEGORY_OPTIONS = [
  { value: CharacteristicCategory.Trait, label: "Trait" },
  { value: CharacteristicCategory.Issue, label: "Issue" },
  { value: CharacteristicCategory.Problem, label: "Problem" },
];

function CharacteristicDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const charId = parseInt(params.charId as string, 10);

  const { data, loading, error } = useGetFamilyMemberCharacteristicQuery({
    variables: { id: charId },
    skip: isNaN(charId),
  });

  const characteristic = data?.familyMemberCharacteristic;

  // Edit form state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<CharacteristicCategory>(
    CharacteristicCategory.Trait,
  );
  const [editError, setEditError] = useState<string | null>(null);

  const [updateCharacteristic, { loading: updating }] =
    useUpdateFamilyMemberCharacteristicMutation({
      onCompleted: () => {
        setEditOpen(false);
        setEditError(null);
      },
      onError: (err) => setEditError(err.message),
      refetchQueries: ["GetFamilyMemberCharacteristic"],
    });

  const [deleteCharacteristic, { loading: deleting }] =
    useDeleteFamilyMemberCharacteristicMutation({
      onCompleted: () => {
        router.push(`/family/${id}`);
      },
    });

  function openEditDialog() {
    if (!characteristic) return;
    setEditTitle(characteristic.title);
    setEditDescription(characteristic.description ?? "");
    setEditCategory(characteristic.category);
    setEditError(null);
    setEditOpen(true);
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title is required");
      return;
    }
    await updateCharacteristic({
      variables: {
        id: charId,
        input: {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          category: editCategory,
        },
      },
    });
  };

  const handleDelete = () => {
    deleteCharacteristic({ variables: { id: charId } });
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !characteristic) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Characteristic not found"}
        </Text>
      </Card>
    );
  }

  const categoryLabel =
    characteristic.category.charAt(0) +
    characteristic.category.slice(1).toLowerCase();

  return (
    <Flex direction="column" gap="5">
      {/* Details */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Details</Heading>
            <Flex gap="2">
              <Button variant="soft" size="2" onClick={openEditDialog}>
                <Pencil1Icon />
                Edit
              </Button>
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button variant="soft" color="red" size="2" disabled={deleting}>
                    <TrashIcon />
                    Delete
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Title>Delete Characteristic</AlertDialog.Title>
                  <AlertDialog.Description>
                    Remove &quot;{characteristic.title}&quot;? This action cannot
                    be undone.
                  </AlertDialog.Description>
                  <Flex gap="3" justify="end" mt="4">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button
                        color="red"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        Delete
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          </Flex>
          <Separator size="4" />
          <Flex direction="column" gap="2">
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Category
              </Text>
              <Badge
                color={CATEGORY_COLORS[characteristic.category]}
                variant="soft"
                size="1"
              >
                {categoryLabel}
              </Badge>
            </Flex>
            {characteristic.description && (
              <Flex gap="2">
                <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                  Description
                </Text>
                <Text size="2" color="gray">
                  {characteristic.description}
                </Text>
              </Flex>
            )}
            <Flex gap="2">
              <Text size="2" weight="medium" style={{ minWidth: 100 }}>
                Created
              </Text>
              <Text size="2" color="gray">
                {new Date(characteristic.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Edit Characteristic</Dialog.Title>
          <form onSubmit={handleUpdate}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Title *
                </Text>
                <TextField.Root
                  placeholder="Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Description
                </Text>
                <TextArea
                  placeholder="Description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  disabled={updating}
                />
              </label>
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Category
                </Text>
                <Select.Root
                  value={editCategory}
                  onValueChange={(v) =>
                    setEditCategory(v as CharacteristicCategory)
                  }
                  disabled={updating}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <Select.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              {editError && (
                <Text color="red" size="2">
                  {editError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={updating}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

const DynamicCharacteristicDetailContent = dynamic(
  () => Promise.resolve(CharacteristicDetailContent),
  { ssr: false },
);

export default function CharacteristicDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const charId = parseInt(params.charId as string, 10);

  const { data } = useGetFamilyMemberCharacteristicQuery({
    variables: { id: charId },
    skip: isNaN(charId),
  });

  const characteristic = data?.familyMemberCharacteristic;

  const categoryLabel = characteristic
    ? characteristic.category.charAt(0) +
      characteristic.category.slice(1).toLowerCase()
    : "";

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
            <NextLink href={`/family/${id}`}>
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Back
              </Text>
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {characteristic?.title ?? "Characteristic"}
            </Heading>
          </Box>

          {characteristic && (
            <Badge
              color={CATEGORY_COLORS[characteristic.category]}
              variant="soft"
              size="2"
            >
              {categoryLabel}
            </Badge>
          )}
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicCharacteristicDetailContent />
      </Box>
    </Flex>
  );
}
