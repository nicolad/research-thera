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
  IconButton,
  Callout,
} from "@radix-ui/themes";
import { ArrowLeftIcon, Pencil1Icon, TrashIcon, PlusIcon, Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetFamilyMemberCharacteristicQuery,
  useUpdateFamilyMemberCharacteristicMutation,
  useDeleteFamilyMemberCharacteristicMutation,
  useGetRelationshipsQuery,
  useCreateRelationshipMutation,
  useDeleteRelationshipMutation,
  useGetFamilyMembersQuery,
  useGetContactsQuery,
  useCreateContactMutation,
  useGetGoalsQuery,
  useGenerateLongFormTextMutation,
  CharacteristicCategory,
  PersonType,
  RelationshipStatus,
} from "@/app/__generated__/hooks";
import AddGoalButton from "@/app/components/AddGoalButton";

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

const RELATIONSHIP_TYPE_OPTIONS = [
  "parent",
  "child",
  "sibling",
  "spouse",
  "partner",
  "friend",
  "teacher",
  "therapist",
  "peer",
  "classmate",
  "bully",
  "victim",
  "witness",
  "other",
];

const BULLYING_KEYWORDS = [
  "bully", "bullying", "intimidat", "harass", "victim", "agres",
  "violenta", "violență", "intimidare", "hărțuire", "batjocur",
  "persecutat", "abuz", "abuse", "taunt", "mock",
];

function isBullyingRelated(title: string, description?: string | null): boolean {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return BULLYING_KEYWORDS.some((kw) => text.includes(kw));
}

