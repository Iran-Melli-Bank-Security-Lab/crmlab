import { Heading, SimpleGrid, Text, VStack, Wrap, WrapItem } from "@chakra-ui/react";
import { useAuth } from "@/features/auth/model/useAuth";
import { useLanguage } from "@/features/language/model";
import Card from "@/shared/ui/primitives/Card";
import Badge from "@/shared/ui/primitives/Badge";

export default function Profile() {
  const { t } = useLanguage();
  const { user, roles, permissions } = useAuth();

  return (
    <VStack align="stretch" gap={5}>
      <Heading>{t("profile.title")}</Heading>
      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={5}>
        <Card title={t("profile.userInfo")}>
          <VStack align="stretch" gap={3}>
            <Text>
              <strong>{t("profile.name")}:</strong> {user?.name}
            </Text>
            <Text>
              <strong>{t("common.username")}:</strong> {user?.username}
            </Text>
            <Wrap>
              {roles.map((role) => (
                <WrapItem key={role}>
                  <Badge>{role}</Badge>
                </WrapItem>
              ))}
            </Wrap>
          </VStack>
        </Card>
        <Card title={t("common.permissions")}>
          <Wrap>
            {permissions.map((permission) => (
              <WrapItem key={permission}>
                <Badge>{permission}</Badge>
              </WrapItem>
            ))}
          </Wrap>
        </Card>
      </SimpleGrid>
    </VStack>
  );
}
