import { Badge, Box, HStack, IconButton, SimpleGrid, Skeleton, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/features/auth/model/useAuth";
import { useLanguage } from "@/features/language/model";
import Button from "@/shared/ui/primitives/Button";
import {
  useGetDevopsWorkspaceQuery,
  type DevopsAccessEndpoint,
} from "../api/devopsApi";

type IconProps = { width?: string | number; height?: string | number };

function InfrastructureIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}><rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h.01M8 17.5h.01M12 10v4"/></svg>;
}

function CopyIcon(props: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>;
}

function EyeIcon({ hidden, ...props }: IconProps & { hidden?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{hidden && <path d="m4 4 16 16"/>}</svg>;
}

type DetailProps = {
  label: string;
  value?: string | number;
  copyable?: boolean;
  secret?: boolean;
  secretId?: string;
  revealed: Set<string>;
  onToggleSecret: (id: string) => void;
};

function Detail({ label, value, copyable, secret, secretId = label, revealed, onToggleSecret }: DetailProps) {
  const { t } = useLanguage();
  if (value === undefined || value === "") return null;
  const plainValue = String(value);
  const isRevealed = !secret || revealed.has(secretId);
  const copy = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(plainValue);
      toast.success(t("devopsAccess.copied", { field: label }));
    } catch {
      // Clipboard failures stay local and never include the credential in diagnostics.
    }
  };
  return <Box minW={0} p={3} borderRadius="md" bg="var(--apple-surface-subtle)">
    <Text fontSize="xs" color="var(--apple-muted)" fontWeight="700">{label}</Text>
    <HStack mt={1} gap={1} minW={0}>
      <Text dir="ltr" textAlign="start" fontSize="sm" fontWeight="750" truncate flex="1" fontFamily={secret ? "monospace" : undefined}>
        {isRevealed ? plainValue : "••••••••••••"}
      </Text>
      {secret && <IconButton size="xs" variant="ghost" color="var(--apple-muted)" _hover={{ color: "var(--apple-blue)", bg: "var(--apple-blue-soft)" }} aria-label={t(isRevealed ? "devopsAccess.hidePassword" : "devopsAccess.showPassword")} onClick={() => onToggleSecret(secretId)}><EyeIcon hidden={isRevealed} width="16" height="16" /></IconButton>}
      {copyable && <IconButton size="xs" variant="ghost" color="var(--apple-muted)" _hover={{ color: "var(--apple-blue)", bg: "var(--apple-blue-soft)" }} aria-label={t("devopsAccess.copy", { field: label })} onClick={() => void copy()}><CopyIcon width="16" height="16" /></IconButton>}
    </HStack>
  </Box>;
}

function EndpointDetails({ endpoint, endpointIndex, revealed, onToggleSecret }: { endpoint: DevopsAccessEndpoint; endpointIndex: number; revealed: Set<string>; onToggleSecret: (id: string) => void }) {
  const { t } = useLanguage();
  return <Box border="1px solid" borderColor="var(--apple-border)" borderRadius="md" p={3}>
    <Text fontSize="sm" fontWeight="800">{endpoint.description || `${t("devopsAccess.endpoint")} ${endpointIndex + 1}`}</Text>
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={2} mt={2}>
      <Detail label={t("devopsAccess.url")} value={endpoint.url} copyable revealed={revealed} onToggleSecret={onToggleSecret} />
      <Detail label={t("devopsAccess.ip")} value={endpoint.ipAddress} copyable revealed={revealed} onToggleSecret={onToggleSecret} />
      <Detail label={t("devopsAccess.port")} value={endpoint.port} revealed={revealed} onToggleSecret={onToggleSecret} />
    </SimpleGrid>
    {endpoint.authenticationAccounts.map((account, accountIndex) => {
      const passwordId = `${endpoint.id}:${accountIndex}`;
      return <Box key={passwordId} mt={2}>
        <Text fontSize="xs" fontWeight="800" color="var(--apple-muted)">{t("devopsAccess.authentication")}</Text>
        <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2} mt={1}>
          <Detail label={t("devopsAccess.username")} value={account.username} copyable revealed={revealed} onToggleSecret={onToggleSecret} />
          <Detail label={t("devopsAccess.password")} value={account.password} copyable secret secretId={passwordId} revealed={revealed} onToggleSecret={onToggleSecret} />
        </SimpleGrid>
        {account.otp?.instructions && <Text mt={2} fontSize="sm" color="var(--apple-muted)">{account.otp.instructions}</Text>}
      </Box>;
    })}
  </Box>;
}