function RelationshipsSection({
  familyMemberId,
  quickAddType,
}: {
  familyMemberId: number;
  quickAddType?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [relatedType, setRelatedType] = useState<PersonType>(PersonType.FamilyMember);
  const [relatedId, setRelatedId] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState("friend");
  const [addError, setAddError] = useState<string | null>(null);

  // Inline contact creation state
  const [creatingNewContact, setCreatingNewContact] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRole, setNewRole] = useState("");

  const { data: relsData, loading: relsLoading } = useGetRelationshipsQuery({
    variables: { subjectType: PersonType.FamilyMember, subjectId: familyMemberId },
  });

  const { data: fmData } = useGetFamilyMembersQuery();
  const { data: contactsData } = useGetContactsQuery();

  function openQuickAdd(type: string) {
    setRelationshipType(type);
    setRelatedType(PersonType.Contact);
    setRelatedId("");
    setCreatingNewContact(false);
    setAddError(null);
    setAddOpen(true);
  }

  const [createRelationship, { loading: creating }] = useCreateRelationshipMutation({
    onCompleted: () => {
      setAddOpen(false);
      setRelatedId("");
      setRelationshipType("friend");
      setAddError(null);
      setCreatingNewContact(false);
      setNewFirstName("");
      setNewLastName("");
      setNewRole("");
    },
    onError: (err) => setAddError(err.message),
    refetchQueries: ["GetRelationships"],
  });

  const [createContact, { loading: creatingContact }] = useCreateContactMutation({
    onError: (err) => setAddError(err.message),
    refetchQueries: ["GetContacts"],
  });

  const [deleteRelationship] = useDeleteRelationshipMutation({
    refetchQueries: ["GetRelationships"],
  });

  const relationships = relsData?.relationships ?? [];

  const personOptions =
    relatedType === PersonType.FamilyMember
      ? (fmData?.familyMembers ?? [])
          .filter((fm) => fm.id !== familyMemberId)
          .map((fm) => ({
            value: String(fm.id),
            label: [fm.firstName, fm.name].filter(Boolean).join(" "),
          }))
      : (contactsData?.contacts ?? []).map((c) => ({
          value: String(c.id),
          label: [c.firstName, c.lastName].filter(Boolean).join(" "),
        }));

  function getPersonLabel(type: PersonType, id: number) {
    if (type === PersonType.FamilyMember) {
      const fm = fmData?.familyMembers?.find((f) => f.id === id);
      return fm ? [fm.firstName, fm.name].filter(Boolean).join(" ") : `#${id}`;
    }
    const c = contactsData?.contacts?.find((x) => x.id === id);
    return c ? [c.firstName, c.lastName].filter(Boolean).join(" ") : `#${id}`;
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (creatingNewContact) {
      if (!newFirstName.trim()) {
        setAddError("First name is required");
        return;
      }
      setAddError(null);
      const contactResult = await createContact({
        variables: {
          input: {
            firstName: newFirstName.trim(),
            lastName: newLastName.trim() || undefined,
            role: newRole.trim() || undefined,
          },
        },
      });
      const newContactId = contactResult.data?.createContact?.id;
      if (!newContactId) return;
      await createRelationship({
        variables: {
          input: {
            subjectType: PersonType.FamilyMember,
            subjectId: familyMemberId,
            relatedType: PersonType.Contact,
            relatedId: newContactId,
            relationshipType,
            status: RelationshipStatus.Active,
          },
        },
      });
      return;
    }

    if (!relatedId) {
      setAddError("Please select a person");
      return;
    }
    await createRelationship({
      variables: {
        input: {
          subjectType: PersonType.FamilyMember,
          subjectId: familyMemberId,
          relatedType,
          relatedId: parseInt(relatedId, 10),
          relationshipType,
          status: RelationshipStatus.Active,
        },
      },
    });
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center">
          <Heading size="4">Relationships</Heading>
          <Flex gap="2">
            <Button variant="soft" size="2" onClick={() => setAddOpen(true)}>
              <PlusIcon />
              Add
            </Button>
            {quickAddType && (
              <Button
                variant="solid"
                color="red"
                size="2"
                onClick={() => openQuickAdd(quickAddType)}
              >
                <PlusIcon />
                Link {quickAddType.charAt(0).toUpperCase() + quickAddType.slice(1)}
              </Button>
            )}
          </Flex>
        </Flex>
        <Separator size="4" />

        {relsLoading ? (
          <Spinner size="2" />
        ) : relationships.length === 0 ? (
          <Text size="2" color="gray">
            No relationships yet.
          </Text>
        ) : (
          <Flex direction="column" gap="2">
            {relationships.map((rel) => {
              const otherType =
                rel.relatedType === PersonType.FamilyMember ? "FM" : "Contact";
              const otherLabel = getPersonLabel(rel.relatedType, rel.relatedId);
              return (
                <Flex key={rel.id} align="center" gap="2" justify="between">
                  <Flex align="center" gap="2">
                    <Badge variant="soft" color="indigo" size="1">
                      {rel.relationshipType}
                    </Badge>
                    <Text size="2">{otherLabel}</Text>
                    <Text size="1" color="gray">
                      ({otherType})
                    </Text>
                  </Flex>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <IconButton variant="ghost" color="red" size="1">
                        <Cross2Icon />
                      </IconButton>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Title>Remove Relationship</AlertDialog.Title>
                      <AlertDialog.Description>
                        Remove the &quot;{rel.relationshipType}&quot; relationship with{" "}
                        {otherLabel}?
                      </AlertDialog.Description>
                      <Flex gap="3" justify="end" mt="4">
                        <AlertDialog.Cancel>
                          <Button variant="soft" color="gray">Cancel</Button>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action>
                          <Button
                            color="red"
                            onClick={() => deleteRelationship({ variables: { id: rel.id } })}
                          >
                            Remove
                          </Button>
                        </AlertDialog.Action>
                      </Flex>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Flex>

      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Content style={{ maxWidth: 460 }}>
          <Dialog.Title>Add Relationship</Dialog.Title>
          <form onSubmit={handleAdd}>
            <Flex direction="column" gap="3">
              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Person type
                </Text>
                <Select.Root
                  value={relatedType}
                  onValueChange={(v) => {
                    setRelatedType(v as PersonType);
                    setRelatedId("");
                    setCreatingNewContact(false);
                    setNewFirstName("");
                    setNewLastName("");
                    setNewRole("");
                  }}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={PersonType.FamilyMember}>Family Member</Select.Item>
                    <Select.Item value={PersonType.Contact}>Contact</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>

              {creatingNewContact && relatedType === PersonType.Contact ? (
                <Flex direction="column" gap="2">
                  <Flex justify="between" align="center">
                    <Text size="2" weight="medium">New contact</Text>
                    <Button
                      variant="ghost"
                      size="1"
                      onClick={() => {
                        setCreatingNewContact(false);
                        setNewFirstName("");
                        setNewLastName("");
                        setNewRole("");
                        setAddError(null);
                      }}
                    >
                      &larr; Back to existing contacts
                    </Button>
                  </Flex>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">First name *</Text>
                    <TextField.Root
                      placeholder="First name"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">Last name</Text>
                    <TextField.Root
                      placeholder="Last name"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                    />
                  </label>
                  <label>
                    <Text as="div" size="1" mb="1" color="gray">Role</Text>
                    <TextField.Root
                      placeholder="e.g. classmate, teacher"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    />
                  </label>
                </Flex>
              ) : (
                <Flex direction="column" gap="2">
                  <label>
                    <Text as="div" size="2" mb="1" weight="medium">
                      Person
                    </Text>
                    <Select.Root value={relatedId} onValueChange={setRelatedId}>
                      <Select.Trigger
                        placeholder="Select a person…"
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        {personOptions.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </label>
                  {relatedType === PersonType.Contact && (
                    <Button
                      variant="ghost"
                      size="1"
                      style={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        setCreatingNewContact(true);
                        setRelatedId("");
                        setAddError(null);
                      }}
                    >
                      + Create new contact
                    </Button>
                  )}
                </Flex>
              )}

              <label>
                <Text as="div" size="2" mb="1" weight="medium">
                  Relationship type
                </Text>
                <Select.Root value={relationshipType} onValueChange={setRelationshipType}>
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    {RELATIONSHIP_TYPE_OPTIONS.map((t) => (
                      <Select.Item key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>

              {addError && (
                <Text color="red" size="2">
                  {addError}
                </Text>
              )}

              <Flex gap="3" justify="end" mt="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray" disabled={creating || creatingContact}>
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={creating || creatingContact}>
                  {creating || creatingContact ? "Saving…" : "Add Relationship"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
}

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

  const { data: goalsData } = useGetGoalsQuery({
    variables: { familyMemberId: parseInt(id, 10) },
    skip: isNaN(parseInt(id, 10)),
  });
  const goals = goalsData?.goals ?? [];

  const [generatingGoalId, setGeneratingGoalId] = useState<number | null>(null);
  const [generateLongFormText] = useGenerateLongFormTextMutation();

  const handleGenerateStory = async (goalId: number) => {
    setGeneratingGoalId(goalId);
    try {
      await generateLongFormText({
        variables: { goalId, characteristicId: charId },
      });
      router.push(`/goals/${goalId}`);
    } finally {
      setGeneratingGoalId(null);
    }
  };

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

  const isBullying = isBullyingRelated(
    characteristic.title,
    characteristic.description,
  );

  return (
    <Flex direction="column" gap="5">
      {/* Bullying context banner */}
      {isBullying && (
        <Callout.Root color="red" variant="surface">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            This characteristic is linked to bullying. Use{" "}
            <strong>Link Bully</strong> in Relationships below to connect the
            person(s) involved.
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Details */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Heading size="4">Details</Heading>
            <Flex gap="2">
              <AddGoalButton
                presetFamilyMemberId={parseInt(id, 10)}
                presetTitle={characteristic.title}
                presetDescription={characteristic.description ?? undefined}
                refetchQueries={["GetFamilyMember"]}
                size="2"
              />
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

      {/* Relationships */}
      <RelationshipsSection
        familyMemberId={parseInt(id, 10)}
        quickAddType={isBullying ? "bully" : undefined}
      />

      {/* Generate Story */}
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Heading size="4">Generate Story</Heading>
              <Text size="1" color="gray">
                Create a therapeutic story focused on this characteristic
              </Text>
            </Flex>
          </Flex>
          <Separator size="4" />
          {goals.length === 0 ? (
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                No goals yet. Create a goal first to generate a story.
              </Text>
              <AddGoalButton
                presetFamilyMemberId={parseInt(id, 10)}
                presetTitle={characteristic.title}
                presetDescription={characteristic.description ?? undefined}
                refetchQueries={["GetGoals", "GetFamilyMember"]}
                size="2"
              />
            </Flex>
          ) : (
            <Flex direction="column" gap="2">
              {goals.map((goal) => (
                <Flex key={goal.id} align="center" justify="between" gap="2">
                  <Text size="2" style={{ flex: 1, minWidth: 0 }} truncate>
                    {goal.title}
                  </Text>
                  <Button
                    size="2"
                    variant="soft"
                    disabled={generatingGoalId !== null}
                    loading={generatingGoalId === goal.id}
                    onClick={() => handleGenerateStory(goal.id)}
                  >
                    Generate
                  </Button>
                </Flex>
              ))}
            </Flex>
          )}
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
