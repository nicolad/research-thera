"use client";

import { Select, Text, Flex } from "@radix-ui/themes";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} from "@/app/__generated__/hooks";

export function UserSettingsLanguageSelector() {
  const { data, loading } = useGetUserSettingsQuery();
  const [updateUserSettings, { loading: updating }] =
    useUpdateUserSettingsMutation({
      refetchQueries: ["GetUserSettings"],
    });

  const currentLanguage = data?.userSettings?.storyLanguage ?? "English";

  const handleChange = (lang: string) => {
    updateUserSettings({ variables: { storyLanguage: lang } });
  };

  return (
    <Flex align="center" gap="2">
      <Text size="2" color="gray" weight="medium">
        Story Language
      </Text>
      <Select.Root
        value={currentLanguage}
        onValueChange={handleChange}
        disabled={loading || updating}
        size="1"
      >
        <Select.Trigger />
        <Select.Content>
          <Select.Item value="Romanian">Romanian</Select.Item>
          <Select.Item value="English">English</Select.Item>
          <Select.Item value="French">French</Select.Item>
          <Select.Item value="German">German</Select.Item>
          <Select.Item value="Spanish">Spanish</Select.Item>
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}