function DevopsAccessCardContent({ projectId, userId }: { projectId: string; userId: string }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const { currentData: data, error, isLoading, isFetching, refetch } = useGetDevopsWorkspaceQuery(
    { projectId, userId },
    { skip: !projectId || !userId }
  );

  if (isLoading || (!data && isFetching)) {
    return <Skeleton height="86px" borderRadius="lg" />;
  }

  if (error) {
    return <HStack justify="space-between" gap={3} border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" p={3} bg="var(--apple-surface)">
      <Text fontSize="sm" color="var(--apple-muted)">{t("devopsAccess.error")}</Text>
      <Button variant="secondary" onClick={() => void refetch()}>{t("devopsAccess.retry")}</Button>
    </HStack>;
  }

  const access = data?.access;
  const modeLabel = access?.mode === "personal" ? t("devopsAccess.personal") : t("devopsAccess.shared");
  const primaryEndpoint = access?.endpoints[0];
  const primaryAddress = access?.mode === "personal" && access.assignmentState === "available"
    ? access.vmIpAddress
    : primaryEndpoint?.url || primaryEndpoint?.ipAddress;
  const displayName = access?.mode === "personal" && access.assignmentState === "available"
    ? access.vmIpAddress
    : primaryEndpoint?.description || primaryAddress;
  const available = access?.assignmentState === "available";
  const toggleSecret = (id: string) => setRevealed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (!data?.info || !access) {
    return <HStack gap={3} border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" px={4} py={3} bg="var(--apple-surface)">
      <Box color="var(--apple-muted)" flexShrink={0}><InfrastructureIcon width="22" height="22" /></Box>
      <Box minW={0}><Text fontWeight="800" fontSize="sm">{t("devopsAccess.title")}</Text><Text fontSize="sm" color="var(--apple-muted)">{t("devopsAccess.noConfig")}</Text></Box>
    </HStack>;
  }

  return <Box border="1px solid" borderColor="var(--apple-border)" borderRadius="lg" bg="var(--apple-surface)" boxShadow="0 1px 3px rgba(0,0,0,.04)" overflow="hidden">
    <HStack gap={3} px={{ base: 3, md: 4 }} py={3} align="center">
      <Box p={2} borderRadius="md" bg="var(--apple-blue-soft)" color="var(--apple-blue)" flexShrink={0}><InfrastructureIcon width="22" height="22" /></Box>
      <Box minW={0} flex="1">
        <HStack gap={2} flexWrap="wrap">
          <Text fontWeight="850" fontSize="sm">{t("devopsAccess.title")}</Text>
          <Badge size="sm" colorPalette={access.mode === "shared" ? "blue" : "purple"}>{modeLabel}</Badge>
          <Badge size="sm" colorPalette={available ? "green" : "orange"}>{t(available ? "devopsAccess.available" : "devopsAccess.unassigned")}</Badge>
        </HStack>
        <HStack mt={0.5} gap={2} minW={0} color="var(--apple-muted)" fontSize="sm">
          {displayName && <Text truncate fontWeight="700">{displayName}</Text>}
          {displayName && primaryAddress && displayName !== primaryAddress && <Text aria-hidden="true">·</Text>}
          {primaryAddress && displayName !== primaryAddress && <Text dir="ltr" truncate>{primaryAddress}</Text>}
          {!available && <Text>{t("devopsAccess.personalMissing")}</Text>}
        </HStack>
      </Box>
      {available && <Button variant="ghost" flexShrink={0} onClick={() => { setExpanded((value) => !value); if (expanded) setRevealed(new Set()); }} aria-expanded={expanded}>{t(expanded ? "devopsAccess.collapse" : "devopsAccess.expand")}</Button>}
    </HStack>

    {expanded && available && <VStack align="stretch" gap={3} borderTop="1px solid" borderColor="var(--apple-border)" p={{ base: 3, md: 4 }}>
      {access.mode === "personal" && <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={2}>
        <Detail label={t("devopsAccess.ip")} value={access.vmIpAddress} copyable revealed={revealed} onToggleSecret={toggleSecret} />
        <Detail label={t("devopsAccess.port")} value={access.vmPort} revealed={revealed} onToggleSecret={toggleSecret} />
        <Detail label={t("devopsAccess.username")} value={access.username} copyable revealed={revealed} onToggleSecret={toggleSecret} />
        <Detail label={t("devopsAccess.password")} value={access.password} copyable secret secretId="personal-password" revealed={revealed} onToggleSecret={toggleSecret} />
        <Detail label={t("devopsAccess.server")} value={access.serverIpAddress} copyable revealed={revealed} onToggleSecret={toggleSecret} />
        <Detail label={t("devopsAccess.port")} value={access.serverPort} revealed={revealed} onToggleSecret={toggleSecret} />
      </SimpleGrid>}
      {access.endpoints.map((endpoint, index) => <EndpointDetails key={endpoint.id} endpoint={endpoint} endpointIndex={index} revealed={revealed} onToggleSecret={toggleSecret} />)}
      {access.endpoints.length === 0 && access.mode === "shared" && <Text fontSize="sm" color="var(--apple-muted)">{t("devopsAccess.noDetails")}</Text>}
    </VStack>}
  </Box>;
}

export default function DevopsAccessCard({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const userId = user?.id || "";
  // Remounting clears expanded and revealed-secret state before another project/user can render.
  return <DevopsAccessCardContent key={`${projectId}:${userId}`} projectId={projectId} userId={userId} />;
}
