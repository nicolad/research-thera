"use client";

import {
  Flex,
  Card,
  Badge,
  Button,
  Text,
  AlertDialog,
} from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { CharacteristicCategory } from "@/app/__generated__/hooks";

export { CharacteristicCategory };

export interface Characteristic {
  id: number;
  category: CharacteristicCategory;
  title: string;
  description?: string | null;
  createdAt: string;
}

interface CharacteristicsListProps {
  items: Characteristic[];
  onDelete: (id: number) => void;
  deleting?: boolean;
  emptyMessage?: string;
}

const CATEGORY_COLORS: Record<
  CharacteristicCategory,
  "gray" | "orange" | "red"
> = {
  [CharacteristicCategory.Trait]: "gray",
  [CharacteristicCategory.Issue]: "orange",
  [CharacteristicCategory.Problem]: "red",
};

export default function CharacteristicsList({
  items,
  onDelete,
  deleting = false,
  emptyMessage = "None added yet",
}: CharacteristicsListProps) {
  if (items.length === 0) {
    return (
      <Text size="2" color="gray">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="2">
      {items.map((item) => (
        <Card key={item.id}>
          <Flex justify="between" align="start" p="3" gap="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Flex gap="2" align="center">
                <Badge
                  color={CATEGORY_COLORS[item.category]}
                  variant="soft"
                  size="1"
                >
                  {item.category.charAt(0) +
                    item.category.slice(1).toLowerCase()}
                </Badge>
                <Text size="2" weight="medium">
                  {item.title}
                </Text>
              </Flex>
              {item.description && (
                <Text size="1" color="gray">
                  {item.description}
                </Text>
              )}
            </Flex>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  variant="ghost"
                  color="red"
                  size="1"
                  disabled={deleting}
                  style={{ flexShrink: 0 }}
                >
                  <TrashIcon />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content>
                <AlertDialog.Title>Delete</AlertDialog.Title>
                <AlertDialog.Description>
                  Remove &quot;{item.title}&quot;? This action cannot be undone.
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
                      onClick={() => onDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}
